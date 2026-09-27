"""Summarize order-line and SKU catalog quality without exporting source rows.

Usage:
    python scripts/ecommerce_qa.py "Amazon Sale Report.csv" "Sale Report.csv"

The output contains aggregate counts only. Order IDs, SKUs, addresses, and prices
are read for checks but are never written to the summary.
"""

from __future__ import annotations

import argparse
import csv
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path


SALES_COLUMNS = {
    "Order ID", "Status", "SKU", "Qty", "Amount", "ship-city",
    "ship-state", "ship-postal-code", "ship-country",
}
INVENTORY_COLUMNS = {"SKU Code", "Stock"}
SHIPPING_COLUMNS = ("ship-city", "ship-state", "ship-postal-code", "ship-country")
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data" / "ecommerce-qa-summary.json"


def clean(value: str | None) -> str:
    return (value or "").strip()


def open_csv(path: Path, required: set[str]):
    handle = path.open("r", encoding="utf-8-sig", newline="")
    reader = csv.DictReader(handle)
    fields = set(reader.fieldnames or ())
    missing = required - fields
    if missing:
        handle.close()
        raise ValueError(f"{path.name} is missing columns: {', '.join(sorted(missing))}")
    return handle, reader


def summarize(sales_path: Path, inventory_path: Path) -> dict[str, int]:
    counts = {
        "sales_lines": 0,
        "unique_orders": 0,
        "repeated_order_id_lines": 0,
        "blank_order_id_lines": 0,
        "repeated_order_sku_lines": 0,
        "duplicate_business_rows_excluding_index": 0,
        "cancelled_lines": 0,
        "missing_amount_lines": 0,
        "cancelled_missing_amount_lines": 0,
        "noncancelled_missing_amount_lines": 0,
        "invalid_nonblank_amount_lines": 0,
        "zero_quantity_lines": 0,
        "cancelled_zero_quantity_lines": 0,
        "noncancelled_zero_quantity_lines": 0,
        "invalid_or_blank_quantity_lines": 0,
        "missing_any_shipping_field_lines": 0,
        "unique_sales_skus": 0,
        "inventory_rows": 0,
        "blank_inventory_sku_rows": 0,
        "unique_inventory_skus": 0,
        "repeated_inventory_sku_rows": 0,
        "sales_skus_in_inventory": 0,
        "sales_skus_absent_from_inventory": 0,
    }
    order_ids: set[str] = set()
    order_sku_pairs: set[tuple[str, str]] = set()
    business_rows: set[tuple[str, ...]] = set()
    sales_skus: set[str] = set()
    inventory_skus: set[str] = set()

    handle, reader = open_csv(sales_path, SALES_COLUMNS)
    with handle:
        business_columns = [column for column in (reader.fieldnames or []) if column != "index"]
        for row in reader:
            counts["sales_lines"] += 1
            order_id = clean(row["Order ID"])
            sku = clean(row["SKU"])
            cancelled = clean(row["Status"]).casefold() in {"cancelled", "canceled"}

            if order_id:
                if order_id in order_ids:
                    counts["repeated_order_id_lines"] += 1
                else:
                    order_ids.add(order_id)
            else:
                counts["blank_order_id_lines"] += 1

            if order_id and sku:
                key = (order_id, sku)
                if key in order_sku_pairs:
                    counts["repeated_order_sku_lines"] += 1
                else:
                    order_sku_pairs.add(key)
            if sku:
                sales_skus.add(sku)

            business_row = tuple(clean(row.get(column)) for column in business_columns)
            if business_row in business_rows:
                counts["duplicate_business_rows_excluding_index"] += 1
            else:
                business_rows.add(business_row)

            if cancelled:
                counts["cancelled_lines"] += 1

            amount = clean(row["Amount"])
            if not amount:
                counts["missing_amount_lines"] += 1
                key = "cancelled_missing_amount_lines" if cancelled else "noncancelled_missing_amount_lines"
                counts[key] += 1
            else:
                try:
                    Decimal(amount.replace(",", ""))
                except InvalidOperation:
                    counts["invalid_nonblank_amount_lines"] += 1

            quantity = clean(row["Qty"])
            try:
                parsed_quantity = Decimal(quantity)
            except InvalidOperation:
                counts["invalid_or_blank_quantity_lines"] += 1
            else:
                if parsed_quantity == 0:
                    counts["zero_quantity_lines"] += 1
                    key = "cancelled_zero_quantity_lines" if cancelled else "noncancelled_zero_quantity_lines"
                    counts[key] += 1

            if any(not clean(row[column]) for column in SHIPPING_COLUMNS):
                counts["missing_any_shipping_field_lines"] += 1

    handle, reader = open_csv(inventory_path, INVENTORY_COLUMNS)
    with handle:
        for row in reader:
            counts["inventory_rows"] += 1
            sku = clean(row["SKU Code"])
            if not sku:
                counts["blank_inventory_sku_rows"] += 1
            elif sku in inventory_skus:
                counts["repeated_inventory_sku_rows"] += 1
            else:
                inventory_skus.add(sku)

    counts["unique_orders"] = len(order_ids)
    counts["unique_sales_skus"] = len(sales_skus)
    counts["unique_inventory_skus"] = len(inventory_skus)
    counts["sales_skus_in_inventory"] = len(sales_skus & inventory_skus)
    counts["sales_skus_absent_from_inventory"] = len(sales_skus - inventory_skus)
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("amazon_csv", type=Path, help="Path to Amazon Sale Report.csv")
    parser.add_argument("inventory_csv", type=Path, help="Path to Sale Report.csv")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Aggregate JSON output")
    args = parser.parse_args()
    summary = summarize(args.amazon_csv, args.inventory_csv)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {len(summary)} aggregate counts to {args.output}")


if __name__ == "__main__":
    main()
