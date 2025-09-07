/* assets/js/revenue.js
   Wires real totals into your existing styled UI.
   Uses global window.sb (Supabase client) if available.
*/
(() => {
  // ---------- UI handles (your existing IDs) ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    year: $("#revYear"),
    incomeUSD: $("#incomeUSD"),
    incomeSub: $("#incomeSub"),
    costUSD: $("#costUSD"),
    costSub: $("#costSub"),
    plUSD: $("#plUSD"),
    plSub: $("#plSub"),
    incomeTable: $("#incomeTable"),
    costTable: $("#costTable"),
    loader: $("#contentLoader"),
  };

  // ---------- FX helpers ----------
  // Keep the same USD→JOD feel you had before
  const USD_TO_JOD = 0.709;
  const FX_TO_USD = {
    USD: 1,
    JOD: 1 / USD_TO_JOD, // ≈ 1.41
    EUR: 1.09,
    CAD: 0.74,
    GBP: 1.27,
    SAR: 0.2667,
    AED: 0.2723,
  };
  const toUSD = (amount, ccy) => Number(amount || 0) * (FX_TO_USD[ccy] ?? 1);
  const toJOD = (usd) => Number(usd || 0) * USD_TO_JOD;
  const fmt$ = (n) =>
    "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  // ---------- Date helpers ----------
  const yearRange = (yr) => {
    if (yr === "all") return null;
    const y = Number(yr);
    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1); // exclusive
    return { start: start.toISOString(), end: end.toISOString() };
  };

  // ---------- Supabase fetchers (defensive) ----------
  async function getInvoices(scopeYear) {
    if (!window.sb) return { rows: [], error: new Error("Supabase not loaded") };

    let q = window.sb
      .from("invoices")
      .select(
        `
        id, client_id, issue_date, subtotal, currency, status,
        clients!invoices_client_id_fkey ( name )
      `
      )
      .eq("status", "Paid");

    const range = yearRange(scopeYear);
    if (range) q = q.gte("issue_date", range.start).lt("issue_date", range.end);

    q = q.order("issue_date", { ascending: true });

    const { data, error } = await q;
    if (error) return { rows: [], error };
    const rows = (data || []).map((r) => ({
      clientName: r.clients?.[0]?.name || r.clients?.name || "—",
      date: r.issue_date,
      amountUSD: Number(r.subtotal || 0), // table prices are USD in `subtotal`
    }));
    return { rows, error: null };
  }

  async function getExpenses(scopeYear) {
    // Try an expenses table; if it’s not there (or schema differs), just return empty.
    if (!window.sb) return { rows: [], error: new Error("Supabase not loaded") };

    let q = window.sb
      .from("expenses")
      .select(
        `
        id, client_id, amount, currency, date,
        clients!expenses_client_id_fkey ( name )
      `
      );

    const range = yearRange(scopeYear);
    if (range) q = q.gte("date", range.start).lt("date", range.end);

    q = q.order("date", { ascending: true });

    const { data, error } = await q;
    if (error) {
      console.warn("[revenue] expenses not available / schema mismatch:", error);
      return { rows: [], error };
    }
    const rows = (data || []).map((r) => ({
      clientName: r.clients?.[0]?.name || r.clients?.name || "—",
      amountUSD: toUSD(r.amount, r.currency || "USD"),
    }));
    return { rows, error: null };
  }

  // ---------- Aggregation ----------
  function aggByClient(rows) {
    const map = new Map();
    for (const r of rows) {
      const k = r.clientName || "—";
      map.set(k, (map.get(k) || 0) + (r.amountUSD || 0));
    }
    return [...map.entries()]
      .map(([client, usd]) => ({ client, usd, jod: toJOD(usd) }))
      .sort((a, b) => b.usd - a.usd);
  }

  // ---------- Render ----------
  function setLoader(on) {
    if (!els.loader) return;
    els.loader.setAttribute("aria-hidden", on ? "false" : "true");
    els.loader.style.display = on ? "block" : "none";
  }

  function renderTotals(scopeYear, incomeUSD, costUSD) {
    const label = scopeYear === "all" ? "Since opening" : `Year ${scopeYear}`;
    const plUSD = incomeUSD - costUSD;

    if (els.incomeUSD) els.incomeUSD.textContent = fmt$(incomeUSD);
    if (els.incomeSub)
      els.incomeSub.textContent = `${label} • ${fmt$(toJOD(incomeUSD))} JOD`;

    if (els.costUSD) els.costUSD.textContent = fmt$(costUSD);
    if (els.costSub)
      els.costSub.textContent = `${label} • ${fmt$(toJOD(costUSD))} JOD`;

    if (els.plUSD) els.plUSD.textContent = fmt$(plUSD);
    if (els.plSub)
      els.plSub.textContent = `${label} • ${fmt$(toJOD(plUSD))} JOD`;
  }

  function renderTables(incomeRows, costRows) {
    if (els.incomeTable) {
      els.incomeTable.innerHTML = incomeRows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.client)}</td><td>${fmt$(r.usd)}</td><td>${fmt$(
              r.jod
            ).replace("$", "")} JOD</td></tr>`
        )
        .join("");
    }
    if (els.costTable) {
      els.costTable.innerHTML = costRows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.client)}</td><td>${fmt$(r.usd)}</td><td>${fmt$(
              r.jod
            ).replace("$", "")} JOD</td></tr>`
        )
        .join("");
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(
      /[&<>"']/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
    );
  }

  // ---------- Flow ----------
  async function refresh(scopeYear) {
    setLoader(true);
    try {
      const [{ rows: invRows }, { rows: expRows }] = await Promise.all([
        getInvoices(scopeYear),
        getExpenses(scopeYear),
      ]);

      const income = aggByClient(invRows);
      const costs = aggByClient(expRows);

      const totalIncomeUSD = income.reduce((a, r) => a + r.usd, 0);
      const totalCostUSD = costs.reduce((a, r) => a + r.usd, 0);

      renderTotals(scopeYear, totalIncomeUSD, totalCostUSD);
      renderTables(income, costs);
    } catch (e) {
      console.error("[revenue] refresh failed", e);
      renderTotals(scopeYear, 0, 0);
      renderTables([], []);
    } finally {
      setLoader(false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const initial = els.year?.value || "2025";
    refresh(initial);
    els.year?.addEventListener("change", () => refresh(els.year.value));
  });
})();
