document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('client-modal');
  const closeModal = () => modal.classList.remove('show');

  document.querySelectorAll('.row-actions .mini').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('tr').children[0].textContent.trim();
      const data = clientsData[name];
      if (!data) return;
      modal.querySelector('#client-name').textContent = data.name || '—';
      modal.querySelector('#client-contact').textContent = data.contactName || '—';
      modal.querySelector('#client-email').textContent = data.email || '—';
      modal.querySelector('#client-phone').textContent = data.phone || '—';
      modal.querySelector('#client-country').textContent = data.country || '—';
      modal.querySelector('#client-joined').textContent = data.joined || '—';
      modal.querySelector('#client-status').textContent = data.status || '—';
      modal.querySelector('#client-address').textContent = data.address || '—';
      modal.querySelector('#client-sector').textContent = data.sector || '—';
      modal.querySelector('#client-notes').textContent = data.notes || '—';
      const tbody = modal.querySelector('#client-invoices tbody');
      tbody.innerHTML = '';
      data.invoices.forEach(inv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${inv.id}</td><td>${inv.date}</td><td>${inv.total}</td><td>${inv.status}</td><td class="row-actions"><button class="mini view-invoice" data-invoice="${inv.id}">View →</button></td>`;
        tbody.appendChild(tr);
      });
      modal.classList.add('show');
    });
  });

  modal.querySelector('#client-invoices tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-invoice]');
    if (!btn) return;
    const invoiceId = btn.dataset.invoice;
    closeModal();
    location.href = './invoices.html#' + invoiceId;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('close')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});
