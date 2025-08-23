// assets/js/idle.js
import { auth } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// Don't run idle timers on the login page
const IS_LOGIN = /\/login\.html(?:$|\?|#)/.test(location.pathname);

// Timings
const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes in production
// const IDLE_LIMIT_MS = 5000;        // (use for testing)
const WARN_MS = 10 * 1000;             // 10s warning banner

if (!IS_LOGIN) {
  let idleTimer, warnTimer, countdownInterval;
  let warningActive = false; // when true, incidental activity won't auto-reset timers

  // ---- Build slide-up toast (bottom) ----
  const toast = document.createElement('div');
  toast.id = 'idleToast';
  toast.className = 'idle-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <div class="idle-toast__content">
      <strong>Session timing out</strong>
      <span><span id="idleCountdown">${Math.floor(WARN_MS / 1000)}</span>s left</span>
    </div>
    <div class="idle-toast__actions">
      <button id="idleStayBtn" class="mini primary">Stay signed in</button>
      <button id="idleLogoutBtn" class="mini">Log out</button>
    </div>
  `;
  document.body.appendChild(toast);

  const countdownEl = toast.querySelector('#idleCountdown');
  const stayBtn = toast.querySelector('#idleStayBtn');
  const logoutBtn = toast.querySelector('#idleLogoutBtn');

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
    warningActive = true; // keep toast visible despite incidental activity
    showToast(Math.floor(WARN_MS / 1000));
  }

  async function doLogout() {
    try {
      await signOut(auth);
    } catch (_) {}
    localStorage.setItem('idleLogout', '1'); // login page will show the top popup
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
    warningActive = false;
    scheduleTimers();
  }

  // ---- Wire controls ----
  stayBtn.addEventListener('click', () => {
    markActive();
    resetTimers(); // explicit choice resets timers
  });

  logoutBtn.addEventListener('click', () => {
    doLogout();
  });

  // Any activity marks active; only resets timers if warning isn't showing
  ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach((evt) => {
    document.addEventListener(
      evt,
      () => {
        markActive();
        if (!warningActive) resetTimers();
      },
      { passive: true }
    );
  });

  // Activity from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === HEARTBEAT_KEY) {
      if (!warningActive) resetTimers();
    }
  });

  // Start
  markActive();
  resetTimers();
}
