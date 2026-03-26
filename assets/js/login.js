import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

/* ── DOM refs ── */
const form       = document.getElementById('login-form');
const err        = document.getElementById('loginErr');
const forgotLink = document.getElementById('forgotLink');
const loginBtn   = document.getElementById('loginBtn');
const pwToggle   = document.getElementById('pwToggle');
const pwInput    = document.getElementById('password');
const eyeIcon    = document.getElementById('eyeIcon');

/* ─────────────────────────────────────────
   Idle-logout banner
───────────────────────────────────────── */
(() => {
  if (localStorage.getItem('idleLogout') === '1') {
    localStorage.removeItem('idleLogout');

    const banner = document.createElement('div');
    banner.className = 'idle-top-toast';
    banner.innerHTML = `
      <span>You were signed out due to inactivity.</span>
      <button type="button" id="idleTopDismiss">Dismiss</button>
    `;
    document.body.appendChild(banner);

    requestAnimationFrame(() => banner.classList.add('show'));
    const close = () => banner.classList.remove('show');
    document.getElementById('idleTopDismiss')?.addEventListener('click', close);
    setTimeout(close, 5000);
  }
})();

/* ─────────────────────────────────────────
   Password show / hide toggle
───────────────────────────────────────── */
const eyeOpenSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;

const eyeClosedSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
             a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8
             a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;

pwToggle?.addEventListener('click', () => {
  const isHidden = pwInput.type === 'password';
  pwInput.type = isHidden ? 'text' : 'password';
  pwToggle.innerHTML = isHidden ? eyeClosedSVG : eyeOpenSVG;
  pwToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

/* ─────────────────────────────────────────
   Friendly Firebase error messages
───────────────────────────────────────── */
function friendlyError(code) {
  const map = {
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/too-many-requests':      'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and retry.',
    'auth/user-disabled':          'This account has been disabled. Contact support.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

/* ─────────────────────────────────────────
   Loading state helpers
───────────────────────────────────────── */
function setLoading(on) {
  if (!loginBtn) return;
  loginBtn.disabled = on;
  loginBtn.classList.toggle('loading', on);
}

/* ─────────────────────────────────────────
   Login form submit
───────────────────────────────────────── */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (err) err.textContent = '';

  const email    = document.getElementById('email')?.value.trim();
  const password = pwInput?.value;

  if (!email || !password) {
    if (err) err.textContent = 'Please fill in both fields.';
    return;
  }

  setLoading(true);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = '/';
  } catch (error) {
    if (err) err.textContent = friendlyError(error.code);
    setLoading(false);
  }
});

/* ─────────────────────────────────────────
   Forgot password
───────────────────────────────────────── */
forgotLink?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (err) err.textContent = '';

  const email = document.getElementById('email')?.value.trim();
  if (!email) {
    if (err) err.textContent = 'Enter your email address above first.';
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    if (err) {
      err.style.color = '#16a34a';
      err.textContent = 'Password reset email sent — check your inbox.';
    }
  } catch (error) {
    if (err) {
      err.style.color = '';
      err.textContent = friendlyError(error.code);
    }
  }
});