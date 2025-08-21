// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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
const auth = getAuth(app);

export { auth };
