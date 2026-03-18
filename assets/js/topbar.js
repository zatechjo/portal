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
    function updateDateTime() {
      const now     = new Date();
      const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
      const rest    = now.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric"
      });
      const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit"
      });
      const formatted = `${weekday}, ${rest} — ${time}`;
      todayBadge.textContent = formatted;
      // Also update desktop badge if present
      const desktopBadge = document.getElementById("todayBadgeDesktop");
      if (desktopBadge) desktopBadge.textContent = formatted;
      updateGreetingWord();
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);
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
  const hamburger = document.getElementById('hamburger');

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
          <a href="./settings.html" class="side-account-link">Profile</a>
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