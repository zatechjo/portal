import { auth } from './firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const form = document.getElementById('login-form');
const err = document.getElementById('loginErr');
const forgot = document.getElementById('forgotLink');
const idleBanner = document.getElementById('idleBanner');

// show idle logout banner if needed
if (idleBanner && localStorage.getItem('idleLogout') === '1') {
  idleBanner.style.display = 'block';
  localStorage.removeItem('idleLogout');
}

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
