/* ZAtech Invoices — Form modal + separate centered Success modal.
   - Keeps your table sort/filter.
   - Totals show currency and live-update.
   - On Generate: close form modal, open clean success modal.
*/

(() => {
  const $ = s => document.querySelector(s);

  /* ===== Table sort/filter (unchanged) ===== */
  const state = { sortKey: "date", sortDir: "desc", dateFilter: "all" };
  const table = $("#invoiceTable");
  const tbody = table?.querySelector("tbody");
  let originalRows = [];

  const parseCurrency = txt => Number(String(txt).replace(/[^0-9.-]/g, "")) || 0;
  const parseDate = txt => { const d = new Date(String(txt).trim() + "T00:00:00"); return isNaN(d) ? new Date(0) : d; };
  const statusRank = s => { const t = String(s).toLowerCase(); if (t.includes("paid")) return 4; if (t.includes("sent")) return 3; if (t.includes("due soon")) return 2; if (t.includes("overdue")) return 1; return 0; };
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
  function compareRows(a, b, key){ const va = cellValue(a, key), vb = cellValue(b, key); return va>vb?1:va<vb?-1:0; }
  function inDateRange(tr, filter){
    const d = parseDate(tr.children[3]?.textContent || "");
    if (String(d)==="Invalid Date") return false;
    const now = new Date(); const y = now.getFullYear();
    switch(filter){
      case "last30": { const s = new Date(now); s.setDate(now.getDate()-30); return d>=s && d<=now; }
      case "last90": { const s = new Date(now); s.setDate(now.getDate()-90); return d>=s && d<=now; }
      case "thisYear": return d.getFullYear()===y;
      case "y2024": return d.getFullYear()===2024;
      case "y2023": return d.getFullYear()===2023;
      case "y2022": return d.getFullYear()===2022;
      default: return true;
    }
  }
  function updateSortIndicators(){
    table?.querySelectorAll("thead th[data-sort]").forEach(th=>{
      const key=th.getAttribute("data-sort");
      const base = th.getAttribute("data-label") || th.textContent.replace(/[▲▼]/g,"").trim();
      th.setAttribute("data-label", base);
      th.textContent = (key===state.sortKey) ? base + (state.sortDir==="asc"?" ▲":" ▼") : base;
    });
  }
  function renderTableView(){
    if (!tbody) return;
    let rows = originalRows.filter(tr=>inDateRange(tr, state.dateFilter));
    rows.sort((a,b)=>compareRows(a,b,state.sortKey));
    if (state.sortDir==="desc") rows.reverse();
    const frag=document.createDocumentFragment(); rows.forEach(r=>frag.appendChild(r));
    tbody.innerHTML=""; tbody.appendChild(frag); updateSortIndicators();
  }

  /* ===== New Invoice form modal ===== */
  const readLS=(k,fb)=>{ try{const raw=localStorage.getItem(k); return raw?JSON.parse(raw):fb;}catch{return fb;} };
  const writeLS=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const fmt=n=>(typeof n==="number"?n:parseFloat(n||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const escapeHTML=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const todayISO=()=>{ const d=new Date(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${d.getFullYear()}-${m}-${day}`; };
  function nextInvoiceId(prefix="INV"){ const key="invoice_counter"; const n=(parseInt(localStorage.getItem(key)||"1000",10)||1000)+1; localStorage.setItem(key,`${n}`); const dt=new Date(); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,"0"); return `${prefix}-${y}${m}-${n}`; }

  // Form modal DOM
  const newBtn=$("#newInvoiceBtn");
  const invModal=$("#invModal");
  const invCloseBtn=$("#invCloseBtn");
  const cancelInvBtn=$("#cancelInvBtn");
  const invFormWrap=$("#invFormWrap");

  const clientSel=$("#invoiceClient");
  const currencySel=$("#invoiceCurrency");
  const termsSel=$("#invoiceTerms");
  const startInput=$("#serviceStart");
  const endInput=$("#serviceEnd");

  const addServiceBtn=$("#addServiceBtn");
  const serviceList=$("#serviceList");

  const clearBtn=$("#clearInvoiceBtn");
  const genBtn=$("#generateInvoiceBtn");

  const subtotalLabel=$("#subtotalLabel");
  const totalLabel=$("#totalLabel");

  // Success modal DOM
  const successModal=$("#invSuccessModal");
  const successCloseBtn=$("#successCloseBtn");
  const successDoneBtn=$("#successDoneBtn");
  const pdfLink=$("#pdfLink");
  const docxLink=$("#docxLink");

  let invoices = readLS("invoices", []);
  let clients  = readLS("clients", []);
  if (!Array.isArray(clients) || clients.length===0) {
    clients = [
      { id:"CL-001", name:"Acme LLC" },
      { id:"CL-002", name:"Riada Co" },
      { id:"CL-003", name:"Nasma Group" },
    ];
  }

  function openInvModal(){ resetForm(); invModal?.classList.add("show"); invModal?.setAttribute("aria-hidden","false"); }
  function closeInvModal(){ invModal?.classList.remove("show"); invModal?.setAttribute("aria-hidden","true"); }

  function openSuccessModal(){ successModal?.classList.add("show"); successModal?.setAttribute("aria-hidden","false"); }
  function closeSuccessModal(){ successModal?.classList.remove("show"); successModal?.setAttribute("aria-hidden","true"); }

  function resetForm(){
    if (invFormWrap) invFormWrap.style.display="";
    if (clientSel) clientSel.innerHTML = clients.map(c=>`<option value="${c.id}">${escapeHTML(c.name||"—")}</option>`).join("");
    if (currencySel) currencySel.value="JOD";
    if (termsSel) termsSel.value="30";
    if (startInput) startInput.value=todayISO();
    if (endInput) endInput.value=todayISO();
    if (serviceList) { serviceList.innerHTML=""; addServiceRow(); }
    updateTotals();
  }

  function addServiceRow(desc="", price=""){
    if (!serviceList) return;
    const row=document.createElement("div");
    row.className="service-row";
    row.innerHTML=`
      <input type="text" class="svc-desc" placeholder="Service description" value="${escapeHTML(desc)}" />
      <input type="number" class="svc-price" placeholder="0.00" min="0" step="0.01" value="${escapeHTML(price)}" />
      <button class="remove-btn" type="button" title="Remove">−</button>
    `;
    serviceList.appendChild(row);
    row.querySelector(".svc-price")?.addEventListener("input", updateTotals);
    row.querySelector(".remove-btn")?.addEventListener("click", ()=>{ row.remove(); updateTotals(); });
  }

  function readServiceLines(){
    if (!serviceList) return [];
    return Array.from(serviceList.querySelectorAll(".service-row")).map(r=>{
      const desc=r.querySelector(".svc-desc")?.value.trim()||"";
      const price=parseFloat(r.querySelector(".svc-price")?.value||"0");
      return { desc, price: isFinite(price)?price:0 };
    }).filter(x=>x.desc || x.price>0);
  }

  function updateTotals(){
    const lines=readServiceLines();
    const subtotal=lines.reduce((s,l)=>s+(l.price||0),0);
    const cur=currencySel?.value || "";
    if (subtotalLabel) subtotalLabel.textContent=`${fmt(subtotal)} ${cur}`;
    if (totalLabel)    totalLabel.textContent   =`${fmt(subtotal)} ${cur}`;
  }
  currencySel?.addEventListener("change", updateTotals);

  function makeInvoiceHTML(inv){
    const client=clients.find(c=>c.id===inv.clientId);
    const clientName=client?client.name:inv.clientId;
    const linesHTML=inv.lines.map(l=>`
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;">${escapeHTML(l.desc)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">${inv.currency} ${fmt(l.price)}</td>
      </tr>`).join("");
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${inv.id}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif; color:#111;">
  <div style="max-width:720px;margin:24px auto;">
    <h2>Invoice ${inv.id}</h2>
    <div><strong>Client:</strong> ${escapeHTML(clientName)}</div>
    <div><strong>Period:</strong> ${escapeHTML(inv.periodStart)} → ${escapeHTML(inv.periodEnd)}</div>
    <div><strong>Terms:</strong> Net ${inv.terms} • <strong>Currency:</strong> ${escapeHTML(inv.currency)}</div>
    <hr/>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr><th style="text-align:left;border-bottom:2px solid #111;padding:6px 8px;">Description</th><th style="text-align:right;border-bottom:2px solid #111;padding:6px 8px;">Amount</th></tr></thead>
      <tbody>
        ${linesHTML}
        <tr><td style="padding:8px 8px;text-align:right;"><strong>Total</strong></td><td style="padding:8px 8px;text-align:right;"><strong>${inv.currency} ${fmt(inv.total)}</strong></td></tr>
      </tbody>
    </table>
    <p style="margin-top:16px;opacity:.8;">Generated by ZAtech Portal • ${new Date().toLocaleString()}</p>
  </div>
</body></html>`;
  }
  const makeBlobUrl=(html,mime)=>{ const blob=new Blob([html],{type:mime||"text/html"}); return URL.createObjectURL(blob); };
  function generateFilesMock(inv){
    const html = makeInvoiceHTML(inv);
    return {
      pdfUrl: makeBlobUrl(html,"text/html"),
      docUrl: makeBlobUrl(html,"application/msword"),
    };
  }
  async function uploadToSupabaseTODO(inv, files){
    // TODO: upload to Supabase Storage and DB insert, return public URLs
    return { pdfUrl: files.pdfUrl, docUrl: files.docUrl };
  }

  /* ===== Wire up ===== */
  document.addEventListener("DOMContentLoaded", () => {
    if (table && tbody) {
      originalRows = Array.from(tbody.querySelectorAll("tr")).map(tr=>tr.cloneNode(true));
      table.querySelectorAll("thead th[data-sort]").forEach(th=>{
        th.style.cursor="pointer";
        th.addEventListener("click",()=>{
          const key=th.getAttribute("data-sort");
          if (state.sortKey===key) state.sortDir = state.sortDir==="asc"?"desc":"asc";
          else { state.sortKey=key; state.sortDir=(key==="date"||key==="amount")?"desc":"asc"; }
          renderTableView();
        });
      });
      $("#dateFilter")?.addEventListener("change", e=>{ state.dateFilter=e.target.value||"all"; renderTableView(); });
      renderTableView();
    }

    // Form modal open/close
    newBtn?.addEventListener("click", openInvModal);
    invCloseBtn?.addEventListener("click", closeInvModal);
    cancelInvBtn?.addEventListener("click", closeInvModal);
    $("#invModal")?.addEventListener("click", e=>{ if (e.target.id==="invModal") closeInvModal(); });
    document.addEventListener("keydown", e=>{ if (e.key==="Escape" && invModal?.classList.contains("show")) closeInvModal(); });

    // Success modal close
    successCloseBtn?.addEventListener("click", closeSuccessModal);
    successDoneBtn?.addEventListener("click", closeSuccessModal);
    $("#invSuccessModal")?.addEventListener("click", e=>{ if (e.target.id==="invSuccessModal") closeSuccessModal(); });

    addServiceBtn?.addEventListener("click", ()=>{ addServiceRow(); updateTotals(); });
    clearBtn?.addEventListener("click", ()=> resetForm());

    genBtn?.addEventListener("click", async () => {
      const clientId = clientSel?.value || "";
      const currency = currencySel?.value || "JOD";
      const terms = parseInt(termsSel?.value || "30", 10);
      const periodStart = startInput?.value || "";
      const periodEnd   = endInput?.value || "";
      const lines = readServiceLines();

      if (!clientId) return alert("Please choose a client.");
      if (!periodStart || !periodEnd) return alert("Please select service start and end dates.");
      if (lines.length === 0) return alert("Add at least one service line.");

      const prefix = (readLS("settings_v1", {})?.invoice?.prefix) || "INV";
      const id = nextInvoiceId(prefix);
      const total = lines.reduce((s,l)=>s+(l.price||0),0);

      const inv = { id, clientId, currency, terms, periodStart, periodEnd, lines, total, status:"Draft", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };

      const filesLocal = generateFilesMock(inv);
      const uploaded = await uploadToSupabaseTODO(inv, filesLocal);
      inv.files = { pdf: uploaded.pdfUrl, doc: uploaded.docUrl };

      const list = readLS("invoices", []); list.unshift(inv); writeLS("invoices", list);

      // switch to centered success modal
      closeInvModal();
      if (pdfLink){ pdfLink.href = inv.files.pdf; pdfLink.download = `${inv.id}.pdf`; }
      if (docxLink){ docxLink.href = inv.files.doc; docxLink.download = `${inv.id}.doc`; }
      openSuccessModal();
    });
  });
})();
