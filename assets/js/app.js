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

// Optional viewport diagnostics for comparing machines.
(function () {
  const KEY = 'portal:viewport-debug';
  const params = new URLSearchParams(window.location.search);
  let enabled = params.get('viewportDebug') === '1';

  try {
    if (!enabled) enabled = localStorage.getItem(KEY) === '1';
  } catch {}

  let badge = null;

  const breakpointLabel = width => {
    if (width <= 480) return '<=480';
    if (width <= 600) return '<=600';
    if (width <= 768) return '<=768';
    if (width <= 900) return '<=900';
    if (width <= 1100) return '<=1100';
    if (width <= 1200) return '<=1200';
    if (width <= 1366) return '<=1366';
    return '>1366';
  };

  const render = () => {
    if (!badge) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const screenWidth = window.screen?.width ?? 0;
    const screenHeight = window.screen?.height ?? 0;
    const dpr = Number(window.devicePixelRatio || 1).toFixed(2);

    badge.textContent =
      `viewport ${width}x${height} | screen ${screenWidth}x${screenHeight} | DPR ${dpr} | bp ${breakpointLabel(width)}`;
  };

  const mount = () => {
    if (badge || !document.body) return;
    badge = document.createElement('div');
    badge.id = 'viewportDebugBadge';
    Object.assign(badge.style, {
      position: 'fixed',
      left: '12px',
      bottom: '12px',
      zIndex: '5000',
      padding: '8px 10px',
      borderRadius: '10px',
      background: 'rgba(8, 14, 28, 0.92)',
      border: '1px solid rgba(255,255,255,.14)',
      color: '#dbeafe',
      font: '600 11px/1.35 "Poppins", sans-serif',
      letterSpacing: '.01em',
      boxShadow: '0 10px 24px rgba(0,0,0,.35)',
      pointerEvents: 'none',
      backdropFilter: 'blur(6px)',
      maxWidth: 'calc(100vw - 24px)'
    });
    document.body.appendChild(badge);
    render();
  };

  const unmount = () => {
    badge?.remove();
    badge = null;
  };

  const sync = () => {
    if (enabled) mount();
    else unmount();
    render();
  };

  const persist = () => {
    try {
      if (enabled) localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
    } catch {}
  };

  const toggle = () => {
    enabled = !enabled;
    persist();
    sync();
  };

  window.addEventListener('resize', render, { passive: true });
  window.addEventListener('orientationchange', render, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyV') toggle();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync, { once: true });
  } else {
    sync();
  }
})();

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
