(() => {
  const filters = [...document.querySelectorAll("[data-hq-filter]")];
  const rows = [...document.querySelectorAll("[data-hq-status]")];
  const status = document.getElementById("hq-filter-status");
  const downloadButton = document.getElementById("hq-download");

  const examples = [
    { example: "EX-001", arrival: "2018-02-29", weekday: "2", weekend: "1", outcome: "REVIEW", reason: "Invalid calendar date" },
    { example: "EX-002", arrival: "2024-08-14", weekday: "0", weekend: "0", outcome: "REVIEW", reason: "Zero-night stay" },
    { example: "EX-003", arrival: "2024-09-21", weekday: "3", weekend: "1", outcome: "PASSED", reason: "" }
  ];

  function csvCell(value) {
    const string = String(value ?? "");
    // A leading apostrophe makes spreadsheet formula-like values plain text.
    const safe = /^[\s\uFEFF]*[=+\-@]/u.test(string) ? "'" + string : string;
    return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  }

  function setFilter(value) {
    filters.forEach((button) => {
      const active = button.dataset.hqFilter === value;
      button.setAttribute("aria-pressed", String(active));
    });
    let visible = 0;
    rows.forEach((row) => {
      const show = value === "all" || row.dataset.hqStatus === value;
      row.hidden = !show;
      if (show) visible += 1;
    });
    const label = value === "all" ? "invented examples" : value === "review" ? "invented review examples" : "invented passed example";
    if (status) status.textContent = `Showing ${visible} ${label}.`;
  }

  filters.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.hqFilter)));

  function showSummary(summary) {
    const values = {
      rows: summary.rows,
      review: summary.review,
      passes_checked_rules: summary.passes_checked_rules,
      invalid_arrival_date: summary.checks?.invalid_arrival_date,
      zero_night_stay: summary.checks?.zero_night_stay
    };
    if (Object.values(values).some((value) => !Number.isSafeInteger(value) || value < 0)) return;
    for (const [name, value] of Object.entries(values)) {
      document.querySelectorAll(`[data-metric="${name}"]`).forEach((element) => {
        element.textContent = value.toLocaleString("en-US");
      });
    }
    const check = document.querySelector(".hq-reconcile-check");
    if (check && summary.passes_checked_rules + summary.review !== summary.rows) {
      check.textContent = "!";
      check.setAttribute("aria-label", "Counts do not reconcile");
      check.classList.add("hq-reconcile-error");
    }
  }

  async function loadSummary() {
    const fallback = document.getElementById("hq-summary-fallback");
    let summary;
    try {
      summary = JSON.parse(fallback?.textContent || "{}");
    } catch {
      summary = null;
    }
    if (location.protocol !== "file:") {
      try {
        const response = await fetch("../data/hotel-qa-summary.json", { cache: "no-store" });
        if (response.ok) summary = await response.json();
      } catch {
        // Embedded aggregate counts keep the demo usable in local previews.
      }
    }
    if (summary) showSummary(summary);
  }

  downloadButton?.addEventListener("click", () => {
    const header = ["example", "arrival", "weekday_nights", "weekend_nights", "outcome", "review_reason"];
    const reviewRows = examples.filter((example) => example.outcome === "REVIEW").map((example) => [
      example.example, example.arrival, example.weekday, example.weekend, example.outcome, example.reason
    ]);
    const csv = [header, ...reviewRows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "synthetic-hotel-review.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  loadSummary();
})();
