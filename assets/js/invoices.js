(() => {
  const $ = s => document.querySelector(s);

  // ===== State =====
  const state = {
    sortKey: "date",    // default sort by date
    sortDir: "desc",    // newest first
    dateFilter: "all",  // dropdown value
  };

  const table = $("#invoiceTable");
  const tbody = table?.querySelector("tbody");
  let originalRows = [];

  // ===== Helpers =====
  const parseCurrency = txt => Number(String(txt).replace(/[^0-9.-]/g, "")) || 0;

  const parseDate = txt => {
    const d = new Date(String(txt).trim() + "T00:00:00");
    return isNaN(d) ? new Date(0) : d;
  };

  // Status ordering (customize if you like)
  const statusRank = s => {
    const t = String(s).toLowerCase();
    if (t.includes("paid"))     return 4;
    if (t.includes("sent"))     return 3;
    if (t.includes("due soon")) return 2;
    if (t.includes("overdue"))  return 1;
    return 0; // null/—/unknown
  };

  // Read comparable value from a <tr> given the current column
  function cellValue(tr, key) {
    const td = tr.children;
    switch (key) {
      case "clientId":   return td[0]?.textContent.trim() || "";
      case "clientName": return td[1]?.textContent.trim() || "";
      case "invoiceNo":  return td[2]?.textContent.trim() || "";
      case "date":       return parseDate(td[3]?.textContent);
      case "amount":     return parseCurrency(td[4]?.textContent);
      case "status":     return statusRank(td[5]?.textContent || "");
      case "coverage":   return td[6]?.textContent.trim() || "";
      default:           return "";
    }
  }

  function compareRows(a, b, key) {
    const va = cellValue(a, key);
    const vb = cellValue(b, key);
    if (va > vb) return 1;
    if (va < vb) return -1;
    return 0;
  }

  // Date filtering logic (matches your dropdown)
  function inDateRange(tr, filter) {
    const dateTxt = tr.children[3]?.textContent || "";
    const d = parseDate(dateTxt);
    if (String(d) === "Invalid Date") return false;

    const now = new Date();
    const y = now.getFullYear();

    switch (filter) {
      case "last30": {
        const start = new Date(now); start.setDate(now.getDate() - 30);
        return d >= start && d <= now;
      }
      case "last90": {
        const start = new Date(now); start.setDate(now.getDate() - 90);
        return d >= start && d <= now;
      }
      case "thisYear":
        return d.getFullYear() === y;
      case "y2024": return d.getFullYear() === 2024;
      case "y2023": return d.getFullYear() === 2023;
      case "y2022": return d.getFullYear() === 2022;
      case "all":
      default:
        return true;
    }
  }

  // Inline arrows tight to the label (same as Expenses)
  function updateSortIndicators() {
    table.querySelectorAll("thead th[data-sort]").forEach(th => {
      const key  = th.getAttribute("data-sort");
      const base = th.getAttribute("data-label") || th.textContent.replace(/[▲▼]/g,"").trim();
      th.setAttribute("data-label", base);
      th.textContent = (key === state.sortKey)
        ? base + (state.sortDir === "asc" ? " ▲" : " ▼")
        : base;
    });
  }

  // Render with current filters + sort
  function render() {
    // 1) filter from the original (unsorted) snapshot
    let rows = originalRows.filter(tr => inDateRange(tr, state.dateFilter));

    // 2) sort
    rows.sort((a, b) => compareRows(a, b, state.sortKey));
    if (state.sortDir === "desc") rows.reverse();

    // 3) attach
    const frag = document.createDocumentFragment();
    rows.forEach(r => frag.appendChild(r));
    tbody.innerHTML = "";
    tbody.appendChild(frag);

    // 4) arrows
    updateSortIndicators();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!table || !tbody) return;

    // Snapshot original rows once (so filters always start from full set)
    originalRows = Array.from(tbody.querySelectorAll("tr")).map(tr => tr.cloneNode(true));

    // Hook: sortable headers
    table.querySelectorAll("thead th[data-sort]").forEach(th => {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        if (state.sortKey === key) {
          state.sortDir = (state.sortDir === "asc" ? "desc" : "asc");
        } else {
          state.sortKey = key;
          state.sortDir = (key === "date" || key === "amount") ? "desc" : "asc";
        }
        render();
      });
    });

    // Hook: date filter dropdown
    $("#dateFilter")?.addEventListener("change", (e) => {
      state.dateFilter = e.target.value || "all";
      render();
    });

    // First render
    render();
  });
})();
