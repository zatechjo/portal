// assets/js/idle.js
import { auth } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

export const IDLE_LIMIT_MS = 5000; // 5 seconds (testing)
export const WARN_MS = 3000;

let idleTimer, warnTimer, countdownInterval;

// ---- Create slide-up toast (bottom) ----
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
const stayBtn = toast.querySelector('#idleStayBtn');
const logoutBtn = toast.querySelector('#idleLogoutBtn');

// ---- Core helpers ----
function hideToast() {
  toast.classList.remove('show');
}

function showToast(seconds = 60) {
  // reset countdown
  clearInterval(countdownInterval);
  countdownEl.textContent = String(seconds);
  toast.classList.add('show');

  // tick down
  let remaining = seconds;
  countdownInterval = setInterval(() => {
    remaining -= 1;
    countdownEl.textContent = String(remaining);
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      doLogout(); // time's up
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

function resetTimers() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  clearInterval(countdownInterval);
  hideToast();

  // schedule new warning and logout
  warnTimer = setTimeout(showWarning, IDLE_LIMIT_MS - WARN_MS);
  idleTimer = setTimeout(doLogout, IDLE_LIMIT_MS);
}

// ---- Wire controls ----
stayBtn.addEventListener('click', () => {
  resetTimers();   // user stayed active
});

logoutBtn.addEventListener('click', () => {
  doLogout();
});

// Activity = reset idle timers
['mousemove','keydown','scroll','touchstart','click'].forEach(evt => {
  document.addEventListener(evt, resetTimers, { passive: true });
});

// Kick off timers on load
resetTimers();
