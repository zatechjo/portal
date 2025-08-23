// assets/js/invoices.js
document.addEventListener('DOMContentLoaded', () => {
  const table = document.getElementById('invoiceTable');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  const headers = [...table.querySelectorAll('thead th.sortable')];
  const dateFilter = document.getElementById('dateFilter');

  // Keep original full set for filtering/sorting
  const allRows = [...tbody.querySelectorAll('tr')];

  let currentSort = { index: -1, dir: 'asc' }; // or 'desc'
  let currentFilter = 'all';

  // --- Helpers ---
  const parseCurrency = (txt) => {
    if (!txt) return 0;
    // remove currency symbols/commas, keep minus and dot
    const n = txt.replace(/[^0-9.\-]/g, '');
    const val = parseFloat(n);
    return isNaN(val) ? 0 : val;
  };

  const parseDate = (txt) => {
    // expecting YYYY-MM-DD; fallback to Date.parse
    const d = new Date(txt);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const getStatusText = (cell) => {
    // <td><span class="tag ok">Paid</span></td>
    const span = cell.querySelector('.tag');
    return (span?.textContent || cell.textContent || '').trim().toLowerCase();
  };

  const cellValue = (tr, idx, type) => {
    const cell = tr.children[idx];
    const raw = (cell?.textContent || '').trim();
    switch (type) {
      case 'currency': return parseCurrency(raw);
      case 'date':     return parseDate(raw);
      case 'status':   return getStatusText(cell);
      case 'text':
      default:         return raw.toLowerCase();
    }
  };

  const withinFilter = (tr) => {
    if (currentFilter === 'all') return true;

    const dateIdx = headers.findIndex(h => h.dataset.type === 'date'); // "Date of Invoice"
    const ms = cellValue(tr, dateIdx, 'date');
    if (!ms) return false;

    const now = new Date();
    const y = now.getFullYear();
    const startOfYear = new Date(y, 0, 1).getTime();
    const nowMs = now.getTime();

    switch (currentFilter) {
      case 'last30':
        return ms >= nowMs - 30 * 24 * 3600 * 1000;
      case 'last90':
        return ms >= nowMs - 90 * 24 * 3600 * 1000;
      case 'thisYear':
        return ms >= startOfYear;
      case 'y2024':
        return ms >= new Date(2024, 0, 1).getTime() && ms < new Date(2025, 0, 1).getTime();
      case 'y2023':
        return ms >= new Date(2023, 0, 1).getTime() && ms < new Date(2024, 0, 1).getTime();
      case 'y2022':
        return ms >= new Date(2022, 0, 1).getTime() && ms < new Date(2023, 0, 1).getTime();
      default:
        return true;
    }
  };

  const apply = () => {
    // Filter
    let rows = allRows.filter(withinFilter);

    // Sort
    if (currentSort.index >= 0) {
      const idx = currentSort.index;
      const type = headers[idx].dataset.type || 'text';
      rows.sort((a, b) => {
        const va = cellValue(a, idx, type);
        const vb = cellValue(b, idx, type);
        if (va < vb) return currentSort.dir === 'asc' ? -1 : 1;
        if (va > vb) return currentSort.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Rebuild tbody
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));
  };

  // --- Sorting handlers ---
  headers.forEach((th, index) => {
    th.addEventListener('click', () => {
      if (currentSort.index === index) {
        // toggle direction
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        // set new sort
        currentSort.index = index;
        currentSort.dir = 'asc';
      }

      // update UI indicators
      headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');

      apply();
    });
  });

  // --- Date filter handler ---
  dateFilter?.addEventListener('change', (e) => {
    currentFilter = e.target.value || 'all';
    apply();
  });

  // Initial paint
  apply();
});
