import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    // Optional: Restrict to zatechjo.com emails only
    if (!userCred.user.email.endsWith("@zatechjo.com")) {
      alert("Only @zatechjo.com emails are allowed.");
      return;
    }

    // Redirect to dashboard
    window.location.href = "/dashboard.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});
