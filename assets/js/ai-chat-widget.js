(() => {
  const ENDPOINT = "https://eymqvzjwbolgmywpwhgi.supabase.co/functions/v1/iris";

  const fab      = document.getElementById("aiFab");
  const chat     = document.getElementById("aiChat");
  const closeBtn = document.getElementById("aiCloseBtn");
  const minBtn   = document.getElementById("aiMinBtn");
  const body     = document.getElementById("aiBody");
  const input    = document.getElementById("aiInput");
  const send     = document.getElementById("aiSend");

  if (!fab || !chat || !body || !input || !send) {
    console.error("Iris widget: missing elements");
    return;
  }

  // ===== Memory (SESSION ONLY) =====
  const KEY      = "iris:history:v1";
  const MAX_TURNS = 8;

  try { localStorage.removeItem(KEY); } catch {}

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function saveHistory(h) {
    try { sessionStorage.setItem(KEY, JSON.stringify(h)); } catch {}
  }

  function trimHistory(h) {
    return h.length <= MAX_TURNS ? h : h.slice(h.length - MAX_TURNS);
  }

  let history = loadHistory();

  // ===== Open / Close =====
  const isMobile = () => window.innerWidth <= 768;

  const openChat = () => {
    if (isMobile()) {
      // Step 1: make it flex (display) so it's in the layout
      chat.style.display = "flex";
      // Step 2: force a reflow so the browser registers the display change
      chat.offsetHeight;
      // Step 3: now add .show which sets transform:translateY(0) — animates cleanly
      chat.classList.add("show");
    } else {
      chat.classList.add("show");
    }
    chat.setAttribute("aria-hidden", "false");
    document.body.classList.add("iris-open");
    if (isMobile()) document.body.style.overflow = "hidden";
    setTimeout(() => input.focus(), 60);
  };

  const closeChat = () => {
    if (isMobile()) {
      // Remove .show → transform slides back down
      chat.classList.remove("show");
      // After animation finishes, hide from layout
      setTimeout(() => {
        if (!chat.classList.contains("show")) chat.style.display = "";
      }, 320);
    } else {
      chat.classList.remove("show");
    }
    chat.setAttribute("aria-hidden", "true");
    document.body.classList.remove("iris-open");
    document.body.style.overflow = "";
    input.blur();
  };

  fab.addEventListener("click", () =>
    chat.classList.contains("show") ? closeChat() : openChat()
  );
  closeBtn?.addEventListener("click", closeChat);
  minBtn?.addEventListener("click", closeChat);

  // Desktop only: close on backdrop click (not on mobile — panel is fixed)
  document.addEventListener("click", (e) => {
    if (
      !isMobile() &&
      chat.classList.contains("show") &&
      !chat.contains(e.target) &&
      e.target !== fab
    ) closeChat();
  });

  // Swipe-to-dismiss removed — mobile chat is a fixed panel, close via X button only

  // ===== Messages =====
  function addMsg(role, text) {
    const wrap   = document.createElement("div");
    wrap.className = `ai-msg ${role}`;
    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    bubble.textContent = String(text || "").replace(/\r\n/g, "\n").trim();
    wrap.appendChild(bubble);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function renderHistory() {
    body.innerHTML = "";
    for (const m of history) addMsg(m.role === "assistant" ? "ai" : "user", m.content);
  }
  renderHistory();

  // Do NOT add a local intro message — #irisHero is the welcome state.
  // An auto-intro here would immediately trigger the MutationObserver
  // → activateChat() → hide the suggestion chips before the user types anything.

  // Debug reset
  window.IrisResetChat = () => {
    history = [];
    try { sessionStorage.removeItem(KEY); } catch {}
    renderHistory();
  };

  // ===== Send =====
  async function sendMsg() {
    const text = (input.value || "").trim();
    if (!text) return;

    addMsg("user", text);
    input.value = "";

    history.push({ role: "user", content: text });
    history = trimHistory(history);
    saveHistory(history);

    const thinkingEl = document.createElement("div");
    thinkingEl.className = "ai-msg ai";
    thinkingEl.innerHTML = `<div class="ai-bubble">Thinking...</div>`;
    body.appendChild(thinkingEl);
    body.scrollTop = body.scrollHeight;

    try {
      const res  = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          maxTurns: MAX_TURNS,
          user: window.__irisUser || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      thinkingEl.remove();

      if (!res.ok) { addMsg("ai", data?.error || "Server error."); return; }

      const reply = (data?.reply || "").trim() || "…";
      addMsg("ai", reply);

      history.push({ role: "assistant", content: reply });
      history = trimHistory(history);
      saveHistory(history);
    } catch {
      thinkingEl.remove();
      addMsg("ai", "Network error.");
    }
  }

  send.addEventListener("click", sendMsg);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) sendMsg();
  });
})();