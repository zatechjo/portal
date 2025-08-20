document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('client-modal');
  const closeModal = () => modal.classList.remove('show');

  document.querySelectorAll('.row-actions .mini').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('tr').children[0].textContent.trim();
      const data = clientsData[name];
      if (!data) return;
      modal.querySelector('#client-name').textContent = data.name;
      modal.querySelector('#client-email').textContent = data.email;
      modal.querySelector('#client-phone').textContent = data.phone;
      modal.querySelector('#client-country').textContent = data.country;
      modal.querySelector('#client-joined').textContent = data.joined;
      modal.querySelector('#client-status').textContent = data.status;
      modal.querySelector('#client-notes').textContent = data.notes;
      const tbody = modal.querySelector('#client-invoices tbody');
      tbody.innerHTML = '';
      data.invoices.forEach(inv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${inv.id}</td><td>${inv.date}</td><td>${inv.total}</td><td>${inv.status}</td>`;
        tbody.appendChild(tr);
      });
      modal.classList.add('show');
    });
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
