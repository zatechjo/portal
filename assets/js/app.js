// assets/js/app.js
document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav link
  const pathname = window.location.pathname; // e.g. /clients, /home, /
  document.querySelectorAll('#nav a').forEach(a => {
    const href = a.getAttribute('href'); // e.g. /clients, /home
    const isActive = href === pathname || (pathname === '/' && href === '/home');
    a.classList.toggle('active', isActive);
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
