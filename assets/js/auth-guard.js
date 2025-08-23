// assets/js/auth-guard.js
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const logoutBtn = document.getElementById('logoutBtn');

// --- Explicit email → display name map ---
const NAME_MAP = {
  'za@zatechjo.com': 'Zuhri',
  'ahmad-abuawwad@zatechjo.com': 'Ahmad',
  'info@zatechjo.com': 'ZAtech Team',
};

// --- Explicit email → avatar image map (paths in /assets/img) ---
const AVATAR_MAP = {
  'za@zatechjo.com': './assets/img/zuhri.png',
  'ahmad-abuawwad@zatechjo.com': './assets/img/ahmad.png',
  'info@zatechjo.com': './assets/img/favicon.png',
};

// --- Helpers ---
function resolveDisplayName(user) {
  if (!user) return '';
  const email = user.email || '';
  if (NAME_MAP[email]) return NAME_MAP[email];
  if (user.displayName && user.displayName.trim()) return user.displayName.trim();
  // fallback: email local part, prettified
  const local = (email.split('@')[0] || '').replace(/[._-]+/g, ' ');
  return local.replace(/\b\w/g, s => s.toUpperCase());
}

function resolveAvatar(user) {
  if (!user) return './assets/img/user-icon.png';
  const email = user.email || '';
  if (AVATAR_MAP[email]) return AVATAR_MAP[email];
  if (user.photoURL) return user.photoURL;
  return './assets/img/user-icon.png';
}

function resolveGreetingWord(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function applyGreeting(user) {
  const wordEl = document.getElementById('greetingWord');
  const nameEl = document.querySelector('.greet-name');
  if (!wordEl || !nameEl) return; // not all pages have the greeting
  wordEl.textContent = resolveGreetingWord();
  nameEl.textContent = resolveDisplayName(user);
}

function applyTopbarAccount(user) {
  const accountBtn = document.getElementById('accountBtn');
  if (!accountBtn) return;
  const name = resolveDisplayName(user) || user.email || '';
  const avatar = resolveAvatar(user);
  accountBtn.innerHTML = `<img class="avatar" src="${avatar}" alt="" /> ${name} <span class="caret">▾</span>`;
  // Optional: if you also have a separate topbar avatar element
  const topAvatar = document.querySelector('.top-avatar');
  if (topAvatar) topAvatar.setAttribute('src', avatar);
}

// --- Guard + topbar wiring ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = './login.html';
    return;
  }
  applyTopbarAccount(user);
  applyGreeting(user);
});

// --- Logout ---
logoutBtn?.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } finally {
    window.location.href = './login.html';
  }
});
