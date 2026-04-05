// assets/js/app.js

/**
 * showPillDropdown — portal-themed status dropdown that keeps the pill in place.
 * @param {HTMLElement} pill      - The status pill element clicked
 * @param {Array}       options   - [{ value, label? }, ...] list of choices
 * @param {Function}    onSelect  - called with the chosen value (only fires when value changes)
 */
function showPillDropdown(pill, options, onSelect) {
  // Remove any stale dropdown
  document.querySelectorAll('.pill-dropdown').forEach(d => d.remove());

  const current = pill.textContent.trim();
  const rect = pill.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.className = 'pill-dropdown';

  options.forEach(({ value, label }) => {
    const item = document.createElement('div');
    item.className = 'pill-dropdown-item' + (value === current ? ' active' : '');
    item.textContent = label || value;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
      if (value !== current) onSelect(value);
    });
    menu.appendChild(item);
  });

  // Initial position: below the pill
  menu.style.left = rect.left + 'px';
  menu.style.top  = (rect.bottom + 6) + 'px';
  document.body.appendChild(menu);

  // Flip up/left if overflowing viewport
  requestAnimationFrame(() => {
    const mr = menu.getBoundingClientRect();
    if (mr.bottom > window.innerHeight - 8) {
      menu.style.top = (rect.top - mr.height - 6) + 'px';
    }
    if (mr.right > window.innerWidth - 8) {
      menu.style.left = (rect.right - mr.width) + 'px';
    }
  });

  function close() {
    menu.remove();
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey);
  }

  function onOutside(e) {
    if (!menu.contains(e.target)) close();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  // Defer so the triggering click doesn't immediately close the menu
  setTimeout(() => {
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey);
  }, 0);
}
document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav link
  const pathname = window.location.pathname;
  document.querySelectorAll('#nav a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href === pathname && href !== '/');
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
