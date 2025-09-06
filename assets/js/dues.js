/* assets/js/dues.js — STRICT RULES:
   - Only coverage_period: 'annual' or '6m' (exclude 'monthly' and 'one_time' for future; allow paid one_time in past)
   - Seeds come ONLY from last calendar year (e.g., if now 2025 → seeds = 2024 paid)
   - Past months: show Paid only
   - This month & future: show Upcoming projections (from last year's latest paid per client+freq per stream)
     and suppress a projection if a real invoice exists for that client in that month.
*/

(() => {
  const $ = (sel) => document.querySelector(sel);

  // ===== DOM handles (must match dues.html) =====
  const els = {
    loader: $("#contentLoader"),

    // Card 1: Expenses (Month)
    expPrev: $("#expPrev"),
    expMonthSel: $("#expMonth"),
    expNext: $("#expNext"),
    expMonthTotal: $("#expMonthTotal"),
    expMonthBody: $("#expMonthBody"),

    // Card 2: Invoices (Month)
    incomePrev: $("#incomePrev"),
    incomeMonthSel: $("#incomeMonth"),
    incomeNext: $("#incomeNext"),
    incomeMonthTotal: $("#incomeMonthTotal"),
    incomeMonthBody: $("#incomeMonthBody"),

    // Card 3: Expenses (Rolling 5-month)
    exp5MonthSel: $("#exp5Month"),
    exp5Head: $("#exp5Head"),
    exp5Body: $("#exp5Body"),

    // Card 4: Invoices (Rolling 5-month)
    inc5MonthSel: $("#inc5Month"),
    inc5Head: $("#inc5Head"),
    inc5Body: $("#inc5Body"),
  };

  // ===== Utilities =====
  const startOfMonth = (d) => { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; };
  const endOfMonth   = (d) => { const x = startOfMonth(d); x.setMonth(x.getMonth()+1); x.setMilliseconds(-1); return x; };
  const addMonths    = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth()+n); return x; };
  const clampEOMAddMonths = (d, n) => {
    const src = new Date(d);
    const day = src.getDate();
    const t = new Date(src.getFullYear(), src.getMonth() + n, 1);
    const lastDay = new Date(t.getFullYear(), t.getMonth()+1, 0).getDate();
    t.setDate(Math.min(day, lastDay)); t.setHours(0,0,0,0); return t;
  };
  const monthKey   = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const monthLabel = (d) => d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const toISODate  = (dt) => { const d = new Date(dt); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const fmt$       = (n) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const esc        = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const setLoader  = (on) => { if (!els.loader) return; els.loader.style.display = on ? "block" : "none"; els.loader.setAttribute("aria-hidden", on ? "false" : "true"); };

  // ===== Time anchors =====
  const today = new Date();
  const todayMonth = startOfMonth(today);

  // Anchors per card
  let anchorExp1  = startOfMonth(new Date()); // Card 1
  let anchorMonth2 = startOfMonth(new Date()); // Card 2
  let anchorExp3  = startOfMonth(new Date()); // Card 3
  let anchorMonth4 = startOfMonth(new Date()); // Card 4

  // Last calendar year window (e.g., if today=2025 → seeds are 2024 only)
  const LAST_YEAR = today.getFullYear() - 1;
  const lastYearStart = new Date(LAST_YEAR, 0, 1, 0, 0, 0, 0);
  const lastYearEnd   = new Date(LAST_YEAR, 11, 31, 23, 59, 59, 999);

  // Reasonable actuals window (minimize queries but include near-future)
  const nextYearEnd   = new Date(today.getFullYear() + 1, 11, 31, 23, 59, 59, 999);

  const thisYearEnd   = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

  // ===== Coverage normalization =====
  function normalizeTerms(v){
    if (v == null) return "";
    const s = String(v).toLowerCase().replace(/\s+/g, " ").trim();

    // Annual synonyms
    const annualSet = new Set([
      "annual","annually","yearly","per year","per annum","p.a.","pa",
      "12m","12 m","12 months","12 month","one year","1 year","year"
    ]);

    // 6-month synonyms
    const sixSet = new Set([
      "6m","6 m","6 months","6 month","six months","semiannual","semi-annual",
      "semi annually","semi annually ","half-year","half year","halfyear"
    ]);

    // Monthly & one-time
    const monthlySet = new Set(["monthly","1m","1 m","1 month","month","mo","per month"]);
    const oneTimeSet = new Set(["one_time","one-time","one time","once","single","single time"]);

    if (annualSet.has(s)) return "annual";
    if (sixSet.has(s))    return "6m";
    if (monthlySet.has(s)) return "monthly";
    if (oneTimeSet.has(s)) return "one_time";

    // Loose numeric helpers (e.g., "12", "6")
    if (/^12\b/.test(s)) return "annual";
    if (/^6\b/.test(s))  return "6m";

    return "";
  }
  const isRecurring      = (f) => f === "annual" || f === "6m";          // for projections & “real overrides”
  const isAllowedActual  = (f) => isRecurring(f) || f === "one_time";    // past can include one-time if Paid
  const monthsFor        = (f) => (f === "annual" ? 12 : f === "6m" ? 6 : null);

  // ===== App state =====
  let paidSeeds = [];      // last-year paid (annual/6m) → used to project one step ahead
  let actualA6  = [];      // actual invoices (any status) filtered to annual/6m (+paid one_time past) within [lastYearStart..nextYearEnd]

  // ===== Supabase fetches =====
  async function fetchPaidSeedsLastYear() {
    if (!window.sb) { console.error("[dues] Supabase client not found"); return []; }
    const { data, error } = await window.sb
      .from("invoices")
      .select(`
        id, invoice_no, client_id, issue_date, status, subtotal, currency, coverage_period, pdf_url,
        clients!invoices_client_id_fkey ( name )
      `)
      .eq("status", "Paid")
      .gte("issue_date", lastYearStart.toISOString())
      .lte("issue_date", thisYearEnd.toISOString())
      .order("issue_date", { ascending: true });


    if (error) { console.error("[dues] fetchPaidSeedsLastYear:", error); return []; }

    return (data || [])
      .map(r => ({
        id: r.id,
        invoice_no: r.invoice_no,
        client_id: r.client_id,
        client_name: r?.clients?.name || (Array.isArray(r?.clients) ? r.clients[0]?.name : "") || "—",
        issue_date: r.issue_date,
        status: String(r.status || "").toLowerCase(),
        subtotal: Number(r.subtotal || 0),
        currency: r.currency || "USD",
        coverage_period: normalizeTerms(r.coverage_period),
        pdf_url: r.pdf_url || ""
      }))

      // Allow annual/6m always, and allow paid one_time (for past display)
      .filter(r => {
        const f = r.coverage_period;
        if (isRecurring(f)) return true;                 // keep annual/6m always
        if (f === "one_time" && r.status === "paid") return true; // allow paid one-time (past)
        return false;
      });
  }

  async function fetchActualAnnual6mWindow() {
    if (!window.sb) { console.error("[dues] Supabase client not found"); return []; }
    const { data, error } = await window.sb
      .from("invoices")
      .select(`
        id, invoice_no, client_id, issue_date, status, subtotal, currency, coverage_period, pdf_url,
        clients!invoices_client_id_fkey ( name )
      `)

      .gte("issue_date", lastYearStart.toISOString())
      .lte("issue_date", nextYearEnd.toISOString());

    if (error) { console.warn("[dues] fetchActualAnnual6mWindow:", error); return []; }

    return (data || [])
      .map(r => ({
        id: r.id,
        invoice_no: r.invoice_no,
        client_id: r.client_id,
        client_name: r?.clients?.name || (Array.isArray(r?.clients) ? r.clients[0]?.name : "") || "—",
        issue_date: r.issue_date,
        status: String(r.status || "").toLowerCase(),
        subtotal: Number(r.subtotal || 0),
        pdf_url: r.pdf_url || "",
        currency: r.currency || "USD",
        coverage_period: normalizeTerms(r.coverage_period),
      }))
      // Keep annual/6m always; keep paid one_time for past display
      .filter(r => isAllowedActual(r.coverage_period));
  }

  // Build one-step projections from last year's PAID per stream (client|freq|month|day)
  function buildSeedsOneStep(paidRows){
    const mon = d => new Date(d).getMonth();
    const day = d => new Date(d).getDate();

    const latest = new Map(); // client_id|freq|month|day -> last paid row
    for (const r of paidRows){
      const freq = r.coverage_period;
      if (freq !== "annual" && freq !== "6m") continue;
      const key = `${r.client_id}|${freq}|${mon(r.issue_date)}|${day(r.issue_date)}`;
      const cur = latest.get(key);
      if (!cur || new Date(r.issue_date) > new Date(cur.issue_date)) latest.set(key, r);
    }

    const seeds = [];
    for (const [, s] of latest){
      const step = (s.coverage_period === "annual") ? 12 : 6;
      const nextDate = clampEOMAddMonths(new Date(s.issue_date), step).toISOString();
      seeds.push({
        client_id: s.client_id,
        client_name: s.client_name,
        currency: s.currency,
        subtotal: s.subtotal,
        freq: s.coverage_period,       // 'annual' | '6m'
        seed_issue_date: s.issue_date, // last year's paid
        seed_pdf_url: s.pdf_url || "", // <<— carry last year's PDF
        next_issue_date: nextDate,     // upcoming (this year)
      });
    }
    return seeds;
}


  function projectForWindow(seeds, winStart, winEnd, realKeys){
    const out = [];
    for (const s of seeds){
      const nd = new Date(s.next_issue_date);
      if (nd < winStart || nd > winEnd) continue;
      if (startOfMonth(nd) < todayMonth) continue; // only now/future
      const key = `${s.client_id}|${monthKey(nd)}`;
      if (realKeys.has(key)) continue; // real recurring overrides projection
      out.push({
        client_id: s.client_id,
        client_name: s.client_name,
        issue_date: s.next_issue_date,
        status: "upcoming",
        subtotal: s.subtotal,
        currency: s.currency,
        isProjection: true,
        pdf_url: s.seed_pdf_url || ""  // <<— click upcoming to last year's PDF
      });
    }
    return out;
  }


  // ===== Month select helpers =====
  function ensureMonthOptions(selectEl, anchor) {
    if (!selectEl) return;
    // build options if missing YYYY-MM
    const hasYYYYMM = Array.from(selectEl.options || []).some(o => /^\d{4}-\d{2}$/.test(o.value));
    if (!hasYYYYMM) {
      const start = addMonths(todayMonth, -12);
      const end   = addMonths(todayMonth, +12);
      selectEl.innerHTML = "";
      let cur = new Date(start);
      while (cur <= end) {
        const opt = document.createElement("option");
        opt.value = monthKey(cur);
        opt.textContent = monthLabel(cur);
        selectEl.appendChild(opt);
        cur = addMonths(cur, +1);
      }
    }
    const mk = monthKey(anchor);
    const mOpt = Array.from(selectEl.options).find(o => o.value === mk);
    if (mOpt) selectEl.value = mk;
  }

  function ensureMonthOptionsAll(){
    ensureMonthOptions(els.incomeMonthSel, anchorMonth2);
    ensureMonthOptions(els.inc5MonthSel, anchorMonth4);
    if (els.expMonthSel)  ensureMonthOptions(els.expMonthSel,  anchorExp1);
    if (els.exp5MonthSel) ensureMonthOptions(els.exp5MonthSel, anchorExp3);
  }

  function initMonthSelect(selectEl, anchor, onChange) {
    if (!selectEl) return;
    ensureMonthOptions(selectEl, anchor);
    selectEl.addEventListener("change", () => {
      const [y, m] = (selectEl.value || "").split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, 1);
      onChange(startOfMonth(dt));
    });
  }

  function initPrevNext(prevBtn, nextBtn, getAnchor, setAnchor) {
    prevBtn?.addEventListener("click", () => setAnchor(addMonths(getAnchor(), -1)));
    nextBtn?.addEventListener("click", () => setAnchor(addMonths(getAnchor(), +1)));
  }

  // ===== Render: Card 2 (Month) — Past=Paid only; Now/Future=Upcoming (+real overrides) =====
  function renderInvoicesMonth(anchor){
    const body = els.incomeMonthBody;
    if (!body) return;

    const mStart = startOfMonth(anchor);
    const mEnd   = endOfMonth(anchor);
    const isPast = mEnd < todayMonth;

    // REAL in this month (annual/6m or paid one_time)
    let realInMonth = actualA6.filter(r => {
      if (!r.issue_date) return false;
      const d = new Date(r.issue_date);
      return d >= mStart && d <= mEnd;
    });

    // Past → show only Paid (including one_time)
    if (isPast) {
      realInMonth = realInMonth.filter(r => r.status === "paid");
    } else {
      // This month & future → never show one_time
      realInMonth = realInMonth.filter(r => r.coverage_period !== "one_time");
    }

    // Upcoming projections (from seeds; only for now/future; suppress if REAL recurring exists)
    const realKeys = new Set(
      actualA6
        .filter(r => isRecurring(r.coverage_period))   // only recurring suppress projections
        .map(r => `${r.client_id}|${(r.issue_date || "").slice(0,7)}`)
    );

    const seeds = buildSeedsOneStep(paidSeeds);
    const upcoming = isPast ? [] : projectForWindow(seeds, mStart, mEnd, realKeys);

    const rows = [
      ...realInMonth.map(r => ({ ...r, isProjection: false })),
      ...upcoming
    ];

    const total = rows.reduce((a,r)=> a + (Number(r.subtotal)||0), 0);
    if (els.incomeMonthTotal) els.incomeMonthTotal.textContent = fmt$(total);

    // Render (Invoice | Date | Client | Amount | Status)
    body.innerHTML = rows.length
      ? rows.map(row => {
          const st = row.isProjection ? "upcoming" : (isPast ? "paid" : (row.status || "sent"));
          const pill =
            st === "upcoming" ? "tag sent" :
            st === "paid"     ? "tag ok"   :
            st === "overdue"  ? "tag due"  :
            st === "partial"  ? "tag warn" : "tag null";
          const invNo = row.invoice_no || (row.isProjection ? "—" : row.id);
          return `
            <tr ${row.pdf_url ? `data-url="${esc(row.pdf_url)}"` : ""} style="${row.pdf_url ? "cursor:pointer" : ""}" ${row.isProjection && row.pdf_url ? `title="Opens last year's invoice"` : ""}>
              <td>${esc(invNo)}</td>
              <td>${row.issue_date ? esc(toISODate(row.issue_date)) : "—"}</td>
              <td>${esc(row.client_name || "—")}</td>
              <td>${fmt$(row.subtotal)}</td>
              <td><span class="${pill}">${esc(st)}</span></td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="5" style="text-align:center;opacity:.75;">No invoices in ${esc(monthLabel(mStart))}</td></tr>`;
  }

  // ===== Render: Card 4 (Rolling 5-month) — Paid (past) + Upcoming (future) =====
  function renderInvoicesRolling(anchor){
    const head = els.inc5Head, body = els.inc5Body;
    if (!head || !body) return;

    const windowMonths = [
      addMonths(anchor, -2),
      addMonths(anchor, -1),
      addMonths(anchor,  0),
      addMonths(anchor, +1),
      addMonths(anchor, +2),
    ];
    const keys = windowMonths.map(monthKey);

    // Header
    head.innerHTML = `
      <tr>
        <th>Client</th>
        ${windowMonths.map(d => `<th>${esc(monthLabel(d))}</th>`).join("")}
        <th>Total</th>
      </tr>
    `;

    // Aggregate REAL in window:
    //  - Past: Paid only (annual/6m + allow paid one_time)
    //  - Present/Future: annual/6m only (no one_time)
    const agg = new Map(); // client_id -> { name, months:{} }
    for (const inv of actualA6){
      if (!inv.issue_date) continue;
      const invMonth = startOfMonth(new Date(inv.issue_date));
      const mk = monthKey(invMonth);
      if (!keys.includes(mk)) continue;

      if (invMonth < todayMonth) {
        if (inv.status !== "paid") continue; // past needs paid
        // (one_time allowed in past due to actualA6 filter)
      } else {
        if (inv.coverage_period === "one_time") continue; // drop one_time in present/future
      }

      const k = inv.client_id ?? `no-id-${inv.client_name}`;
      if (!agg.has(k)) agg.set(k, { name: inv.client_name, months: {} });
      const e = agg.get(k);
      e.months[mk] = (e.months[mk] || 0) + (Number(inv.subtotal) || 0);
    }

    // Upcoming projections for window (suppress if REAL recurring exists)
    const winStart = startOfMonth(windowMonths[0]);
    const winEnd   = endOfMonth(windowMonths[4]);
    const seeds = buildSeedsOneStep(paidSeeds);
    const realKeys = new Set(
      actualA6
        .filter(r => isRecurring(r.coverage_period)) // only recurring suppress projections
        .map(r => `${r.client_id}|${(r.issue_date || "").slice(0,7)}`)
    );
    const projections = projectForWindow(seeds, winStart, winEnd, realKeys);

    for (const p of projections){
      const mk = (p.issue_date || "").slice(0,7);
      const pMonth = startOfMonth(new Date(p.issue_date));
      if (!keys.includes(mk)) continue;
      if (pMonth < todayMonth) continue; // future only
      const k = p.client_id ?? `no-id-${p.client_name}`;
      if (!agg.has(k)) agg.set(k, { name: p.client_name, months: {} });
      const e = agg.get(k);
      e.months[mk] = (e.months[mk] || 0) + (Number(p.subtotal) || 0);
    }

    // Rows (hide 0-only clients)
    const rows = [];
    for (const [, entry] of agg){
      const vals = keys.map(mk => Number(entry.months[mk] || 0));
      const sum  = vals.reduce((a,b)=>a+b,0);
      if (sum <= 0) continue;
      rows.push({ name: entry.name, vals, sum });
    }
    rows.sort((a,b)=> b.sum - a.sum || a.name.localeCompare(b.name));

    body.innerHTML = rows.length
      ? rows.map(r => `
          <tr>
            <td>${esc(r.name)}</td>
            ${r.vals.map(v => `<td>${fmt$(v)}</td>`).join("")}
            <td><strong>${fmt$(r.sum)}</strong></td>
          </tr>
        `).join("")
      : `<tr><td colspan="7" style="text-align:center;opacity:.75;">No client invoices in this 5-month window.</td></tr>`;
  }

  // ===== Expenses header (Card 3) builder =====
  function buildExpenses5Header(){
    if (!els.exp5Head) return;
    const base = anchorExp3;
    const months = [-2, -1, 0, +1, +2].map(n => addMonths(base, n));
    els.exp5Head.innerHTML = `
      <tr>
        <th>Platform</th>
        ${months.map(d => `<th>${esc(monthLabel(d))}</th>`).join("")}
        <th>Total</th>
      </tr>
    `;
  }

  // ===== Orchestration =====
  const refreshCard2 = () => renderInvoicesMonth(anchorMonth2);
  const refreshCard4 = () => renderInvoicesRolling(anchorMonth4);

  async function init(){
    setLoader(true);
    try{
      [paidSeeds, actualA6] = await Promise.all([
        fetchPaidSeedsLastYear(),
        fetchActualAnnual6mWindow()
      ]);

      // Populate all dropdowns
      ensureMonthOptionsAll();

      // Wire Card 2 (Invoices month)
      initMonthSelect(els.incomeMonthSel, anchorMonth2, (dt) => { anchorMonth2 = dt; refreshCard2(); });
      initPrevNext(els.incomePrev, els.incomeNext, () => anchorMonth2, (dt) => {
        anchorMonth2 = dt;
        if (els.incomeMonthSel) els.incomeMonthSel.value = monthKey(dt);
        refreshCard2();
      });

      // Wire Card 4 (Invoices 5-month)
      initMonthSelect(els.inc5MonthSel, anchorMonth4, (dt) => { anchorMonth4 = dt; refreshCard4(); });

      // Make Card 2 rows open their PDF when clicked
      if (els.incomeMonthBody) {
        els.incomeMonthBody.addEventListener("click", (e) => {
          const tr = e.target.closest("tr[data-url]");
          if (tr && tr.dataset.url) {
            window.open(tr.dataset.url, "_blank", "noopener");
          }
        });
      }


      // Wire Card 1 (Expenses month) — no-op render for now; keeps the dropdown alive
      initMonthSelect(els.expMonthSel, anchorExp1, (dt) => { anchorExp1 = dt; /* hook your expenses-month render here if needed */ });
      initPrevNext(els.expPrev, els.expNext, () => anchorExp1, (dt) => {
        anchorExp1 = dt;
        if (els.expMonthSel) els.expMonthSel.value = monthKey(dt);
        // hook your expenses-month render here if needed
      });

      // Wire Card 3 (Expenses 5-month) — rebuild header when month changes
      initMonthSelect(els.exp5MonthSel, anchorExp3, (dt) => { anchorExp3 = dt; buildExpenses5Header(); /* and expenses 5m render if needed */ });

      // Initial paints
      buildExpenses5Header();
      refreshCard2();
      refreshCard4();
    } catch(e){
      console.error("[dues] init failed:", e);
      // still try to paint what we can
      buildExpenses5Header();
      refreshCard2();
      refreshCard4();
    } finally {
      setLoader(false);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
