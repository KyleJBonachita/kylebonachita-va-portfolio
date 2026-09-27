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
  const readyDownloadButton = document.getElementById("download-ready");
  const filterButtons = [...document.querySelectorAll("[data-lab-filter]")];
  const filterStatus = document.getElementById("lab-filter-status");
  const body = document.getElementById("result-body");
  const issueList = document.getElementById("issue-list");
  const message = document.getElementById("lab-message");
  const stats = {
    rows: document.getElementById("stat-rows"),
    ready: document.getElementById("stat-ready"),
    review: document.getElementById("stat-review"),
    excluded: document.getElementById("stat-excluded")
  };
  if (!input || !runButton || !body) return;

  let lastResults = [];
  let currentFilter = "all";
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
      return { line: index + 2, sku, item, quantity, location, issues, excluded: false };
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
    currentFilter = "all";
    filterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.labFilter === "all")));
    stats.rows.textContent = "0";
    stats.ready.textContent = "0";
    stats.review.textContent = "0";
    stats.excluded.textContent = "0";
    filterStatus.textContent = "Run cleanup to filter records.";
    body.replaceChildren();
    const emptyRow = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No results yet.";
    emptyRow.appendChild(cell);
    body.appendChild(emptyRow);
    issueList.replaceChildren();
    downloadButton.disabled = true;
    readyDownloadButton.disabled = true;
  }

  function addCell(row, value, label) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    cell.textContent = value || "—";
    row.appendChild(cell);
    return cell;
  }

  function render(records) {
    lastResults = records;
    const readyCount = records.filter((record) => !record.excluded && !record.issues.length).length;
    const reviewCount = records.filter((record) => !record.excluded && record.issues.length).length;
    const excludedCount = records.filter((record) => record.excluded).length;
    stats.rows.textContent = String(records.length);
    stats.ready.textContent = String(readyCount);
    stats.review.textContent = String(reviewCount);
    stats.excluded.textContent = String(excludedCount);
    body.replaceChildren();
    issueList.replaceChildren();
    filterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.labFilter === currentFilter)));

    const visible = records.filter((record) => {
      if (currentFilter === "ready") return !record.excluded && !record.issues.length;
      if (currentFilter === "review") return !record.excluded && record.issues.length > 0;
      if (currentFilter === "excluded") return record.excluded;
      return true;
    });
    filterStatus.textContent = `Showing ${visible.length} of ${records.length} records.`;
    if (!visible.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "No records in this view.";
      row.append(cell);
      body.append(row);
    }
    visible.forEach((record) => {
      const row = document.createElement("tr");
      if (record.excluded) row.className = "row-excluded";
      else if (record.issues.length) row.className = "row-issue";
      addCell(row, record.sku, "SKU");
      addCell(row, record.item, "Item");
      addCell(row, record.quantity, "Qty");
      addCell(row, record.location, "Location");
      const statusCell = document.createElement("td");
      statusCell.dataset.label = "Status";
      const status = document.createElement("span");
      status.className = "status-pill" + (record.excluded ? " is-excluded" : record.issues.length ? " needs-review" : "");
      status.textContent = record.excluded ? "EXCLUDED" : record.issues.length ? "REVIEW" : "READY";
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      const actionCell = document.createElement("td");
      actionCell.dataset.label = "Action";
      const action = document.createElement("button");
      action.type = "button";
      action.className = "lab-row-action";
      action.dataset.line = String(record.line);
      action.textContent = record.excluded ? "Restore" : "Exclude";
      action.setAttribute("aria-label", `${record.excluded ? "Restore" : "Exclude from clean export"} source line ${record.line}`);
      actionCell.append(action);
      row.append(actionCell);
      body.appendChild(row);
    });
    records.forEach((record) => {
      if (!record.issues.length && !record.excluded) return;
      const item = document.createElement("li");
      const flags = [...record.issues];
      if (record.excluded) flags.push("Excluded from clean export");
      item.textContent = "Line " + record.line + ": " + flags.join("; ");
      issueList.appendChild(item);
    });
    downloadButton.disabled = false;
    readyDownloadButton.disabled = readyCount === 0;
    setMessage(`${records.length} records processed: ${readyCount} ready, ${reviewCount} need review, ${excludedCount} excluded.`);
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
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    currentFilter = button.dataset.labFilter;
    if (lastResults.length) render(lastResults);
    else filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  }));
  body.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-line]");
    if (!action) return;
    const record = lastResults.find((item) => item.line === Number(action.dataset.line));
    if (!record) return;
    record.excluded = !record.excluded;
    render(lastResults);
    const replacement = [...body.querySelectorAll("button[data-line]")].find((item) => Number(item.dataset.line) === record.line);
    (replacement || filterButtons.find((button) => button.dataset.labFilter === currentFilter))?.focus();
  });

  function downloadCsv(filename, header, rows) {
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  readyDownloadButton.addEventListener("click", () => {
    const ready = lastResults.filter((record) => !record.excluded && !record.issues.length);
    if (!ready.length) return;
    downloadCsv("inventory-ready.csv", ["sku", "item", "quantity", "location"],
      ready.map((record) => [record.sku, record.item, record.quantity, record.location]));
  });
  downloadButton.addEventListener("click", () => {
    if (!lastResults.length) return;
    const header = ["source_line", "sku", "item", "quantity", "location", "status", "issues"];
    const rows = lastResults.map((record) => [
      record.line,
      record.sku, record.item, record.quantity, record.location,
      record.excluded ? "EXCLUDED" : record.issues.length ? "REVIEW" : "READY",
      [...record.issues, ...(record.excluded ? ["Manually excluded from clean export"] : [])].join("; ")
    ]);
    downloadCsv("inventory-review.csv", header, rows);
  });
})();
