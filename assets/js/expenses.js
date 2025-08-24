(() => {
  // ===== Mock data (replace with Supabase later) =====
  const items = [
    { vendor: "Wix",       date: "2025-08-01", category: "Hosting",   amount: 29,  status: "Paid",     paidBy: "VISA AHMAD" },
    { vendor: "Google",    date: "2025-09-10", category: "Ads",       amount: 110, status: "Upcoming", paidBy: "AMEX" },
    { vendor: "Adobe",     date: "2025-07-15", category: "Creative",  amount: 55,  status: "Unpaid",   paidBy: "Client" },
    { vendor: "AWS",       date: "2025-06-20", category: "Cloud",     amount: 450, status: "Paid",     paidBy: "VISA AHMAD" },
    { vendor: "Namecheap", date: "2024-12-22", category: "Domains",   amount: 12,  status: "Paid",     paidBy: "AMEX" },
    { vendor: "Figma",     date: "2024-11-03", category: "Design",    amount: 180, status: "Paid",     paidBy: "AMEX" },
    { vendor: "Zapier",    date: "2023-09-09", category: "Automation",amount: 95,  status: "Unpaid",   paidBy: "VISA AHMAD" },
    { vendor: "Cloudflare",date: "2022-08-16", category: "CDN",       amount: 120, status: "Paid",     paidBy: "AMEX" },
  ];

  // ===== Helpers =====
  const $ = s => document.querySelector(s);
  const by = (k) => (a,b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0);
  const fmt$ = n => "$" + Number(n||0).toLocaleString();
  const parseISO = s => new Date(s + "T00:00:00");

  function inDateRange(rec, filter) {
    const now = new Date();
    const y = now.getFullYear();
    const d = parseISO(rec.date);

    switch (filter) {
      case "this_year":
        return d.getFullYear() === y;
      case "next_90": {
        const end = new Date(now); end.setDate(end.getDate()+90);
        return d >= now && d <= end;
      }
      case "last_90": {
        const start = new Date(now); start.setDate(start.getDate()-90);
        return d >= start && d <= now;
      }
      case "y2024": return d.getFullYear() === 2024;
      case "y2023": return d.getFullYear() === 2023;
      case "y2022": return d.getFullYear() === 2022;
      default:      return true;
    }
  }

  function badge(status) {
    const s = status.toLowerCase();
    if (s === "paid") return `<span class="badge ok">Paid</span>`;
    if (s === "unpaid" || s === "overdue") return `<span class="badge bad">Unpaid</span>`;
    return `<span class="badge warn">Upcoming</span>`; // default to upcoming
  }

  function uniqueVendors(list) {
    return Array.from(new Set(list.map(x => x.vendor))).sort();
  }

  // ===== State =====
  const state = {
    sortKey: "date",
    sortDir: "desc", // 'asc'|'desc'
    dateFilter: "this_year",
    vendorFilter: "all"
  };

  // ===== Render =====
    function render() {
        const tbody = $("#expensesBody");

        let rows = items
        .filter(x => inDateRange(x, state.dateFilter))
        .filter(x => state.vendorFilter === "all" ? true : x.vendor === state.vendorFilter);

        // sort
        rows.sort(by(state.sortKey));
        if (state.sortDir === "desc") rows.reverse();

        // update header arrows
        updateSortIndicators();

        tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${r.vendor}</td>
            <td>${r.date}</td>
            <td>${r.category}</td>
            <td>${fmt$(r.amount)}</td>
            <td>${badge(r.status)}</td>
            <td>${r.paidBy}</td>
        </tr>
        `).join("") || `<tr><td colspan="6">No expenses for this filter.</td></tr>`;
    }

    function updateSortIndicators() {
        document.querySelectorAll("#expensesTable thead th").forEach(th => {
            const key = th.getAttribute("data-sort");
            if (!key) return;

            // remove old arrows
            const base = th.getAttribute("data-label") || th.textContent.replace(/[▲▼]/g,"").trim();
            th.setAttribute("data-label", base);

            if (key === state.sortKey) {
            th.textContent = base + (state.sortDir === "asc" ? " ▲" : " ▼");
            } else {
            th.textContent = base;
            }
        });
        }



  // ===== Boot =====
  document.addEventListener("DOMContentLoaded", () => {
    // Populate vendor filter
    const vendorSel = $("#expVendorFilter");
    vendorSel.innerHTML = `<option value="all">All services</option>` +
      uniqueVendors(items).map(v => `<option value="${v}">${v}</option>`).join("");

    // Hook filters
    $("#expDateFilter").addEventListener("change", (e) => {
      state.dateFilter = e.target.value;
      render();
    });
    vendorSel.addEventListener("change", (e) => {
      state.vendorFilter = e.target.value;
      render();
    });

    // Sorting
    const headers = Array.from(document.querySelectorAll("#expensesTable thead th"));
    headers.forEach(th => {
      const key = th.getAttribute("data-sort");
      if (!key) return;
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = key === "date" ? "desc" : "asc";
        }
        render();
      });
    });

    // Initial render
    render();
  });
})();
