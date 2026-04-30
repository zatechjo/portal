// assets/js/invoices.js — Invoices (DOCX + proper PDF column & working PDF modal)
import { sb } from './supabase.js';

const $ = (s, el=document) => el.querySelector(s);
const DBG = (...args) => { if (window.DEBUG_INVOICES !== false) console.log('[invoices]', ...args); };

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
const docxLinkA    = $('#docxLink'); // success modal link

// ====== PDF Upload Modal (match invoices.html IDs) ======
const pdfModal  = $('#pdfModal');
const pdfForm   = $('#pdfForm');
const pdfFile   = $('#pdfFile');
const pdfSubmit = $('#pdfSubmit');
const pdfCancel = $('#pdfCancel');
const pdfBusy   = $('#pdfBusy');
const pdfMsg    = $('#pdfMsg');
let activePdfInvoiceId = null;

const progressModal = $('#invProgressModal');
const progressMsg   = $('#invProgressMsg');

// ====== Form controls ======
const clientSel    = $('#invoiceClient');
const currencySel  = $('#invoiceCurrency');
const termsSel     = $('#invoiceTerms');      // monthly, 3m, 6m, annual, one_time
const startInput   = $('#serviceStart');
const endInput     = $('#serviceEnd');

const addServiceBtn= $('#addServiceBtn');
const serviceList  = $('#serviceList');
const subtotalLbl  = $('#subtotalLabel');

// PDF options modal
const pdfOptionsModal = $('#pdfOptionsModal');
const pdfOptView      = $('#pdfOptView');
const pdfOptChange    = $('#pdfOptChange');
const pdfOptClose     = $('#pdfOptClose');

let lastClickedInvoiceId = null;
let lastClickedInvoiceNo = null;
let lastClickedClient    = null;

const pdfInvoiceIdInput = $('#pdfInvoiceId');

function cleanId(v){
  const s = (v ?? '').toString().trim();
  return (s && s !== 'undefined' && s !== 'null') ? s : '';
}



// --- FX: convert to USD for DB — uses shared topbar rates (window.PORTAL_FX_TO_USD) ---
function toUSD(amount, from = 'USD') {
  const rates = window.PORTAL_FX_TO_USD || { USD: 1, JOD: 1.41, EUR: 1.087, GBP: 1.333, SAR: 0.267, AED: 0.272 };
  const rate = rates[(from || 'USD').toUpperCase()] ?? 1;
  return Number(amount || 0) * rate;
}

// ===== Sorting state & utils =====
let sortState = { key: null, dir: 'asc' }; // dir: 'asc' | 'desc'

function getSortValue(inv, key) {
  const c = inv.clients || {};
  switch (key) {
    case 'clientId':   return c.client_no || '';
    case 'clientName': return c.name || '';
    case 'invoiceNo':  return Number(inv.invoice_no) || 0;
    case 'date':       return inv.issue_date ? new Date(inv.issue_date) : new Date(0);
    case 'amount':     return Number(inv.total ?? ((inv.subtotal||0) + (inv.tax||0))) || 0;
    case 'status':     return inv.status || '';
    case 'coverage':   return inv.coverage_period || '';
    case 'doc':        return inv.docx_url ? 1 : 0; // docs first if you click it
    case 'pdf':        return inv.pdf_url ? 1 : 0;  // pdfs first if you click it
    case 'note':       return inv.note || '';
    default:           return '';
  }
}

function updateSortIndicators(){
  const thead = document.querySelector('#invoiceTable thead');
  if (!thead) return;
  // clear old carets
  thead.querySelectorAll('.sort-caret').forEach(el => el.remove());
  thead.querySelectorAll('th').forEach(th => th.classList.remove('sorted'));

  if (!sortState.key) return; // nothing active yet

  const th = thead.querySelector(`th[data-sort="${sortState.key}"]`);
  if (!th) return;
  const caret = document.createElement('span');
  caret.className = 'sort-caret';
  caret.textContent = sortState.dir === 'desc' ? '▼' : '▲';
  th.appendChild(caret);
  th.classList.add('sorted');
}

// header click -> toggle sort
(function wireHeaderSorting(){
  const thead = document.querySelector('#invoiceTable thead');
  if (!thead) return;
  thead.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const key = th.getAttribute('data-sort');

    if (sortState.key === key) {
      // toggle direction
      sortState.dir = (sortState.dir === 'asc') ? 'desc' : 'asc';
    } else {
      sortState.key = key;
      sortState.dir = 'asc'; // fresh column starts asc
    }

    renderTable();
  });
})();


// ====== Utils ======
function escapeHTML(s){ return (s ?? '').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtMoney(n, locale='en-US', cur='USD'){
  if (window.fmtPortalMoney && window.PORTAL_FX_TO_USD) {
    const usd = Number(n || 0) * (window.PORTAL_FX_TO_USD[String(cur || 'USD').toUpperCase()] ?? 1);
    return window.fmtPortalMoney(usd);
  }
  return new Intl.NumberFormat(locale, { style:'currency', currency:cur, minimumFractionDigits:2, maximumFractionDigits:2 })
    .format(Number(n||0));
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function addMonths(dateStr, months){
  const d = new Date(dateStr || todayISO());
  const day = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 0));
  if (d.getDate() < day) d.setDate(0); // end-of-month rollover
  return d.toISOString().slice(0,10);
}
function fmtLongDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function show(el){
  if (!el) return;
  el.style.display = '';            // <-- clear any inline 'none'
  el.classList.add('show');
  el.setAttribute('aria-hidden','false');
}

function hide(el){ el?.classList.remove('show'); el?.setAttribute('aria-hidden','true'); }
function statusClassFor(s){
  const v = (s || '').toLowerCase();
  return (  
    v === 'paid' ? 'ok' :
    ['not paid','unpaid','overdue'].includes(v) ? 'due' :
    v === 'partial payment' ? 'partial' :       // new case
    v === 'due soon' ? 'warn' :
    v === 'sent' ? 'sent' :
    ['cancelled','canceled'].includes(v) ? 'null' : 'null'
  );
}
function statusLabelFor(s) {
  return String(s || '').toLowerCase() === 'partial payment' ? 'Partial' : (s || 'â€”');
}
function openSelectDropdown(sel){
  if (typeof sel.showPicker === 'function') { sel.showPicker(); return; }
  sel.focus();
  sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  sel.click();
}
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

// ====== Client filter dropdown (table filters) ======
async function loadClientsForFilter(){
  if (!clientFilter) return;

  const { data, error } = await sb
    .from('clients')
    .select('id, client_no, name')
    .order('name', { ascending: true });

  if (error){ console.error(error); return; }

  clientFilter.innerHTML =
    `<option value="all" selected>All Clients</option>` +
    (data || []).map(c =>
      `<option value="${c.id}">${escapeHTML(c.client_no || '')}${c.client_no ? ' — ' : ''}${escapeHTML(c.name)}</option>`
    ).join('');
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  });
}


// ====== Invoices list ======
let invoices = [];
let paymentsByInvoice = new Map();
let notesByInvoice = new Map();
let invoicePaymentsAvailable = true;
let invoiceNotesAvailable = true;
let activeDetailsId = null;
let pendingPaymentDelete = null;
let pendingNoteDelete = null;

function invoiceKey(id) {
  return String(id ?? '');
}

function invoiceTotalAmount(inv) {
  return Number(inv?.total ?? (Number(inv?.subtotal || 0) + Number(inv?.tax || 0))) || 0;
}

function getInvoicePayments(invoiceId) {
  return paymentsByInvoice.get(invoiceKey(invoiceId)) || [];
}

function getInvoiceNotes(invoiceId) {
  return notesByInvoice.get(invoiceKey(invoiceId)) || [];
}

function getInvoicePaidAmount(inv) {
  return getInvoicePayments(inv.id).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function getInvoicePaymentStats(inv) {
  const total = invoiceTotalAmount(inv);
  const paid = getInvoicePaidAmount(inv);
  const remaining = Math.max(total - paid, 0);
  const pct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
  return { total, paid, remaining, pct };
}

function findInvoicePayment(invoiceId, paymentId) {
  return getInvoicePayments(invoiceId).find(payment => invoiceKey(payment.id) === invoiceKey(paymentId));
}

function findInvoiceNote(invoiceId, noteId) {
  return getInvoiceNotes(invoiceId).find(note => invoiceKey(note.id) === invoiceKey(noteId));
}

function paymentDrivenStatus(inv) {
  const { total, paid } = getInvoicePaymentStats(inv);
  if (total > 0 && paid >= total - 0.005) return 'Paid';
  if (paid > 0) return 'Partial Payment';
  return inv.status || 'Not Paid';
}

function fmtPaymentDate(dateStr) {
  if (!dateStr) return 'No date';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadInvoicePaymentsFor(invoiceIds = []) {
  const ids = invoiceIds.map(invoiceKey).filter(Boolean);
  paymentsByInvoice = new Map();
  if (!ids.length || !invoicePaymentsAvailable) return;

  const { data, error } = await sb
    .from('invoice_payments')
    .select('id, invoice_id, amount, payment_date, note, created_at')
    .in('invoice_id', ids)
    .order('payment_date', { ascending: false });

  if (error) {
    invoicePaymentsAvailable = false;
    console.warn('[invoices] invoice_payments unavailable:', error.message || error);
    return;
  }

  (data || []).forEach((payment) => {
    const key = invoiceKey(payment.invoice_id);
    if (!paymentsByInvoice.has(key)) paymentsByInvoice.set(key, []);
    paymentsByInvoice.get(key).push(payment);
  });
}

async function loadInvoiceNotesFor(invoiceIds = []) {
  const ids = invoiceIds.map(invoiceKey).filter(Boolean);
  notesByInvoice = new Map();
  if (!ids.length || !invoiceNotesAvailable) return;

  const { data, error } = await sb
    .from('invoice_notes')
    .select('id, invoice_id, body, created_at')
    .in('invoice_id', ids)
    .order('created_at', { ascending: false });

  if (error) {
    invoiceNotesAvailable = false;
    console.warn('[invoices] invoice_notes unavailable:', error.message || error);
    return;
  }

  (data || []).forEach((note) => {
    const key = invoiceKey(note.invoice_id);
    if (!notesByInvoice.has(key)) notesByInvoice.set(key, []);
    notesByInvoice.get(key).push(note);
  });
}

async function setInvoiceStatusLocalAndDb(invoiceId, desiredStatus) {
  const res = await persistStatusToDb(invoiceId, desiredStatus);
  if (!res.ok) throw res.error || new Error('Could not update invoice status.');
  const inv = invoices.find(x => invoiceKey(x.id) === invoiceKey(invoiceId));
  if (inv) inv.status = res.value;
  return res.value;
}

async function refreshInvoicePaymentData(invoiceId, { deriveZeroStatus = false } = {}) {
  await loadInvoicePaymentsFor(invoices.map(inv => inv.id));
  const inv = invoices.find(x => invoiceKey(x.id) === invoiceKey(invoiceId));
  if (!inv) return;
  const paid = getInvoicePaidAmount(inv);
  const nextStatus = deriveZeroStatus && paid <= 0.005 ? 'Not Paid' : paymentDrivenStatus(inv);
  if (nextStatus !== inv.status && !['cancelled', 'canceled'].includes(String(inv.status || '').toLowerCase())) {
    try {
      await setInvoiceStatusLocalAndDb(invoiceId, nextStatus);
    } catch (error) {
      console.warn('[invoices] payment status sync failed:', error.message || error);
    }
  }
}

function paymentProgressHtml(inv, { compact = false } = {}) {
  const cur = inv.currency || 'USD';
  const { total, paid, remaining, pct } = getInvoicePaymentStats(inv);
  const percentLabel = `${Math.round(pct)}%`;
  const cls = compact ? 'invoice-pay-progress compact' : 'invoice-pay-progress';
  return `
    <div class="${cls}">
      <div class="invoice-pay-progress-head">
        <span>Paid ${fmtMoney(paid, undefined, cur)} / ${fmtMoney(total, undefined, cur)}</span>
        <strong>${percentLabel}</strong>
      </div>
      <div class="invoice-pay-bar" aria-label="Payment progress">
        <span style="width:${pct.toFixed(2)}%;"></span>
      </div>
    </div>
  `;
}

function invoicePaymentCellHtml(inv) {
  if (!invoicePaymentsAvailable) return '';
  const status = String(inv.status || '').toLowerCase();
  if (status !== 'partial payment') return '';
  return paymentProgressHtml(inv, { compact: true });
}

function shouldShowPaymentPanel(inv) {
  const status = String(inv.status || '').toLowerCase();
  const hasPayments = getInvoicePayments(inv.id).length > 0;
  return status === 'partial payment' || (status === 'paid' && hasPayments);
}

function paymentDrawerHtml(inv) {
  const cur = inv.currency || 'USD';
  const payments = getInvoicePayments(inv.id);
  const { total, paid, remaining } = getInvoicePaymentStats(inv);

  if (!invoicePaymentsAvailable) {
    return `
      <div class="invoice-payment-panel">
        <div class="invoice-panel-head">
          <div>
            <h4>Payments</h4>
            <p>Run supabase/invoice_payments.sql to enable payment history.</p>
          </div>
        </div>
      </div>
    `;
  }

  const history = payments.length
    ? payments.map(payment => {
      const hasNote = !!(payment.note && String(payment.note).trim());
      return `
        <div class="invoice-payment-history-item${hasNote ? '' : ' no-note'}">
          <div class="invoice-payment-history-main">
            <div class="invoice-payment-history-title">${fmtMoney(payment.amount, undefined, cur)}</div>
            ${hasNote ? `<div class="invoice-payment-history-meta">${escapeHTML(payment.note)}</div>` : ''}
          </div>
          <div class="invoice-payment-history-right">
            <div class="invoice-payment-date-chip">
              <span>Date</span>
              <strong>${fmtPaymentDate(payment.payment_date)}</strong>
            </div>
            <div class="invoice-payment-row-actions">
              <button type="button" class="pm-icon-btn pm-edit-btn invoice-payment-edit" data-invoice-id="${inv.id}" data-payment-id="${payment.id}" title="Edit payment" aria-label="Edit payment"><img src="./assets/img/edit.png" alt="" /></button>
              <button type="button" class="pm-icon-btn pm-del-btn invoice-payment-delete" data-invoice-id="${inv.id}" data-payment-id="${payment.id}" title="Delete payment" aria-label="Delete payment"><img src="./assets/img/bin.png" alt="" /></button>
            </div>
          </div>
        </div>
      `;
    }).join('')
    : '<div class="invoice-payment-empty">No payments recorded yet.</div>';

  return `
    <div class="invoice-payment-panel">
      <div class="invoice-panel-head">
        <div>
          <h4>Payment Progress</h4>
          <p>Track recorded payments against this invoice.</p>
        </div>
        <div class="invoice-payment-summary">
          <div><span>Paid</span><strong>${fmtMoney(paid, undefined, cur)}</strong></div>
          <div><span>Remaining</span><strong>${fmtMoney(remaining, undefined, cur)}</strong></div>
        </div>
      </div>
      ${paymentProgressHtml(inv)}
      <div class="invoice-payment-form" data-id="${inv.id}">
        <label class="invoice-money-input" aria-label="Amount paid">
          <span>$</span>
          <input class="pm-input invoice-payment-amount" data-id="${inv.id}" type="number" min="0" step="0.01" placeholder="0.00" />
          <span>USD</span>
        </label>
        <input class="pm-input invoice-payment-date" data-id="${inv.id}" type="date" value="${todayISO()}" />
        <input class="pm-input invoice-payment-note" data-id="${inv.id}" type="text" placeholder="Note or reference" />
        <button type="button" class="btn2 invoice-payment-save" data-id="${inv.id}">Add payment</button>
        <button type="button" class="btn2 invoice-payment-cancel-edit" data-id="${inv.id}" style="display:none;">Cancel</button>
      </div>
      <div class="invoice-payment-history">
        <div class="invoice-payment-history-label">Payment history</div>
        ${history}
      </div>
    </div>
  `;
}

function invoiceNotesPanelHtml(inv) {
  if (!invoiceNotesAvailable) return '';

  const notes = getInvoiceNotes(inv.id);
  const invoiceId = escapeHTML(inv.id);
  const noteItems = notes.length
    ? notes.map((note, index) => `
      <div class="invoice-note-item" data-note-id="${escapeHTML(note.id)}">
        <div class="invoice-note-item-main">
          <div class="invoice-note-index">Note ${notes.length - index}</div>
          <div class="invoice-note-item-text">${escapeHTML(note.body)}</div>
        </div>
        <div class="invoice-note-item-actions">
          <button type="button" class="pm-icon-btn pm-edit-btn invoice-note-edit" data-invoice-id="${invoiceId}" data-note-id="${escapeHTML(note.id)}" title="Edit note" aria-label="Edit note"><img src="./assets/img/edit.png" alt="" /></button>
          <button type="button" class="pm-icon-btn pm-del-btn invoice-note-delete" data-invoice-id="${invoiceId}" data-note-id="${escapeHTML(note.id)}" title="Delete note" aria-label="Delete note"><img src="./assets/img/bin.png" alt="" /></button>
        </div>
      </div>
    `).join('')
    : '<div class="invoice-notes-empty">No notes yet.</div>';

  return `
    <div class="invoice-note-block invoice-notes-panel" data-id="${invoiceId}">
      <div class="invoice-notes-top">
        <div class="invoice-note-panel-title">Notes</div>
        <button type="button" class="btn2 invoice-note-add-toggle" data-id="${invoiceId}">Add note</button>
      </div>
      <div class="invoice-note-form" data-id="${invoiceId}" style="display:none;">
        <textarea class="note-textarea invoice-note-input" data-id="${invoiceId}" rows="3" placeholder="Write a note..."></textarea>
        <div class="invoice-note-form-actions">
          <button type="button" class="btn2 invoice-note-save" data-id="${invoiceId}">Add note</button>
          <button type="button" class="btn2 invoice-note-cancel" data-id="${invoiceId}">Cancel</button>
        </div>
      </div>
      <div class="invoice-notes-list${notes.length > 2 ? ' is-scrollable' : ''}">
        ${noteItems}
      </div>
    </div>
  `;
}

function ensurePaymentDeleteModal() {
  let modalEl = document.getElementById('invoicePaymentDeleteModal');
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.id = 'invoicePaymentDeleteModal';
  modalEl.className = 'modal';
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.innerHTML = `
    <div class="modal-content invoice-payment-delete-modal">
      <h3>Delete payment?</h3>
      <p id="invoicePaymentDeleteText">This payment will be removed from the invoice history.</p>
      <div class="modal-actions">
        <button type="button" class="btn2 btn-danger" id="invoicePaymentDeleteConfirm">Delete</button>
        <button type="button" class="btn2" id="invoicePaymentDeleteCancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector('#invoicePaymentDeleteCancel')?.addEventListener('click', closePaymentDeleteModal);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closePaymentDeleteModal();
  });
  modalEl.querySelector('#invoicePaymentDeleteConfirm')?.addEventListener('click', confirmPaymentDelete);
  return modalEl;
}

function openPaymentDeleteModal(invoiceId, paymentId) {
  const inv = invoices.find(x => invoiceKey(x.id) === invoiceKey(invoiceId));
  const payment = findInvoicePayment(invoiceId, paymentId);
  if (!inv || !payment) return;

  pendingPaymentDelete = { invoiceId, paymentId };
  const modalEl = ensurePaymentDeleteModal();
  const text = modalEl.querySelector('#invoicePaymentDeleteText');
  if (text) {
    text.textContent = `Delete ${fmtMoney(payment.amount, undefined, inv.currency || 'USD')} from ${fmtPaymentDate(payment.payment_date)}? This cannot be undone.`;
  }
  show(modalEl);
}

function closePaymentDeleteModal() {
  const modalEl = document.getElementById('invoicePaymentDeleteModal');
  pendingPaymentDelete = null;
  hide(modalEl);
}

async function confirmPaymentDelete() {
  if (!pendingPaymentDelete) return;
  const { invoiceId, paymentId } = pendingPaymentDelete;
  const btn = document.getElementById('invoicePaymentDeleteConfirm');

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Deleting...';
    }
    const { error } = await sb.from('invoice_payments').delete().eq('id', paymentId);
    if (error) throw error;

    closePaymentDeleteModal();
    activeDetailsId = invoiceKey(invoiceId);
    await refreshInvoicePaymentData(invoiceId, { deriveZeroStatus: true });
    renderTable();
  } catch (err) {
    console.error('[invoices] delete payment failed:', err);
    alert(err.message || 'Failed to delete payment.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Delete';
    }
  }
}

function ensureNoteDeleteModal() {
  let modalEl = document.getElementById('invoiceNoteDeleteModal');
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.id = 'invoiceNoteDeleteModal';
  modalEl.className = 'modal';
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.innerHTML = `
    <div class="modal-content invoice-note-delete-modal">
      <h3>Delete note?</h3>
      <p id="invoiceNoteDeleteText">This note will be removed from the invoice.</p>
      <div class="modal-actions">
        <button type="button" class="btn2 btn-danger" id="invoiceNoteDeleteConfirm">Delete</button>
        <button type="button" class="btn2" id="invoiceNoteDeleteCancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector('#invoiceNoteDeleteCancel')?.addEventListener('click', closeNoteDeleteModal);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeNoteDeleteModal();
  });
  modalEl.querySelector('#invoiceNoteDeleteConfirm')?.addEventListener('click', confirmNoteDelete);
  return modalEl;
}

function openNoteDeleteModal(invoiceId, noteId) {
  const note = findInvoiceNote(invoiceId, noteId);
  if (!note) return;

  pendingNoteDelete = { invoiceId, noteId };
  const modalEl = ensureNoteDeleteModal();
  const text = modalEl.querySelector('#invoiceNoteDeleteText');
  if (text) {
    const body = String(note.body || '').trim();
    const preview = body.length > 80 ? `${body.slice(0, 80)}...` : body;
    text.textContent = preview
      ? `Delete "${preview}"? This cannot be undone.`
      : 'Delete this note? This cannot be undone.';
  }
  show(modalEl);
}

function closeNoteDeleteModal() {
  const modalEl = document.getElementById('invoiceNoteDeleteModal');
  pendingNoteDelete = null;
  hide(modalEl);
}

async function confirmNoteDelete() {
  if (!pendingNoteDelete) return;
  const { invoiceId, noteId } = pendingNoteDelete;
  const btn = document.getElementById('invoiceNoteDeleteConfirm');

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Deleting...';
    }
    const { error } = await sb.from('invoice_notes').delete().eq('id', noteId);
    if (error) throw error;

    closeNoteDeleteModal();
    activeDetailsId = invoiceKey(invoiceId);
    await loadInvoiceNotesFor(invoices.map(inv => inv.id));
    renderTable();
  } catch (err) {
    console.error('[invoices] delete note failed:', err);
    alert(err.message || 'Failed to delete note.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Delete';
    }
  }
}

async function loadInvoices(){
  const { data, error } = await sb
    .from('invoices')
    // In loadInvoices() .select(...) add note
    .select(`
      id, invoice_no, client_id, issue_date, due_date, currency,
      subtotal, tax, total, status, coverage_period, docx_url, pdf_url, note,
      clients!invoices_client_id_fkey ( name, client_no )
    `)

    .order('invoice_no', { ascending: false });
  if (error){ console.error(error); return; }
  invoices = data || [];
  const invoiceIds = invoices.map(inv => inv.id);
  await Promise.all([
    loadInvoicePaymentsFor(invoiceIds),
    loadInvoiceNotesFor(invoiceIds),
  ]);
  renderTable();
}


function renderTable(){
  if (!tbody) return;

  // Start from data
  let rows = [...invoices];

  // Apply active sort (if any)
  if (sortState.key) {
    const dir = sortState.dir === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const va = getSortValue(a, sortState.key);
      const vb = getSortValue(b, sortState.key);

      // numbers vs strings
      const na = typeof va === 'number' ? va : Number.NaN;
      const nb = typeof vb === 'number' ? vb : Number.NaN;

      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        return (na - nb) * dir;
      }
      // Dates
      if (va instanceof Date && vb instanceof Date) {
        return (va - vb) * dir;
      }
      // Fallback string compare (case-insensitive)
      const sa = (va ?? '').toString().toLowerCase();
      const sb = (vb ?? '').toString().toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return  1 * dir;
      return 0;
    });
  }

  tbody.innerHTML = rows.map(inv => {
    const c = inv.clients || {};
    const cur = inv.currency || 'USD';
    const total = fmtMoney(
      inv.total ?? (Number(inv.subtotal||0) + Number(inv.tax||0)),
      undefined,
      cur
    );
    const statusClass = statusClassFor(inv.status);
    const hasNote = !!(inv.note && String(inv.note).trim());

    const docCellHtml = inv.docx_url
      ? `<a class="mini" href="${inv.docx_url}" target="_blank" rel="noopener">View</a>`
      : `<button type="button" class="mini view-invoice" data-id="${inv.id}">View</button>`;

    const pdfCellHtml = inv.pdf_url
      ? `<button type="button" class="mini pdf-options" data-id="${inv.id}"
          style="background:#d32f2f;color:#fff;border:0;">View PDF</button>`
      : `<button type="button" class="mini pdf-upload" data-id="${inv.id}"
          style="background:#e58d00;color:#fff;border:0;">Upload PDF +</button>`;



    return `
      <tr class="inv-row" data-id="${inv.id}">
        <td>${escapeHTML(c.client_no || '—')}</td>
        <td>${escapeHTML(c.name || '—')}</td>
        <td>${escapeHTML(inv.invoice_no || '—')}</td>
        <td>${fmtDate(inv.issue_date)}</td>
        <td>${total}</td>
        <td><span class="tag ${statusClass} status-pill" data-id="${inv.id}">${escapeHTML(inv.status || '—')}</span></td>
        <td>${escapeHTML(inv.coverage_period || '—')}</td>
        <td class="doc-actions">${docCellHtml}</td>
        <td class="pdf-actions">${pdfCellHtml}</td>
        <td style="text-align:center;">
          <button type="button" class="inv-mini-btn" data-id="${inv.id}" aria-expanded="false"><span>+</span></button>
        </td>
      </tr>

      <!-- Details row -->
      <tr class="inv-details" data-id="${inv.id}" style="display:none;">
        <td colspan="10" class="details-cell">
          <div class="invoice-note-block">

            <!-- Header: Title + action button -->
            <div class="note-header">
              <div class="note-title"
                  data-id="${inv.id}"
                  data-title="Notes for &quot;${escapeHTML(c.name || 'Client')}&quot; — Invoice ${escapeHTML(inv.invoice_no || '')}">
                ${escapeHTML(inv.note || 'No note yet.')}
              </div>
              <div class="note-actions" data-kind="note-actions">
                ${
                  inv.note && inv.note.trim()
                    ? `<button type="button" class="btn-note btn-note--ghost note-edit-btn" data-id="${inv.id}">Edit</button>`
                    : `<button type="button" class="btn-note btn-note--ghost note-new-btn"  data-id="${inv.id}">Write new</button>`
                }
              </div>
            </div>



            <!-- Editor (hidden until editing) -->
            <div class="note-edit-wrap" data-id="${inv.id}" style="display:none;">
              <textarea class="note-textarea" data-id="${inv.id}" rows="4"></textarea>
            </div>

            <!-- Footer (hidden until editing) -->
            <div class="note-footer" data-id="${inv.id}" style="display:none;">
              <div class="note-sub">Single note per invoice. Saving overwrites it.</div>
              <div class="note-buttons">
                <button type="button" class="btn-note btn-note--danger note-cancel-btn" data-id="${inv.id}">Cancel</button>
                <button type="button" class="btn-note btn-note--primary note-save-btn"  data-id="${inv.id}">Save</button>
              </div>
            </div>

          </div>
        </td>
      </tr>
    `;
  }).join('');

  rows.forEach((inv) => {
    const key = invoiceKey(inv.id);
    const statusCell = tbody.querySelector(`tr.inv-row[data-id="${inv.id}"] td:nth-child(6)`);
    const pill = statusCell?.querySelector('.status-pill');
    if (!statusCell || !pill) return;
    pill.textContent = statusLabelFor(inv.status);
    pill.dataset.value = inv.status || '';
    const stack = document.createElement('div');
    stack.className = 'invoice-status-stack';
    stack.appendChild(pill);
    const paymentCell = invoicePaymentCellHtml(inv);
    if (paymentCell) stack.insertAdjacentHTML('beforeend', paymentCell);
    statusCell.replaceChildren(stack);

    const detailsRow = tbody.querySelector(`tr.inv-details[data-id="${inv.id}"]`);
    const detailsCell = detailsRow?.querySelector('.details-cell');
    const noteBlock = detailsCell?.querySelector('.invoice-note-block');
    let notePanel = noteBlock;

    if (detailsCell && noteBlock && invoiceNotesAvailable) {
      const shell = document.createElement('div');
      shell.innerHTML = invoiceNotesPanelHtml(inv).trim();
      const multiNotePanel = shell.firstElementChild;
      if (multiNotePanel) {
        noteBlock.replaceWith(multiNotePanel);
        notePanel = multiNotePanel;
      }
    } else if (noteBlock && !noteBlock.querySelector('.invoice-note-panel-title')) {
      noteBlock.insertAdjacentHTML('afterbegin', '<div class="invoice-note-panel-title">Notes</div>');
    }

    if (detailsCell && notePanel && shouldShowPaymentPanel(inv)) {
      const drawer = document.createElement('div');
      drawer.className = 'invoice-actions-drawer';
      drawer.innerHTML = paymentDrawerHtml(inv);
      drawer.appendChild(notePanel);
      detailsCell.replaceChildren(drawer);
    }

    if (detailsRow && activeDetailsId === key) {
      detailsRow.style.display = '';
      const btn = tbody.querySelector(`.inv-mini-btn[data-id="${inv.id}"]`);
      if (btn) {
        btn.innerHTML = '<span>-</span>';
        btn.classList.add('inv-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    }
  });

  updateSortIndicators();
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

const statusFilter = document.getElementById('statusFilter');
const clientFilter = document.getElementById('clientFilter'); // NEW
const dateFilter = document.getElementById('dateFilter');

async function applyFilters() {
  // ---- Date window ----
  let from = null, to = null;
  const today = new Date();

  switch (dateFilter?.value) {
    case 'last30':
      from = new Date(today); from.setDate(from.getDate() - 30);
      break;
    case 'last90':
      from = new Date(today); from.setDate(from.getDate() - 90);
      break;
    case 'thisYear':
      from = new Date(today.getFullYear(), 0, 1);
      break;
    case 'y2025':
      from = new Date(2025, 0, 1);
      to   = new Date(2026, 0, 1);
      break;
    case 'y2024':
      from = new Date(2024, 0, 1);
      to   = new Date(2025, 0, 1);
      break;
    case 'y2023':
      from = new Date(2023, 0, 1);
      to   = new Date(2024, 0, 1);
      break;
    case 'y2022':
      from = new Date(2022, 0, 1);
      to   = new Date(2023, 0, 1);
      break;
  }

  // ---- Build query ----
  let query = sb.from('invoices').select(`
      id, invoice_no, client_id, issue_date, due_date, currency,
      subtotal, tax, total, status, coverage_period, docx_url, pdf_url, note,
      clients!invoices_client_id_fkey ( name, client_no )
    `).order('invoice_no', { ascending: false });

  if (from) query = query.gte('issue_date', from.toISOString().slice(0,10));
  if (to)   query = query.lt('issue_date',  to.toISOString().slice(0,10));

  // ---- Status constraint ----
  const wanted = statusFilter?.value || 'all';
  if (wanted !== 'all') query = query.eq('status', wanted);

  // ---- Client constraint (MUST be before await) ----
  const clientWanted = clientFilter?.value || 'all';
  if (clientWanted !== 'all') query = query.eq('client_id', clientWanted);

  const { data, error } = await query;
  if (error) { console.error(error); return; }

  invoices = data || [];
  const invoiceIds = invoices.map(inv => inv.id);
  await Promise.all([
    loadInvoicePaymentsFor(invoiceIds),
    loadInvoiceNotesFor(invoiceIds),
  ]);
  renderTable();
}


// Run when either filter changes
statusFilter?.addEventListener('change', applyFilters);
clientFilter?.addEventListener('change', applyFilters); // NEW
dateFilter  ?.addEventListener('change', applyFilters);



// ====== Modal open/close ======
function openModal(){
  currencySel && (currencySel.value = 'USD');
  termsSel && (termsSel.value = 'monthly');
  startInput && (startInput.value = todayISO());
  endInput && (endInput.value   = todayISO());
  if (serviceList && !serviceList.querySelector('.service-row')) addServiceRow();
  show(modal);
}
function closeModal(){ hide(modal); }

// ====== Load templating libs (PizZip + Docxtemplater only) ======
function loadScriptOnceExact(src) {
  return new Promise((resolve, reject) => {
    const already = [...document.scripts].some(s => s.src === src);
    if (already) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

// Toggle the per-row details (accordion style: only one open at a time)
tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".inv-mini-btn");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const detailsRow = tbody.querySelector(`tr.inv-details[data-id="${id}"]`);
  if (!detailsRow) return;

  const isOpen = detailsRow.style.display !== "none";

  // 1) Close all open rows
  tbody.querySelectorAll("tr.inv-details").forEach(row => row.style.display = "none");
  tbody.querySelectorAll(".inv-mini-btn").forEach(b => {
    b.innerHTML = "<span>+</span>";
    b.classList.remove("inv-open");
    b.setAttribute("aria-expanded", "false");
  });

  // 2) Open this one if it was closed
  if (!isOpen) {
    activeDetailsId = invoiceKey(id);
    detailsRow.style.display = "";
    btn.innerHTML = "<span>−</span>";
    btn.classList.add("inv-open");
    btn.setAttribute("aria-expanded", "true");
  } else {
    activeDetailsId = null;
  }
});


function setEditMode(id, on, isNew=false){
  const editWrap = tbody.querySelector(`.note-edit-wrap[data-id="${id}"]`);
  const footer   = tbody.querySelector(`.note-footer[data-id="${id}"]`);
  const ta       = tbody.querySelector(`.note-textarea[data-id="${id}"]`);
  const headerEl = tbody.querySelector(`.note-title[data-id="${id}"]`);
  if (!editWrap || !footer || !ta || !headerEl) return;

  if (on) {
    const inv = invoices.find(x => String(x.id) === String(id));
    ta.value = isNew ? "" : (inv?.note || "");
    editWrap.style.display = "";
    footer.style.display   = "";
    // swap header to edit-mode title
    if (headerEl.dataset.title) {
      headerEl.textContent = headerEl.dataset.title;
    }
  } else {
    editWrap.style.display = "none";
    footer.style.display   = "none";
    // restore header back to note text
    const inv = invoices.find(x => String(x.id) === String(id));
    headerEl.textContent = (inv?.note && inv.note.trim()) ? inv.note : "No note yet.";
  }
}


function refreshNoteActionButton(id){
  const inv = invoices.find(x => String(x.id) === String(id));
  const actions = tbody.querySelector(`tr.inv-details[data-id="${id}"] .note-actions[data-kind="note-actions"]`);
  if (!actions) return;
  const hasNote = !!(inv?.note && String(inv.note).trim());
  actions.innerHTML = hasNote
    ? `<button type="button" class="btn-note btn-note--ghost note-edit-btn" data-id="${id}">Edit</button>`
    : `<button type="button" class="btn-note btn-note--ghost note-new-btn"  data-id="${id}">Write new</button>`;
}

function openInvoiceNoteForm(invoiceId, { noteId = '', body = '' } = {}) {
  const form = tbody.querySelector(`.invoice-note-form[data-id="${invoiceId}"]`);
  const textarea = tbody.querySelector(`.invoice-note-input[data-id="${invoiceId}"]`);
  const saveBtn = tbody.querySelector(`.invoice-note-save[data-id="${invoiceId}"]`);
  const list = tbody.querySelector(`.invoice-notes-panel[data-id="${invoiceId}"] .invoice-notes-list`);
  if (!form || !textarea || !saveBtn) return;

  form.style.display = '';
  if (list) list.style.display = 'none';
  textarea.value = body;
  textarea.focus();
  if (noteId) {
    saveBtn.dataset.noteId = noteId;
    saveBtn.textContent = 'Save note';
  } else {
    delete saveBtn.dataset.noteId;
    saveBtn.textContent = 'Add note';
  }
}

function closeInvoiceNoteForm(invoiceId) {
  const form = tbody.querySelector(`.invoice-note-form[data-id="${invoiceId}"]`);
  const textarea = tbody.querySelector(`.invoice-note-input[data-id="${invoiceId}"]`);
  const saveBtn = tbody.querySelector(`.invoice-note-save[data-id="${invoiceId}"]`);
  const list = tbody.querySelector(`.invoice-notes-panel[data-id="${invoiceId}"] .invoice-notes-list`);
  if (textarea) textarea.value = '';
  if (saveBtn) {
    delete saveBtn.dataset.noteId;
    saveBtn.textContent = 'Add note';
  }
  if (form) form.style.display = 'none';
  if (list) list.style.display = '';
}



// Enter edit mode (prefill with existing note)
tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".note-edit-btn");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  setEditMode(id, true, false);
});

// Start a fresh note (empty textarea)
tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".note-new-btn");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  setEditMode(id, true, true);
});

// Cancel edit
tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".note-cancel-btn");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  setEditMode(id, false);
  refreshNoteActionButton(id);
});

// Save note
// Save note
tbody?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".note-save-btn");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const ta = tbody.querySelector(`.note-textarea[data-id="${id}"]`);
  // support either old ".note-view" or new header ".note-title"
  const viewEl =
    tbody.querySelector(`.note-title[data-id="${id}"]`) ||
    tbody.querySelector(`.note-view[data-id="${id}"]`);
  if (!ta || !viewEl) return;


  const text = ta.value.trim();

  try{
    const { error } = await sb.from("invoices").update({ note: text }).eq("id", id);
    if (error) throw error;

    // update local cache
    const idx = invoices.findIndex(x => String(x.id) === String(id));
    if (idx >= 0) invoices[idx].note = text;

    // reflect in UI
    viewEl.textContent = text || "No note yet.";
    viewEl.style.opacity = text ? "" : ".7";

    // instantly swap "Write new" ↔ "Edit"
    refreshNoteActionButton(id);

    // exit edit mode
    setEditMode(id, false);
  }catch(err){
    alert(err.message || "Failed to save note.");
  }
});

tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".invoice-note-add-toggle");
  if (!btn) return;
  if (!invoiceNotesAvailable) {
    alert("Multiple notes are not enabled yet. Run supabase/invoice_notes.sql first.");
    return;
  }
  openInvoiceNoteForm(btn.dataset.id);
});

tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".invoice-note-cancel");
  if (!btn) return;
  closeInvoiceNoteForm(btn.dataset.id);
});

tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".invoice-note-edit");
  if (!btn) return;
  const invoiceId = btn.dataset.invoiceId;
  const noteId = btn.dataset.noteId;
  const note = findInvoiceNote(invoiceId, noteId);
  if (!note) return;
  openInvoiceNoteForm(invoiceId, { noteId, body: note.body || '' });
});

tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".invoice-note-delete");
  if (!btn) return;
  openNoteDeleteModal(btn.dataset.invoiceId, btn.dataset.noteId);
});

tbody?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".invoice-note-save");
  if (!btn) return;
  const invoiceId = btn.dataset.id;
  const textarea = tbody.querySelector(`.invoice-note-input[data-id="${invoiceId}"]`);
  const noteId = btn.dataset.noteId || '';
  const body = textarea?.value.trim() || '';

  if (!invoiceNotesAvailable) {
    alert("Multiple notes are not enabled yet. Run supabase/invoice_notes.sql first.");
    return;
  }
  if (!body) {
    alert("Write a note before saving.");
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Saving...';
    const { error } = noteId
      ? await sb.from('invoice_notes').update({ body }).eq('id', noteId)
      : await sb.from('invoice_notes').insert({ invoice_id: invoiceKey(invoiceId), body });
    if (error) throw error;

    activeDetailsId = invoiceKey(invoiceId);
    await loadInvoiceNotesFor(invoices.map(inv => inv.id));
    renderTable();
  } catch (err) {
    console.error('[invoices] save note failed:', err);
    alert(err.message || 'Failed to save note.');
  } finally {
    btn.disabled = false;
    btn.textContent = noteId ? 'Save note' : 'Add note';
  }
});

tbody?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".invoice-payment-save");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const inv = invoices.find(x => invoiceKey(x.id) === invoiceKey(id));
  if (!inv) return;
  if (!invoicePaymentsAvailable) {
    alert("Payment history is not enabled yet. Run supabase/invoice_payments.sql first.");
    return;
  }

  const amountInput = tbody.querySelector(`.invoice-payment-amount[data-id="${id}"]`);
  const dateInput = tbody.querySelector(`.invoice-payment-date[data-id="${id}"]`);
  const noteInput = tbody.querySelector(`.invoice-payment-note[data-id="${id}"]`);
  const editPaymentId = btn.dataset.editPaymentId || '';
  const editingPayment = editPaymentId ? findInvoicePayment(id, editPaymentId) : null;
  const amount = Number(amountInput?.value || 0);
  const paymentDate = dateInput?.value || todayISO();
  const note = noteInput?.value.trim() || null;
  const { remaining } = getInvoicePaymentStats(inv);
  const maxAllowed = remaining + Number(editingPayment?.amount || 0);

  if (!editingPayment && remaining <= 0.005) {
    alert("This invoice is already fully paid.");
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Enter a payment amount greater than 0.");
    return;
  }
  if (amount > maxAllowed + 0.005) {
    alert("Payment amount is higher than the remaining invoice balance.");
    return;
  }
  if (!paymentDate) {
    alert("Choose a payment date.");
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Saving...";
    const payload = { amount, payment_date: paymentDate, note };
    const { error } = editingPayment
      ? await sb.from("invoice_payments").update(payload).eq("id", editPaymentId)
      : await sb.from("invoice_payments").insert({ invoice_id: invoiceKey(id), ...payload });
    if (error) throw error;

    activeDetailsId = invoiceKey(id);
    await refreshInvoicePaymentData(id);
    renderTable();
  } catch (err) {
    console.error("[invoices] save payment failed:", err);
    alert(err.message || "Failed to save payment.");
  } finally {
    btn.disabled = false;
    btn.textContent = btn.dataset.editPaymentId ? "Save payment" : "Add payment";
  }
});

tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".invoice-payment-edit");
  if (!btn) return;
  const invoiceId = btn.dataset.invoiceId;
  const paymentId = btn.dataset.paymentId;
  const payment = findInvoicePayment(invoiceId, paymentId);
  if (!payment) return;

  const amountInput = tbody.querySelector(`.invoice-payment-amount[data-id="${invoiceId}"]`);
  const dateInput = tbody.querySelector(`.invoice-payment-date[data-id="${invoiceId}"]`);
  const noteInput = tbody.querySelector(`.invoice-payment-note[data-id="${invoiceId}"]`);
  const saveBtn = tbody.querySelector(`.invoice-payment-save[data-id="${invoiceId}"]`);
  const cancelBtn = tbody.querySelector(`.invoice-payment-cancel-edit[data-id="${invoiceId}"]`);

  if (amountInput) amountInput.value = Number(payment.amount || 0).toFixed(2);
  if (dateInput) dateInput.value = payment.payment_date || todayISO();
  if (noteInput) noteInput.value = payment.note || '';
  if (saveBtn) {
    saveBtn.dataset.editPaymentId = paymentId;
    saveBtn.textContent = "Save payment";
  }
  if (cancelBtn) cancelBtn.style.display = "";
});

tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".invoice-payment-delete");
  if (!btn) return;
  openPaymentDeleteModal(btn.dataset.invoiceId, btn.dataset.paymentId);
});

tbody?.addEventListener("click", (e) => {
  const btn = e.target.closest(".invoice-payment-cancel-edit");
  if (!btn) return;
  const invoiceId = btn.dataset.id;
  const amountInput = tbody.querySelector(`.invoice-payment-amount[data-id="${invoiceId}"]`);
  const dateInput = tbody.querySelector(`.invoice-payment-date[data-id="${invoiceId}"]`);
  const noteInput = tbody.querySelector(`.invoice-payment-note[data-id="${invoiceId}"]`);
  const saveBtn = tbody.querySelector(`.invoice-payment-save[data-id="${invoiceId}"]`);

  if (amountInput) amountInput.value = "";
  if (dateInput) dateInput.value = todayISO();
  if (noteInput) noteInput.value = "";
  if (saveBtn) {
    delete saveBtn.dataset.editPaymentId;
    saveBtn.textContent = "Add payment";
  }
  btn.style.display = "none";
});

tbody?.addEventListener("click", (e) => {
  const input = e.target.closest(".invoice-payment-date");
  if (!input) return;
  input.focus();
  if (typeof input.showPicker === "function") {
    try { input.showPicker(); } catch (_) {}
  }
});




// Close options
pdfOptClose?.addEventListener('click', () => hide(pdfOptionsModal));

// View (red)
pdfOptView?.addEventListener('click', () => {
  if (!activePdfInvoiceId) return;
  const inv = invoices.find(x => String(x.id) === String(activePdfInvoiceId));
  if (!inv?.pdf_url) { alert('No PDF linked to this invoice yet.'); return; }
  window.open(inv.pdf_url, '_blank');
});

// Change (yellow) -> opens upload modal
pdfOptChange?.addEventListener('click', () => {
  const rowId = cleanId(activePdfInvoiceId || pdfForm?.dataset?.invoiceId || lastClickedInvoiceId);
  if (!rowId) { alert('No invoice selected.'); return; }

  hide(pdfOptionsModal); // ensure only one modal is visible

  if (pdfMsg)  pdfMsg.textContent = '';
  if (pdfFile) pdfFile.value = '';
  if (pdfBusy) pdfBusy.style.display = 'none';
  if (pdfSubmit) pdfSubmit.disabled = false;

  if (pdfForm)  pdfForm.dataset.invoiceId = rowId;
  if (pdfInvoiceIdInput) pdfInvoiceIdInput.value = rowId;

  show(pdfModal);
});





async function ensureInvoiceLibs() {
  if (!window.docxtemplater && !window.Docxtemplater) {
    await loadScriptOnceExact('https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.43.0/docxtemplater.min.js');
  }
  if (!window.PizZip) {
    await loadScriptOnceExact('https://cdn.jsdelivr.net/npm/pizzip@3.1.7/dist/pizzip.min.js');
  }
  if (!window.PizZip) throw new Error('PizZip not loaded');
  if (!window.docxtemplater && !window.Docxtemplater) throw new Error('docxtemplater not loaded');
}

// ====== Save invoice (DOCX only) ======
async function saveInvoice(){
  if (generateBtn?.disabled) return;        // guard against double-clicks
  try{
    // --- validate minimal inputs early
    const client_id = clientSel?.value;
    if (!client_id){ alert('Please choose a client.'); return; }
    const lines = readServiceLines();
    if (lines.length === 0) { alert('Add at least one service line.'); return; }

    // --- UI: show progress and lock the button
    const prevLabel = generateBtn?.textContent;
    if (generateBtn){ generateBtn.disabled = true; generateBtn.textContent = 'Generating…'; }
    if (progressMsg) progressMsg.textContent = 'Creating invoice record…';
    show(progressModal);                     // <— show progress modal

    // ===== ORIGINAL LOGIC (unchanged except for progress messages) =====
    const issue_date = todayISO();
    const termKey = termsSel?.value || 'monthly';
    const termMap = {
      monthly:  { label: 'Monthly',  months: 1 },
      '3m':     { label: '3 Months', months: 3 },
      '6m':     { label: '6 Months', months: 6 },
      annual:   { label: 'Annual',   months: 12 },
      one_time: { label: 'One time', months: 0 },
    };
    const term = termMap[termKey] || termMap.monthly;
    const due_date = (endInput?.value || '').trim() || issue_date; // use Service End as due date

    const coverage_period = term.label;
    const currencyDoc = currencySel?.value || 'JOD';
    const subtotal = lines.reduce((s,l)=>s+(l.price||0),0);
    const tax      = 0;
    const total    = subtotal + tax;

    const subtotalDoc = subtotal;
    const totalDoc    = total;

    const subtotalUSD = toUSD(subtotalDoc, currencyDoc);
    const totalUSD    = toUSD(totalDoc,    currencyDoc);

    const isTestMode = document.getElementById('testModeCheck')?.checked;

    // 1) Insert invoice header (skipped in test mode)
    let id = null, invoice_no = 'TEST';
    if (!isTestMode) {
      if (progressMsg) progressMsg.textContent = 'Saving to database…';
      const ins = await sb.from('invoices')
        .insert([{
          client_id,
          issue_date,
          due_date,
          currency: 'USD',
          subtotal: subtotalUSD,
          tax,
          status: 'Sent',
          coverage_period
        }])
        .select('id, invoice_no')
        .single();

      if (ins.error) { console.error(ins.error); throw ins.error; }
      ({ id, invoice_no } = ins.data);
    }

    // 2) Fetch client info
    if (progressMsg) progressMsg.textContent = 'Fetching client info…';
    const clientRowResp = await sb.from('clients')
      .select('name, client_no, address, email')
      .eq('id', client_id).single();
    const clientRow = clientRowResp.data || {};

    // 3) Build payload
    const payload = {
      client_name: clientRow.name || '',
      address: clientRow.address || '',
      email: clientRow.email || '',
      customer_id_label: `Customer ID ${clientRow.client_no || client_id}`,
      start_date: fmtLongDate(startInput?.value || issue_date),
      end_date:   fmtLongDate(endInput?.value   || due_date),
      payment_terms: term.label,
      currency: currencyDoc,
      subtotal: `${subtotalDoc.toFixed(2)} ${currencyDoc}`,
      total_due: `${subtotalDoc.toFixed(2)} ${currencyDoc}`,
      invoice_no,
      today: fmtLongDate(issue_date),
      lines: lines.map(l => ({
        service_desc:  l.desc,
        service_price: `${Number(l.price || 0).toFixed(2)} ${currencyDoc}`
      })),
    };

    // 4) Fill DOCX
    if (progressMsg) progressMsg.textContent = 'Generating Word file…';
    await ensureInvoiceLibs();
    const templateUrl = "https://eymqvzjwbolgmywpwhgi.supabase.co/storage/v1/object/public/Invoices/Templates/ZAtech%20Invoice.docx";
    const ab = await fetch(templateUrl).then(r => r.arrayBuffer());

    const zip = new window.PizZip(ab);

    const Docx = window.docxtemplater || window.Docxtemplater;
    const doc = new Docx(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '[[', end: ']]' } });
    doc.setData(payload);
    doc.render();

    const docxBlob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const safeClient = (payload.client_name || 'Client').replace(/[^a-z0-9\- ]/gi, '').trim();
    const baseFileName = `Invoice No.${invoice_no} - ${safeClient}`;

    if (isTestMode) {
      // Test mode — download locally, nothing saved to Supabase
      const a = document.createElement('a');
      a.href = URL.createObjectURL(docxBlob);
      a.download = `${baseFileName} [TEST].docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      hide(progressModal);
      hide(modal);
      return;
    }

    // 5) Upload DOCX
    if (progressMsg) progressMsg.textContent = 'Uploading Word file…';
    const docxPath = `generated/Doc Version/${baseFileName}.docx`;
    const upDocx = await sb.storage.from('Invoices').upload(docxPath, docxBlob, {
      upsert: true,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    if (upDocx.error) throw upDocx.error;

    const docxUrl = sb.storage.from('Invoices').getPublicUrl(docxPath).data.publicUrl;

    // 6) Save URL + refresh
    if (progressMsg) progressMsg.textContent = 'Finalizing…';
    await sb.from('invoices').update({ docx_url: docxUrl }).eq('id', id);
    if (docxLinkA) { docxLinkA.href = docxUrl; docxLinkA.removeAttribute('download'); }
    await loadInvoices();

    // --- UI: swap modals
    hide(progressModal);
    hide(modal);
    show(successModal);

  }catch(e){
    console.error(e);
    hide(progressModal);                  // make sure to hide on error
    alert(e.message || 'Failed to create invoice.');
  }finally{
    if (generateBtn){
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Invoice';
    }
  }
}


// ---- Inline status editor (click pill -> portal dropdown) ----
document.addEventListener('click', (e) => {
  const pill = e.target.closest('.status-pill');
  if (!pill) return;

  const id = pill.dataset.id;
  showPillDropdown(pill, [
    { value: 'Paid' },
    { value: 'Not Paid' },
    { value: 'Partial Payment', label: 'Partial' },
    { value: 'Cancelled' },
  ], async (next) => {
    const res = await persistStatusToDb(id, next);
    if (!res.ok) { alert(res.error?.message || 'Could not update status.'); return; }
    const inv = invoices.find(x => invoiceKey(x.id) === invoiceKey(id));
    if (inv) inv.status = res.value;
    pill.className = `tag ${statusClassFor(res.value)} status-pill`;
    pill.textContent = statusLabelFor(res.value);
    pill.dataset.id = id;
    pill.dataset.value = res.value;
    renderTable();
  });
});


// ---- View DOCX from table
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button.view-invoice');
  if (!btn) return;
  const id  = Number(btn.dataset.id);
  const inv = invoices.find(x => x.id === id);
  if (!inv?.docx_url) { alert('No DOCX found for this invoice yet.'); return; }
  window.open(inv.docx_url, '_blank');
});

// ---- PDF buttons (Upload/View) ----
document.addEventListener('click', (e) => {
  if (e.target.closest('#pdfOptionsModal')) return;
  const btn = e.target.closest('button.pdf-upload');
  if (!btn) return;

  const rowId = cleanId(btn.dataset.id || btn.closest('tr.inv-row')?.dataset.id);
  if (!rowId) { alert('Invalid invoice id on this row.'); return; }

  // ✅ NEW: stash invoice metadata for filename
  const inv = invoices.find(x => String(x.id) === String(rowId));
  lastClickedInvoiceNo = inv?.invoice_no || '';
  lastClickedClient    = inv?.clients?.name || 'Client';

  if (pdfForm) {
    pdfForm.dataset.invoiceNo = String(lastClickedInvoiceNo || '');
    pdfForm.dataset.client    = String(lastClickedClient || 'Client');
  }

  // existing stuff...
  hide(pdfOptionsModal);

  activePdfInvoiceId   = rowId;
  lastClickedInvoiceId = rowId;

  if (!pdfModal) return alert('Upload modal missing.');
  if (pdfMsg)  pdfMsg.textContent = '';
  if (pdfFile) pdfFile.value = '';
  if (pdfBusy) pdfBusy.style.display = 'none';
  if (pdfSubmit) pdfSubmit.disabled = false;

  if (pdfForm)  pdfForm.dataset.invoiceId = rowId;
  if (pdfInvoiceIdInput) pdfInvoiceIdInput.value = rowId;

  show(pdfModal);
});

// View PDF (red) → open options modal (ignore clicks from inside the options modal itself)
document.addEventListener('click', (e) => {
  if (e.target.closest('#pdfOptionsModal')) return;
  const btn = e.target.closest('button.pdf-options');
  if (!btn) return;

  const rowId = cleanId(btn.dataset.id || btn.closest('tr.inv-row')?.dataset.id);
  if (!rowId) { alert('Invalid invoice id on this row.'); return; }

  // ✅ NEW: stash invoice metadata for filename
  const inv = invoices.find(x => String(x.id) === String(rowId));
  lastClickedInvoiceNo = inv?.invoice_no || '';
  lastClickedClient    = inv?.clients?.name || 'Client';

  if (pdfForm) {
    pdfForm.dataset.invoiceNo = String(lastClickedInvoiceNo || '');
    pdfForm.dataset.client    = String(lastClickedClient || 'Client');
  }

  // existing stuff...
  activePdfInvoiceId   = rowId;
  lastClickedInvoiceId = rowId;

  if (pdfForm)  pdfForm.dataset.invoiceId = rowId;
  if (pdfInvoiceIdInput) pdfInvoiceIdInput.value = rowId;

  show(pdfOptionsModal);
});



// view PDF (red button)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button.pdf-view');
  if (!btn) return;
  const id  = btn.dataset.id;
  const inv = invoices.find(x => String(x.id) === String(id));
  if (!inv?.pdf_url) { alert('No PDF linked to this invoice yet.'); return; }
  window.open(inv.pdf_url, '_blank');
});

// Row click → open PDF (or DOCX if no PDF yet)
document.addEventListener('click', (e) => {
  if (e.target.closest('button, a, select, input, .status-pill')) return;
  const tr = e.target.closest('tr.inv-row');
  if (!tr) return;
  const inv = invoices.find(x => String(x.id) === String(tr.dataset.id));
  if (!inv) return;
  if (inv.pdf_url) window.open(inv.pdf_url, '_blank');
  else if (inv.docx_url) window.open(inv.docx_url, '_blank');
});

successClose?.addEventListener("click", () => hide(successModal));
successDone?.addEventListener("click", () => hide(successModal));

// cancel/close upload modal
pdfCancel?.addEventListener('click', () => {
  hide(pdfModal);           // <-- let hide() handle classes/aria
  activePdfInvoiceId = null;
});


// submit upload
pdfForm?.addEventListener("submit", async (e) => {

  e.preventDefault();

  // ---- Resolve invoice id robustly, once, and freeze it
  const formId = pdfForm?.dataset?.invoiceId;
  // ---- Resolve invoice id robustly, once, and freeze it
  const sources = [
    activePdfInvoiceId,
    pdfForm?.dataset?.invoiceId,
    pdfInvoiceIdInput?.value,
    lastClickedInvoiceId
  ];
  const invoiceId = sources.map(cleanId).find(Boolean) || '';

  if (!invoiceId) {
    alert("No invoice selected for PDF upload.");
    return;
  }


  if (!pdfFile?.files?.length) {
    alert("Please choose a PDF file first.");
    return;
  }

  const file = pdfFile.files[0];
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext !== "pdf") { alert("Only PDF files are allowed."); return; }

  try {
    if (pdfBusy) pdfBusy.style.display = "block";
    if (pdfSubmit) pdfSubmit.disabled = true;

    // --- Build filename from the stashed metadata (optional; keep your version if you prefer)
    const invoiceNo  = pdfForm?.dataset?.invoiceNo  || lastClickedInvoiceNo || '';
    const clientName = pdfForm?.dataset?.client     || lastClickedClient    || 'Client';
    const safeClient = clientName.replace(/[^a-z0-9\- ]/gi, "").trim() || "Client";
    const baseFileName = invoiceNo ? `Invoice No.${invoiceNo} - ${safeClient}` : `Invoice - ${safeClient}`;
    const pdfPath = `generated/${baseFileName}.pdf`;

    // === Upload (overwrite)
    const { error: upErr } = await sb.storage
      .from("Invoices")
      .upload(pdfPath, file, { upsert: true, contentType: "application/pdf" });
    if (upErr) throw upErr;

    // === Fresh public URL (cache-bust)
    const { data: urlData } = sb.storage.from("Invoices").getPublicUrl(pdfPath);
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // === Update DB row using the frozen invoiceId
    const { error: updateErr } = await sb
      .from("invoices")
      .update({ pdf_url: publicUrl })
      .eq("id", invoiceId);
    if (updateErr) throw updateErr;

    await loadInvoices();
    hide(pdfModal);
    // optional: clear id so a stale one can't leak
    // activePdfInvoiceId = null;

  } catch (err) {
    console.error(err);
    alert(err.message || "Failed to upload PDF.");
  } finally {
    if (pdfBusy) pdfBusy.style.display = "none";
    if (pdfSubmit) pdfSubmit.disabled = false;
  }
});



// in assets/js/invoices.js (near the bottom)
const loader = document.getElementById('contentLoader');
const mainEl = document.querySelector('.main');
const showLoader = () => loader?.classList.remove('hidden');
const hideLoader = () => loader?.classList.add('hidden');

async function initInvoicesPage() {
  showLoader();
  await Promise.all([loadClientsForSelect(), loadClientsForFilter()]);
  await applyFilters();
  hideLoader();
  mainEl?.classList.add('content-ready');
}
initInvoicesPage();



// ====== Wiring ======
newBtn?.addEventListener('click', openModal);
closeBtn?.addEventListener('click', closeModal);
cancelBtn?.addEventListener('click', closeModal);
clearBtn?.addEventListener('click', () => { serviceList.innerHTML=''; addServiceRow(); updateTotals(); });
generateBtn?.addEventListener('click', saveInvoice);

// Add service line button
addServiceBtn?.addEventListener('click', (e) => {
  e.preventDefault();      // safe even if inside a <form> later
  addServiceRow();         // appends a blank service row
});
