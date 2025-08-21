// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCY3-BhLigrarmnvP4oCcW_lTnv4nopLhc",
  authDomain: "zatech-portal.firebaseapp.com",
  projectId: "zatech-portal",
  storageBucket: "zatech-portal.firebasestorage.app",
  messagingSenderId: "886824261364",
  appId: "1:886824261364:web:37557b8a12e6d4f85db0a1",
  measurementId: "G-9EBPVCMPKY"
};

// Init
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
