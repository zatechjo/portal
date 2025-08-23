// assets/js/app.js
document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#nav a').forEach(a => {
    const href = a.getAttribute('href').replace('./','');
    a.classList.toggle('active', href === path);
  });

  // Pill tabs active state
  document.querySelectorAll('.pilltabs').forEach(group => {
    group.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
});

// Page loader
(function () {
  const main = document.querySelector('.main');
  const loader = document.getElementById('contentLoader');

  if (!main || !loader) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');     // fade out loader
      main.classList.add('content-ready'); // trigger reveal animation

      // remove loader node after fade transition
      setTimeout(() => loader.remove(), 400);
    }, 800); // adjust delay as needed
  });
})();
