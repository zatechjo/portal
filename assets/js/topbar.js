// TOPBAR SCRIPT
document.addEventListener("DOMContentLoaded", () => {
 /* ===== TODAY DATE ===== */
  const todayBadge = document.getElementById("todayBadge");
  if (todayBadge) {
    function updateDateTime() {
      const now = new Date();
      const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
      const rest = now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
      const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });
      todayBadge.textContent = `${weekday}, ${rest} — ${time}`;
    }

    updateDateTime();                 // show immediately
    setInterval(updateDateTime, 60000); // refresh every minute
  }

  /* ===== GREETING WORD BASED ON TIME ===== */
  const greetingWord = document.getElementById("greetingWord");
  if (greetingWord) {
    const hour = new Date().getHours();
    let word;

    if (hour < 12) {
      word = "Good morning";
    } else if (hour < 18) {
      word = "Good afternoon";
    } else {
      word = "Good evening";
    }

    greetingWord.textContent = word;
  }

  



/* ===== SEARCH BAR ===== */
const searchToggle = document.getElementById("searchToggle");
const searchWrap = document.getElementById("searchWrap");
const searchInput = document.getElementById("searchInput");
const searchGroup = document.querySelector(".search-group");

if (searchToggle && searchWrap && searchGroup) {
  // ensure initial state has no inner gap
  searchGroup.classList.add("sg-closed");
  searchGroup.classList.remove("sg-open");

  function openSearch() {
    // parent gap on
    searchGroup.classList.remove("sg-closed");
    searchGroup.classList.add("sg-open");

    // insert input into layout and animate
    searchWrap.style.display = "flex";
    requestAnimationFrame(() => {
      searchWrap.classList.add("open");
      searchWrap.setAttribute("aria-hidden", "false");
      setTimeout(() => searchInput && searchInput.focus(), 120);
    });
  }

  function closeSearch() {
    searchWrap.classList.remove("open");
    searchWrap.setAttribute("aria-hidden", "true");
    searchInput && searchInput.blur();

    // after animation ends: remove from layout + kill parent gap
    searchWrap.addEventListener(
      "transitionend",
      () => {
        if (!searchWrap.classList.contains("open")) {
          searchWrap.style.display = "none";
          searchGroup.classList.add("sg-closed");
          searchGroup.classList.remove("sg-open");
        }
      },
      { once: true }
    );
  }

  searchToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = searchWrap.classList.contains("open");
    isOpen ? closeSearch() : openSearch();
  });

  document.addEventListener("click", (e) => {
    if (
      searchWrap.classList.contains("open") &&
      !searchWrap.contains(e.target) &&
      e.target !== searchToggle
    ) {
      closeSearch();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchWrap.classList.contains("open")) {
      closeSearch();
    }
  });
}



  /* ===== ACCOUNT DROPDOWN ===== */
  const account = document.querySelector(".account");
  const btn = document.getElementById("accountBtn");
  const menu = document.getElementById("accountMenu");
  const logout = document.getElementById("logoutBtn");

  if (account && btn && menu) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = account.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", (e) => {
      if (!account.contains(e.target)) {
        account.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    // logout handled in auth-guard.js
  }
});
