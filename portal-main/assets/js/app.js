document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#nav a').forEach(a => {
    const href = a.getAttribute('href').replace('./','');
    a.classList.toggle('active', href === path);
  });

  document.querySelectorAll('.pilltabs').forEach(group => {
    group.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
});
