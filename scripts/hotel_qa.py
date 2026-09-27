#!/usr/bin/env python3
"""Summarize two hotel-booking quality checks and optionally write a local review queue.

Usage:
    python scripts/hotel_qa.py input.csv output.json [--review-csv private-review.csv]

The JSON contains aggregate counts only. An optional review CSV contains flagged
source identifiers for local processing; keep it private and out of the website.
"""

from __future__ import annotations

import argparse
import csv
from datetime import date
import json
from pathlib import Path
import sys


REQUIRED_COLUMNS = (
    "arrival_year",
    "arrival_month",
    "arrival_date",
    "no_of_weekend_nights",
    "no_of_week_nights",
)


def valid_date(row: dict[str, str]) -> bool:
    try:
        date(
            int(row["arrival_year"]),
            int(row["arrival_month"]),
            int(row["arrival_date"]),
        )
    except (TypeError, ValueError, OverflowError):
        return False
    return True


def nights_result(row: dict[str, str]) -> str:
    """Return 'valid', 'zero', or 'invalid' for the two night-count fields."""
    try:
        weekend = int(row["no_of_weekend_nights"])
        weekday = int(row["no_of_week_nights"])
    except (TypeError, ValueError):
        return "invalid"
    if weekend < 0 or weekday < 0:
        return "invalid"
    return "zero" if weekend + weekday == 0 else "valid"


def review_reasons(row: dict[str, str]) -> list[str]:
    reasons = []
    if not valid_date(row):
        reasons.append("Invalid arrival date")
    nights = nights_result(row)
    if nights == "zero":
        reasons.append("Zero-night stay")
    elif nights == "invalid":
        reasons.append("Invalid night count")
    return reasons


def spreadsheet_safe(value: str) -> str:
    """Keep untrusted text from becoming a spreadsheet formula on CSV open."""
    text = str(value or "")
    return "'" + text if text.lstrip("\ufeff \t\r\n").startswith(("=", "+", "-", "@")) else text


def write_review_queue(input_csv: Path, output_csv: Path) -> int:
    """Write flagged rows with minimal source fields; this output stays local."""
    headers = [
        "source_line", "booking_id", "arrival_year", "arrival_month", "arrival_date",
        "weekend_nights", "weekday_nights", "review_reason",
    ]
    written = 0
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with input_csv.open("r", encoding="utf-8-sig", newline="") as source, output_csv.open(
        "w", encoding="utf-8", newline=""
    ) as destination:
        reader = csv.DictReader(source)
        if not reader.fieldnames or any(name not in reader.fieldnames for name in REQUIRED_COLUMNS):
            raise ValueError("Source columns changed before review export")
        writer = csv.writer(destination)
        writer.writerow(headers)
        for line, row in enumerate(reader, start=2):
            reasons = review_reasons(row)
            if not reasons:
                continue
            writer.writerow([
                line,
                spreadsheet_safe(row.get("Booking_ID", "")),
                spreadsheet_safe(row["arrival_year"]),
                spreadsheet_safe(row["arrival_month"]),
                spreadsheet_safe(row["arrival_date"]),
                spreadsheet_safe(row["no_of_weekend_nights"]),
                spreadsheet_safe(row["no_of_week_nights"]),
                "; ".join(reasons),
            ])
            written += 1
    return written


def summarize(input_csv: Path) -> dict:
    counts = {
        "rows": 0,
        "invalid_arrival_date": 0,
        "zero_night_stay": 0,
        "invalid_night_values": 0,
        "review": 0,
        "passes_checked_rules": 0,
        "date_only": 0,
        "zero_nights_only": 0,
        "invalid_nights_only": 0,
        "multiple_issues": 0,
    }

    with input_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("CSV is empty or has no header")
        missing = [name for name in REQUIRED_COLUMNS if name not in reader.fieldnames]
        if missing:
            raise ValueError("Missing required CSV columns: " + ", ".join(missing))

        for row in reader:
            counts["rows"] += 1
            date_bad = not valid_date(row)
            nights = nights_result(row)
            zero_nights = nights == "zero"
            invalid_nights = nights == "invalid"

            counts["invalid_arrival_date"] += int(date_bad)
            counts["zero_night_stay"] += int(zero_nights)
            counts["invalid_night_values"] += int(invalid_nights)
            issue_count = int(date_bad) + int(zero_nights) + int(invalid_nights)

            if issue_count == 0:
                counts["passes_checked_rules"] += 1
            else:
                counts["review"] += 1
                if issue_count > 1:
                    counts["multiple_issues"] += 1
                elif date_bad:
                    counts["date_only"] += 1
                elif zero_nights:
                    counts["zero_nights_only"] += 1
                else:
                    counts["invalid_nights_only"] += 1

    if counts["rows"] != counts["review"] + counts["passes_checked_rules"]:
        raise AssertionError("Outcome counts did not reconcile")
    if counts["review"] != sum(
        counts[key]
        for key in ("date_only", "zero_nights_only", "invalid_nights_only", "multiple_issues")
    ):
        raise AssertionError("Review buckets did not reconcile")

    return {
        "dataset": "Hotel reservations CSV",
        "scope": "Arrival date validity and stay length checks only; other fields were not audited.",
        "rows": counts["rows"],
        "passes_checked_rules": counts["passes_checked_rules"],
        "review": counts["review"],
        "checks": {
            "invalid_arrival_date": counts["invalid_arrival_date"],
            "zero_night_stay": counts["zero_night_stay"],
            "invalid_night_values": counts["invalid_night_values"],
        },
        "review_breakdown": {
            "date_only": counts["date_only"],
            "zero_nights_only": counts["zero_nights_only"],
            "invalid_nights_only": counts["invalid_nights_only"],
            "multiple_issues": counts["multiple_issues"],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path, help="Source hotel reservations CSV")
    parser.add_argument("output_json", type=Path, help="Aggregate JSON destination")
    parser.add_argument("--review-csv", type=Path, help="Optional private CSV of flagged rows")
    arguments = parser.parse_args()

    try:
        if arguments.input_csv.resolve() == arguments.output_json.resolve():
            raise ValueError("Input and output must be different files")
        if arguments.review_csv and arguments.review_csv.resolve() in {
            arguments.input_csv.resolve(), arguments.output_json.resolve()
        }:
            raise ValueError("Review CSV must have its own output path")
        summary = summarize(arguments.input_csv)
        arguments.output_json.parent.mkdir(parents=True, exist_ok=True)
        arguments.output_json.write_text(
            json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        if arguments.review_csv:
            written = write_review_queue(arguments.input_csv, arguments.review_csv)
            if written != summary["review"]:
                raise AssertionError("Review CSV did not reconcile with aggregate count")
    except (OSError, UnicodeError, ValueError, csv.Error, AssertionError) as error:
        print(f"Hotel QA failed: {error}", file=sys.stderr)
        return 1

    print(
        f"Checked {summary['rows']:,} rows: "
        f"{summary['passes_checked_rules']:,} passed these checks, "
        f"{summary['review']:,} need review."
    )
    if arguments.review_csv:
        print(f"Wrote {summary['review']:,} flagged rows to {arguments.review_csv} (keep private).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
