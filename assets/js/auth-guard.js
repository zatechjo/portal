import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not logged in → redirect to login
    window.location.href = "/login.html";
  } else {
    console.log("Welcome:", user.email);
  }
});

// Logout button
document.getElementById("logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/login.html";
});
