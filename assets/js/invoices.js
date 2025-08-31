// assets/js/invoices.js — Invoices (monthly terms + service lines + Supabase)
import { sb } from './supabase.js';

const $ = (s, el=document) => el.querySelector(s);

// ====== Table ======
const tbody = $('#invoices-tbody') || $('#invoiceTable tbody');

// ====== Buttons & Modals ======
const newBtn       = $('#newInvoiceBtn');
const modal        = $('#invModal');
const closeBtn     = $('#invCloseBtn');
const cancelBtn    = $('#cancelInvBtn');
const clearBtn     = $('#clearInvoiceBtn');
const generateBtn  = $('#generateInvoiceBtn');

const successModal = $('#invSuccessModal');
const successClose = $('#successCloseBtn');
const successDone  = $('#successDoneBtn');
const pdfLinkA     = $('#pdfLink');
const docxLinkA    = $('#docxLink'); // still mocked

// ====== Form controls ======
const clientSel    = $('#invoiceClient');
const currencySel  = $('#invoiceCurrency');
const termsSel     = $('#invoiceTerms');      // monthly, 3m, 6m, annual, one_time
const startInput   = $('#serviceStart');
const endInput     = $('#serviceEnd');

const addServiceBtn= $('#addServiceBtn');
const serviceList  = $('#serviceList');
const subtotalLbl  = $('#subtotalLabel');

// Optional file input if/when you add it
const pdfInput     = $('#invoicePdf'); // may be null

// ====== Utils ======
function escapeHTML(s){ return (s ?? '').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtMoney(n, locale='en-US', cur='JOD'){
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(n||0));
}
function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function addDays(dateStr, days){ const d=new Date(dateStr||todayISO()); d.setDate(d.getDate()+Number(days||0)); return d.toISOString().slice(0,10); }
function addMonths(dateStr, months){
  const d = new Date(dateStr || todayISO());
  const day = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 0));
  if (d.getDate() < day) d.setDate(0); // end-of-month rollover
  return d.toISOString().slice(0,10);
}
function show(el){ el?.classList.add('show'); el?.setAttribute('aria-hidden','false'); }
function hide(el){ el?.classList.remove('show'); el?.setAttribute('aria-hidden','true'); }

function statusClassFor(s){
  switch ((s || '').toLowerCase()){
    case 'paid':        return 'ok';
    case 'not paid':    return 'due';
    case 'unpaid':      return 'due';
    case 'overdue':     return 'due';
    case 'due soon':    return 'warn';
    case 'sent':        return 'sent';
    case 'cancelled':   return 'null';
    case 'canceled':    return 'null';
    default:            return 'null';
  }
}
function openSelectDropdown(sel){
  if (typeof sel.showPicker === 'function') { sel.showPicker(); return; }
  sel.focus();
  sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  sel.click();
}
// Try safe variants until one satisfies the DB CHECK constraint
async function persistStatusToDb(id, desired){
  const candidates = [desired];
  if (desired === 'Not Paid') candidates.push('Not paid','Unpaid','Pending','Due');
  if (desired === 'Cancelled') candidates.push('Canceled');
  for (const val of candidates){
    const { error } = await sb.from('invoices').update({ status: val }).eq('id', id);
    if (!error) return { ok: true, value: val };
    if (!/invoices_status_check/i.test(error.message)) return { ok:false, error };
  }
  return { ok:false, error: new Error('Status value not allowed by database.') };
}

// ====== Clients dropdown ======
async function loadClientsForSelect(){
  if (!clientSel) return;
  const { data, error } = await sb.from('clients').select('id, client_no, name').order('name', { ascending: true });
  if (error){ console.error(error); return; }
  clientSel.innerHTML = (data||[]).map(c =>
    `<option value="${c.id}">${escapeHTML(c.client_no || '')}${c.client_no ? ' — ' : ''}${escapeHTML(c.name)}</option>`
  ).join('');
}

// ====== Invoices list ======
let invoices = [];
async function loadInvoices(){
  const { data, error } = await sb
    .from('invoices')
    .select(`
      id, invoice_no, client_id, issue_date, due_date, currency,
      subtotal, tax, total, status, coverage_period, pdf_path,
      clients!invoices_client_id_fkey ( name, client_no )
    `)
    .order('issue_date', { ascending: false });
  if (error){ console.error(error); return; }
  invoices = data || [];
  renderTable();
}

function renderTable(){
  if (!tbody) return;
  tbody.innerHTML = invoices.map(inv => {
    const c = inv.clients || {};
    const cur = inv.currency || 'JOD';
    const total = fmtMoney(inv.total ?? (Number(inv.subtotal||0) + Number(inv.tax||0)), undefined, cur);
    const statusClass = statusClassFor(inv.status);
    return `
      <tr>
        <td>${escapeHTML(c.client_no || '—')}</td>
        <td>${escapeHTML(c.name || '—')}</td>
        <td>${escapeHTML(inv.invoice_no || '—')}</td>
        <td>${inv.issue_date || '—'}</td>
        <td>${total}</td>
        <td>
          <span class="tag ${statusClass} status-pill" data-id="${inv.id}">
            ${escapeHTML(inv.status || '—')}
          </span>
        </td>
        <td>${escapeHTML(inv.coverage_period || '—')}</td>
        <td class="row-actions">
          <button class="mini view-invoice" data-id="${inv.id}">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ====== Service lines (desc + price) ======
function addServiceRow(desc='', price=''){
  if (!serviceList) return;
  const row=document.createElement('div');
  row.className='service-row';
  row.innerHTML=`
    <input type="text"   class="svc-desc"  placeholder="Service description" value="${escapeHTML(desc)}" />
    <input type="number" class="svc-price" placeholder="0.00" min="0" step="0.01" value="${escapeHTML(price)}" />
    <button class="remove-btn" type="button" title="Remove">−</button>
  `;
  serviceList.appendChild(row);
  row.querySelector('.svc-price')?.addEventListener('input', updateTotals);
  row.querySelector('.remove-btn')?.addEventListener('click', ()=>{ row.remove(); updateTotals(); });
  updateTotals();
}

function readServiceLines(){
  if (!serviceList) return [];
  return Array.from(serviceList.querySelectorAll('.service-row')).map(r=>{
    const desc  = r.querySelector('.svc-desc')?.value.trim() || '';
    const price = parseFloat(r.querySelector('.svc-price')?.value || '0');
    return { desc, price: Number.isFinite(price) ? price : 0 };
  }).filter(x => x.desc || x.price > 0);
}

function updateTotals(){
  const lines = readServiceLines();
  const subtotal = lines.reduce((s,l)=>s+(l.price||0),0);
  const cur = currencySel?.value || 'JOD';
  if (subtotalLbl) subtotalLbl.textContent = `${subtotal.toFixed(2)} ${cur}`;
}

// ====== Modal open/close ======
function openModal(){
  currencySel && (currencySel.value = 'JOD');
  termsSel && (termsSel.value = 'monthly');  // default term
  startInput && (startInput.value = todayISO());
  endInput && (endInput.value   = todayISO());
  if (serviceList && !serviceList.querySelector('.service-row')) addServiceRow();
  show(modal);
}
function closeModal(){ hide(modal); }

// ====== Storage: upload PDF if provided (optional) ======
async function uploadInvoicePdf(invoiceId, invoiceNo, file){
  if (!file) return { path: null, error: null };
  const safeNo = (invoiceNo || invoiceId).replace(/[^A-Za-z0-9_-]/g, '_');
  const path = `invoices/${safeNo}.pdf`;
  const { error } = await sb.storage.from('invoices').upload(path, file, {
    upsert: true, cacheControl: '3600', contentType: 'application/pdf'
  });
  return { path, error };
}

// ====== Save invoice ======
async function saveInvoice(){
  try{
    const client_id = clientSel?.value;
    if (!client_id){ alert('Please choose a client.'); return; }

    const issue_date = todayISO();

    // Map dropdown to label + months
    const termKey = termsSel?.value || 'monthly';
    const termMap = {
      monthly:  { label: 'Monthly',  months: 1 },
      '3m':     { label: '3 Months', months: 3 },
      '6m':     { label: '6 Months', months: 6 },
      annual:   { label: 'Annual',   months: 12 },
      one_time: { label: 'One time', months: 0 },
    };
    const term = termMap[termKey] || termMap.monthly;

    // Due date: add months (one_time = same day)
    const due_date = term.months > 0 ? addMonths(issue_date, term.months) : issue_date;

    // Required: service lines (for PDF text), though not stored
    const lines = readServiceLines();
    if (lines.length === 0) { alert('Add at least one service line.'); return; }

    // Coverage period shown in table/PDF = the payment term label
    const coverage_period = term.label;

    // Totals
    const currency = currencySel?.value || 'JOD';
    const subtotal = lines.reduce((s,l)=>s+(l.price||0),0);
    const tax      = 0;
    const total    = subtotal + tax;

    // 1) Insert invoice header (DB may compute total; we don't send it)
    const ins = await sb.from('invoices').insert([{
      client_id, issue_date, due_date, currency,
      subtotal, tax, status: 'Sent', coverage_period
    }]).select('id, invoice_no').single();

    if (ins.error){ console.error(ins.error); alert(ins.error.message); return; }
    const { id, invoice_no } = ins.data;

    // 2) Optional PDF upload
    if (pdfInput?.files?.[0]) {
      const { path, error } = await uploadInvoicePdf(id, invoice_no, pdfInput.files[0]);
      if (error){ console.error(error); alert(error.message); return; }
      const upd = await sb.from('invoices').update({ pdf_path: path }).eq('id', id);
      if (upd.error){ console.error(upd.error); alert(upd.error.message); return; }
    }

    // 3) Refresh list
    await loadInvoices();

    // 4) Show success modal
    hide(modal);
    show(successModal);
    // pdfLinkA.href = URL.createObjectURL(pdfBlob); pdfLinkA.download = `${invoice_no}.pdf`;
  }catch(e){
    console.error(e);
    alert(e.message || 'Failed to create invoice.');
  }
}

// ---- Inline status editor (click pill -> dropdown) ----
function buildStatusSelect(current){
  const wrap = document.createElement('div');
  wrap.className = 'select-wrap inline';
  const sel = document.createElement('select');
  sel.className = 'filter-select status-select';
  sel.innerHTML = `
    <option value="Paid">Paid</option>
    <option value="Not Paid">Not Paid</option>
    <option value="Cancelled">Cancelled</option>
  `;
  sel.value = ['Paid','Not Paid','Cancelled'].includes(current) ? current : 'Not Paid';
  wrap.appendChild(sel);
  return { wrap, sel };
}

async function applyStatusUpdate(pill, id, desired){
  const row  = invoices.find(x => x.id === id);
  const prev = row?.status || 'Sent';

  const res = await persistStatusToDb(id, desired);
  if (res.ok){
    const saved = res.value;
    if (row) row.status = saved;
    pill.textContent = saved;
    pill.className = `tag ${statusClassFor(saved)} status-pill`;
  } else {
    alert(res.error.message);
    pill.textContent = prev;
    pill.className = `tag ${statusClassFor(prev)} status-pill`;
  }
}

document.addEventListener('click', (e) => {
  const pill = e.target.closest('.status-pill');
  if (!pill) return;

  const id = pill.dataset.id;
  const current = pill.textContent.trim();
  const { wrap, sel } = buildStatusSelect(current);

  // swap in the select
  pill.style.display = 'none';
  pill.parentElement.insertBefore(wrap, pill.nextSibling);

  // one-click "button" feel
  sel.focus();
  openSelectDropdown(sel);

  const initial = sel.value;
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    pill.style.display = '';
  };

  sel.addEventListener('change', async () => {
    const newStatus = sel.value;
    cleanup();
    await applyStatusUpdate(pill, id, newStatus);
  });

  // If user picks the SAME option, close anyway
  sel.addEventListener('click', () => {
    setTimeout(() => {
      if (document.activeElement === sel && sel.value === initial) cleanup();
    }, 150);
  });

  // Esc/Enter behavior + blur
  sel.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') cleanup();
    if (ev.key === 'Enter') { const v = sel.value; cleanup(); applyStatusUpdate(pill, id, v); }
  });
  sel.addEventListener('blur', () => setTimeout(cleanup, 150));
});

// ====== View button (signed URL if pdf_path present) ======
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.view-invoice');
  if (!btn) return;
  const id = btn.dataset.id;
  const inv = invoices.find(x => x.id === id);
  if (!inv) return;

  if (!inv.pdf_path){ alert('No PDF linked to this invoice yet.'); return; }
  const { data, error } = await sb.storage.from('invoices').createSignedUrl(inv.pdf_path, 60*10);
  if (error){ console.error(error); alert(error.message); return; }
  window.open(data.signedUrl, '_blank');
});

// ====== Wire up ======
newBtn?.addEventListener('click', openModal);
closeBtn?.addEventListener('click', closeModal);
cancelBtn?.addEventListener('click', closeModal);
clearBtn?.addEventListener('click', () => {
  serviceList.innerHTML = '';
  subtotalLbl.textContent = '0.00';
  addServiceRow();
});
generateBtn?.addEventListener('click', (ev) => { ev.preventDefault(); saveInvoice(); });

successClose?.addEventListener('click', () => hide(successModal));
successDone?.addEventListener('click', () => hide(successModal));

// Maintain totals live
addServiceBtn?.addEventListener('click', (e) => { e.preventDefault(); addServiceRow(); });
serviceList?.addEventListener('input', (e) => {
  if (e.target.matches('.svc-price')) updateTotals();
});

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
  await loadClientsForSelect();
  await loadInvoices();
  if (serviceList && !serviceList.querySelector('.service-row')) addServiceRow(); // start with one
});
