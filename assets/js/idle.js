// assets/js/idle.js
import { auth } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// Do NOT run idle timers on the login page
if (/\/login\.html(?:$|\?|#)/.test(location.pathname)) {
  // Nothing to do here; login.js will show the "already signed out" popup if needed.
} else {
  // ---- Timings ----
  export const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 min
  export const WARN_MS       = 10 * 1000;      // 10s warning

  let idleTimer, warnTimer, countdownInterval;
  let warningActive = false; // when true, activity does NOT auto-reset

  // ---- Build slide-up toast (bottom) ----
  const toast = document.createElement('div');
  toast.id = 'idleToast';
  toast.className = 'idle-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <div class="idle-toast__content">
      <strong>Session timing out</strong>
      <span><span id="idleCountdown">10</span>s left</span>
    </div>
    <div class="idle-toast__actions">
      <button id="idleStayBtn" class="mini primary">Stay signed in</button>
      <button id="idleLogoutBtn" class="mini">Log out</button>
    </div>
  `;
  document.body.appendChild(toast);

  const countdownEl = toast.querySelector('#idleCountdown');
  const stayBtn     = toast.querySelector('#idleStayBtn');
  const logoutBtn   = toast.querySelector('#idleLogoutBtn');

  // ---- Cross-tab heartbeat ----
  const HEARTBEAT_KEY = 'zportal:lastActivity';

  function markActive() {
    localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
  }

  // ---- Helpers ----
  function hideToast() {
    toast.classList.remove('show');
  }

  function showToast(seconds) {
    clearInterval(countdownInterval);
    countdownEl.textContent = String(seconds);
    toast.classList.add('show');

    let remaining = seconds;
    countdownInterval = setInterval(() => {
      remaining -= 1;
      countdownEl.textContent = String(remaining);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        doLogout();
      }
    }, 1000);
  }

  function showWarning() {
    warningActive = true;          // freeze auto-resets from activity
    showToast(WARN_MS / 1000);     // 10s countdown
  }

  async function doLogout() {
    try { await signOut(auth); } catch (_) {}
    localStorage.setItem('idleLogout', '1');   // so login page shows the top popup
    window.location.href = './login.html';
  }

  function scheduleTimers() {
    warnTimer = setTimeout(showWarning, IDLE_LIMIT_MS - WARN_MS);
    idleTimer = setTimeout(doLogout, IDLE_LIMIT_MS);
  }

  function resetTimers() {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    clearInterval(countdownInterval);
    hideToast();
    warningActive = false;         // back to normal state
    scheduleTimers();
  }

  // ---- Wire controls ----
  stayBtn.addEventListener('click', () => {
    markActive();
    resetTimers();                 // user explicitly stayed
  });

  logoutBtn.addEventListener('click', () => {
    doLogout();
  });

  // Any activity = mark active; only reset if warning is NOT shown
  ['mousemove','keydown','scroll','touchstart','click'].forEach(evt => {
    document.addEventListener(evt, () => {
      markActive();
      if (!warningActive) resetTimers();
      // If warningActive === true, we ignore incidental activity so the toast stays up
    }, { passive: true });
  });

  // Listen for activity from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === HEARTBEAT_KEY) {
      if (!warningActive) resetTimers();
    }
  });

  // Kick off
  markActive();
  resetTimers();
}
