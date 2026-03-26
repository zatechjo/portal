// TOPBAR SCRIPT
document.addEventListener("DOMContentLoaded", () => {

  /* ─────────────────────────────────────────
     TODAY DATE + GREETING WORD
  ───────────────────────────────────────── */
  const todayBadge     = document.getElementById("todayBadge");
  const greetingWordEl = document.getElementById("greetingWord");

  function updateGreetingWord() {
    if (!greetingWordEl) return;
    const h = new Date().getHours();
    greetingWordEl.textContent =
      h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }

  if (todayBadge) {
    // Build the split clock structure once
    todayBadge.innerHTML = `
      <div class="clock-badge">
        <svg class="clock-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle class="clock-ring-track" cx="18" cy="18" r="15.9" />
          <circle class="clock-ring-fill" id="clockSecArc" cx="18" cy="18" r="15.9" />
        </svg>
        <div class="clock-inner">
          <div class="clock-time">
            <span id="clockHr"></span><span class="clock-colon" id="clockColon">:</span><span id="clockMin"></span><span class="clock-ampm" id="clockAmpm"></span>
          </div>
          <div class="clock-separator"></div>
          <div class="clock-date" id="clockDate"></div>
        </div>
      </div>
    `;

    const arcEl   = document.getElementById("clockSecArc");
    const hrEl    = document.getElementById("clockHr");
    const minEl   = document.getElementById("clockMin");
    const ampmEl  = document.getElementById("clockAmpm");
    const colonEl = document.getElementById("clockColon");
    const dateEl  = document.getElementById("clockDate");
    const CIRC    = 2 * Math.PI * 15.9; // circumference

    function updateDateTime() {
      const now  = new Date();
      const sec  = now.getSeconds();
      const h24  = now.getHours();
      const min  = now.getMinutes();
      const ampm = h24 >= 12 ? "PM" : "AM";
      const h12  = String(h24 % 12 || 12).padStart(2, "0");
      const mm   = String(min).padStart(2, "0");

      hrEl.textContent   = h12;
      minEl.textContent  = mm;
      ampmEl.textContent = ampm;

      // Blink colon every second
      colonEl.style.opacity = sec % 2 === 0 ? "1" : "0.15";

      // Seconds arc progress
      const pct    = sec / 60;
      const offset = CIRC * (1 - pct);
      arcEl.style.strokeDasharray  = `${CIRC}`;
      arcEl.style.strokeDashoffset = `${offset}`;

      // Date line
      const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
      const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      dateEl.textContent = `${weekday}, ${dateStr}`;

      updateGreetingWord();
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") updateDateTime();
    });
  } else {
    updateGreetingWord();
    setInterval(updateGreetingWord, 60000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") updateGreetingWord();
    });
  }


  /* ─────────────────────────────────────────
     TOPBAR SCROLL EFFECT
  ───────────────────────────────────────── */
  const tb = document.querySelector('.topbar');
  if (tb) {
    const onScroll = () => tb.classList.toggle('scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }


  /* ─────────────────────────────────────────
     HAMBURGER + SIDEBAR
  ───────────────────────────────────────── */
  const sidebar   = document.querySelector('.side');
  let hamburger   = document.getElementById('hamburger');

  // Inject hamburger into topbar if it doesn't exist in HTML
  if (!hamburger) {
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      hamburger = document.createElement('button');
      hamburger.id = 'hamburger';
      hamburger.className = 'hamburger';
      hamburger.setAttribute('aria-label', 'Open menu');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.innerHTML = '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
      topbar.insertBefore(hamburger, topbar.firstChild);
    }
  }

  if (sidebar && hamburger) {

    // --- Backdrop overlay (created once) ---
    let overlay = document.querySelector('.side-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'side-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }

    // --- Account footer injected into sidebar ---
    // Built by window.__buildSideAccount(name, avatar) called from auth-guard.js

    // Expose a global so auth-guard.js can call us directly with name + avatar
    // This is more reliable than MutationObserver timing
    window.__buildSideAccount = function(name, avatarSrc) {
      if (sidebar.querySelector('.side-account')) {
        // Already built — just update the values
        const nameEl = sidebar.querySelector('.side-account-name');
        const imgEl  = sidebar.querySelector('.side-account-avatar');
        if (nameEl) nameEl.textContent = name;
        if (imgEl)  imgEl.src = avatarSrc;
        return;
      }

      const sideAccount = document.createElement('div');
      sideAccount.className = 'side-account';
      sideAccount.innerHTML = `
        <div class="side-account-inner">
          <img src="${avatarSrc}" alt="${name}" class="side-account-avatar"
               onerror="this.src='./assets/img/user-icon.png'" />
          <div class="side-account-info">
            <span class="side-account-name">${name}</span>
          </div>
        </div>
        <div class="side-account-actions">
          <a href="/settings" class="side-account-link">Profile</a>
          <button class="side-account-logout" id="sideLogoutBtn">Log out</button>
        </div>
      `;
      sidebar.appendChild(sideAccount);

      const topbarLogout = document.getElementById('logoutBtn');
      document.getElementById('sideLogoutBtn')?.addEventListener('click', () => {
        topbarLogout?.click();
      });
    };

    // --- Hide topbar account block on mobile via JS class (CSS does the rest) ---
    // (CSS handles this — see styles.css @media ≤768px)

    // --- Open / close ---
    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.setAttribute('aria-label', 'Close menu');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });

    sidebar.querySelectorAll('.nav a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeSidebar();
    }, { passive: true });
  }


  /* ─────────────────────────────────────────
     SEARCH BAR (hidden on mobile via CSS)
  ───────────────────────────────────────── */
  const searchToggle = document.getElementById("searchToggle");
  const searchWrap   = document.getElementById("searchWrap");
  const searchInput  = document.getElementById("searchInput");
  const searchGroup  = document.querySelector(".search-group");

  if (searchToggle && searchWrap && searchGroup) {
    searchGroup.classList.add("sg-closed");

    function openSearch() {
      searchGroup.classList.replace("sg-closed", "sg-open");
      searchWrap.style.display = "flex";
      requestAnimationFrame(() => {
        searchWrap.classList.add("open");
        searchWrap.setAttribute("aria-hidden", "false");
        setTimeout(() => searchInput?.focus(), 120);
      });
    }

    function closeSearch() {
      searchWrap.classList.remove("open");
      searchWrap.setAttribute("aria-hidden", "true");
      searchInput?.blur();
      searchWrap.addEventListener("transitionend", () => {
        if (!searchWrap.classList.contains("open")) {
          searchWrap.style.display = "none";
          searchGroup.classList.replace("sg-open", "sg-closed");
        }
      }, { once: true });
    }

    searchToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      searchWrap.classList.contains("open") ? closeSearch() : openSearch();
    });

    document.addEventListener("click", (e) => {
      if (
        searchWrap.classList.contains("open") &&
        !searchWrap.contains(e.target) &&
        e.target !== searchToggle
      ) closeSearch();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && searchWrap.classList.contains("open")) closeSearch();
    });
  }


  /* ─────────────────────────────────────────
     ACCOUNT DROPDOWN (desktop only)
     On mobile this is hidden via CSS — the
     sidebar account block handles it instead.
  ───────────────────────────────────────── */
  const account = document.querySelector(".account");
  const accBtn  = document.getElementById("accountBtn");
  const accMenu = document.getElementById("accountMenu");

  if (account && accBtn && accMenu) {
    accBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = account.classList.toggle("open");
      accBtn.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (e) => {
      if (!account.contains(e.target)) {
        account.classList.remove("open");
        accBtn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && account.classList.contains("open")) {
        account.classList.remove("open");
        accBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

});