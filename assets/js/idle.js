// assets/js/idle.js
import { auth } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// --- Timings (testing) ---
export const IDLE_LIMIT_MS = 5000; // 5 seconds (testing)
export const WARN_MS       = 3000; // show 3s warning before logout

let idleTimer, warnTimer, countdownInterval;

// --- Build slide-up toast ---
const toast = document.createElement('div');
toast.id = 'idleToast';
toast.className = 'idle-toast';
toast.setAttribute('role', 'status');
toast.setAttribute('aria-live', 'polite');

toast.innerHTML = `
  <div class="idle-toast__content">
    <strong>Session timing out</strong>
    <span><span id="idleCountdown">60</span>s left</span>
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

// --- Cross-tab heartbeat key ---
const HEARTBEAT_KEY = 'zportal:lastActivity';

// --- Helpers ---
function hideToast() {
  toast.classList.remove('show');
}

function showToast(seconds = 60) {
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
  showToast(WARN_MS / 1000);
}

async function doLogout() {
  try { await signOut(auth); } catch (_) {}
  localStorage.setItem('idleLogout', '1');
  window.location.href = './login.html';
}

function scheduleTimers() {
  // schedule new warning and logout
  warnTimer = setTimeout(showWarning, IDLE_LIMIT_MS - WARN_MS);
  idleTimer = setTimeout(doLogout, IDLE_LIMIT_MS);
}

function resetTimers() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  clearInterval(countdownInterval);
  hideToast();
  scheduleTimers();
}

function markActive() {
  // Update shared heartbeat so other tabs reset too
  localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
}

// --- Wire controls ---
stayBtn.addEventListener('click', () => {
  markActive();
  resetTimers();
});

logoutBtn.addEventListener('click', () => {
  doLogout();
});

// Any activity = mark active + reset timers
['mousemove','keydown','scroll','touchstart','click'].forEach(evt => {
  document.addEventListener(evt, () => {
    markActive();
    resetTimers();
  }, { passive: true });
});

// Listen for activity from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === HEARTBEAT_KEY) {
    // Another tab reported activity → keep this tab alive too
    resetTimers();
  }
});

// Kick off timers on load
markActive();
resetTimers();
