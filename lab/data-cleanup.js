(() => {
  const sample = [
    "sku,item,quantity,location",
    " sku-014 ,Wireless Scanner,4,A-01",
    "sku-027,Charging Dock,12,b-02",
    "SKU-014,Wireless Scanner,4,A-01",
    "sku-031,Cable Pack,ten,C-03",
    ",Spare Battery,2,C-03",
    "sku-044,Service Tablet,1,",
    "sku-052,Printer Labels,20,D-01"
  ].join("\n");

  const input = document.getElementById("csv-input");
  const runButton = document.getElementById("run-cleanup");
  const sampleButton = document.getElementById("load-sample");
  const clearButton = document.getElementById("clear-input");
  const downloadButton = document.getElementById("download-csv");
  const body = document.getElementById("result-body");
  const issueList = document.getElementById("issue-list");
  const message = document.getElementById("lab-message");
  const stats = {
    rows: document.getElementById("stat-rows"),
    ready: document.getElementById("stat-ready"),
    review: document.getElementById("stat-review")
  };
  if (!input || !runButton || !body) return;

  let lastResults = [];
  input.value = sample;

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const source = text.replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (char === '"') {
        if (quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
        else { quoted = !quoted; }
      } else if (char === "," && !quoted) {
        row.push(cell); cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && source[index + 1] === "\n") index += 1;
        row.push(cell); cell = "";
        if (row.some((value) => value.trim() !== "")) rows.push(row);
        row = [];
      } else {
        cell += char;
      }
    }
    if (quoted) throw new Error("A quoted field is not closed. Check the CSV input.");
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    return rows;
  }

  function normalize(rows) {
    if (rows.length < 2) throw new Error("Add a header and at least one data row.");
    const headers = rows[0].map((name) => name.trim().toLowerCase());
    const required = ["sku", "item", "quantity", "location"];
    const columns = required.map((name) => headers.indexOf(name));
    if (columns.some((index) => index < 0)) throw new Error("The CSV needs these headers: sku, item, quantity, location.");

    const records = rows.slice(1).map((cells, index) => {
      const value = (column) => String(cells[columns[column]] ?? "");
      const sku = value(0).trim().replace(/\s+/g, "-").toUpperCase();
      const item = value(1).trim().replace(/\s+/g, " ");
      const rawQuantity = value(2).trim();
      const quantity = /^\d+$/.test(rawQuantity) ? rawQuantity.replace(/^0+(?=\d)/, "") : rawQuantity;
      const location = value(3).trim().replace(/\s+/g, "-").toUpperCase();
      const issues = [];
      if (!sku) issues.push("Missing SKU");
      if (!item) issues.push("Missing item name");
      if (!rawQuantity || !/^\d+$/.test(rawQuantity)) issues.push("Quantity must be a whole number of zero or more");
      if (!location) issues.push("Missing location");
      if (cells.length !== headers.length) issues.push("Column count differs from header");
      return { line: index + 2, sku, item, quantity, location, issues };
    });
    const counts = new Map();
    records.forEach((record) => { if (record.sku) counts.set(record.sku, (counts.get(record.sku) || 0) + 1); });
    records.forEach((record) => { if (record.sku && counts.get(record.sku) > 1) record.issues.push("Repeated SKU"); });
    return records;
  }

  function setMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("error", error);
  }

  function resetResults() {
    lastResults = [];
    stats.rows.textContent = "0";
    stats.ready.textContent = "0";
    stats.review.textContent = "0";
    body.replaceChildren();
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No results yet.";
    emptyRow.appendChild(cell);
    body.appendChild(emptyRow);
    issueList.replaceChildren();
    downloadButton.disabled = true;
  }

  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value || "—";
    row.appendChild(cell);
    return cell;
  }

  function render(records) {
    lastResults = records;
    const reviewCount = records.filter((record) => record.issues.length > 0).length;
    stats.rows.textContent = String(records.length);
    stats.ready.textContent = String(records.length - reviewCount);
    stats.review.textContent = String(reviewCount);
    body.replaceChildren();
    issueList.replaceChildren();

    records.forEach((record) => {
      const row = document.createElement("tr");
      if (record.issues.length) row.className = "row-issue";
      addCell(row, record.sku);
      addCell(row, record.item);
      addCell(row, record.quantity);
      addCell(row, record.location);
      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = "status-pill" + (record.issues.length ? " needs-review" : "");
      status.textContent = record.issues.length ? "REVIEW" : "READY";
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      body.appendChild(row);
      if (record.issues.length) {
        const item = document.createElement("li");
        item.textContent = "Line " + record.line + ": " + record.issues.join("; ");
        issueList.appendChild(item);
      }
    });
    downloadButton.disabled = false;
    setMessage(records.length + " record" + (records.length === 1 ? "" : "s") + " processed. " + reviewCount + " need" + (reviewCount === 1 ? "s" : "") + " review.");
  }

  function csvCell(value) {
    const text = String(value ?? "");
    const safe = /^[\s\uFEFF]*[=+\-@]/u.test(text) ? "'" + text : text;
    return /[",\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  }

  runButton.addEventListener("click", () => {
    try {
      const records = normalize(parseCsv(input.value));
      render(records);
    } catch (error) {
      resetResults();
      setMessage(error.message || "Could not read this CSV.", true);
    }
  });
  sampleButton.addEventListener("click", () => {
    input.value = sample;
    input.focus();
    resetResults();
    setMessage("Sample loaded. Run cleanup to inspect it.");
  });
  clearButton.addEventListener("click", () => {
    input.value = "";
    input.focus();
    resetResults();
    setMessage("Input cleared. Paste a CSV to begin.");
  });
  downloadButton.addEventListener("click", () => {
    if (!lastResults.length) return;
    const header = ["sku", "item", "quantity", "location", "status", "issues"];
    const rows = lastResults.map((record) => [
      record.sku, record.item, record.quantity, record.location,
      record.issues.length ? "REVIEW" : "READY", record.issues.join("; ")
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory-review.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
