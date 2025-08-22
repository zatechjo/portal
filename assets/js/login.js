import { auth } from './firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const form = document.getElementById('login-form');
const err = document.getElementById('loginErr');
const forgot = document.getElementById('forgotLink');

/* --- Show "signed out due to inactivity" top popup --- */
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

    // slide in
    requestAnimationFrame(() => banner.classList.add('show'));

    // auto-hide after 5s or on dismiss
    const close = () => banner.classList.remove('show');
    document.getElementById('idleTopDismiss')?.addEventListener('click', close);
    setTimeout(close, 5000);
  }
})();

/* --- Login form --- */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.textContent = '';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = './index.html';
  } catch (error) {
    err.textContent = error.message;
  }
});

/* --- Forgot password --- */
forgot?.addEventListener('click', async (e) => {
  e.preventDefault();
  err.textContent = '';
  const email = document.getElementById('email').value;
  if (!email) {
    err.textContent = 'Enter your email first.';
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    err.textContent = 'Password reset email sent.';
  } catch (error) {
    err.textContent = error.message;
  }
});
