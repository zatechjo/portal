import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = './login.html';
    return;
  }
  const accountBtn = document.getElementById('accountBtn');
  if (accountBtn) {
    const name = user.displayName || user.email || '';
    const avatar = user.photoURL || './assets/img/user-icon.png';
    accountBtn.innerHTML = `<img class="avatar" src="${avatar}" alt="" /> ${name} <span class="caret">▾</span>`;
  }
});

logoutBtn?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = './login.html';
});
