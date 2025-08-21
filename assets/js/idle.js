import { auth } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const WARN_MS = 60 * 1000;

let idleTimer, warnTimer, countdownInterval;

const modal = document.createElement('div');
modal.id = 'idleModal';
modal.className = 'idle-modal';
modal.innerHTML = `
  <div class="modal-box">
    <p>You will be signed out in <span id="idleCountdown">60</span>s due to inactivity.</p>
    <button id="staySignedIn" class="btn">Stay signed in</button>
  </div>
`;
document.body.appendChild(modal);
const countdownEl = modal.querySelector('#idleCountdown');
const stayBtn = modal.querySelector('#staySignedIn');

function resetTimers() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  clearInterval(countdownInterval);
  modal.classList.remove('show');
  warnTimer = setTimeout(showWarning, IDLE_LIMIT_MS - WARN_MS);
  idleTimer = setTimeout(doLogout, IDLE_LIMIT_MS);
}

function showWarning() {
  let remaining = WARN_MS / 1000;
  countdownEl.textContent = remaining;
  modal.classList.add('show');
  countdownInterval = setInterval(() => {
    remaining--;
    countdownEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
}

async function doLogout() {
  try { await signOut(auth); } catch (e) {}
  localStorage.setItem('idleLogout', '1');
  window.location.href = './login.html';
}

stayBtn.addEventListener('click', resetTimers);
['mousemove','keydown','scroll','touchstart','click'].forEach(evt => {
  document.addEventListener(evt, resetTimers, { passive: true });
});

resetTimers();
