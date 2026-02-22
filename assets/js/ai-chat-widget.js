(() => {
  const ENDPOINT = "https://eymqvzjwbolgmywpwhgi.supabase.co/functions/v1/iris";

  const fab = document.getElementById("aiFab");
  const chat = document.getElementById("aiChat");
  const closeBtn = document.getElementById("aiCloseBtn");
  const minBtn = document.getElementById("aiMinBtn");
  const body = document.getElementById("aiBody");
  const input = document.getElementById("aiInput");
  const send = document.getElementById("aiSend");

  if (!fab || !chat || !body || !input || !send) {
    console.error("Iris widget: missing elements");
    return;
  }

  // ===== Memory (SESSION ONLY) =====
  const KEY = "iris:history:v1";
  const MAX_TURNS = 16;

  // ✅ one-time cleanup: remove any old persisted history
  try {
    localStorage.removeItem(KEY);
  } catch {}

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(history));
    } catch {}
  }

  function trimHistory(history) {
    if (history.length <= MAX_TURNS) return history;
    return history.slice(history.length - MAX_TURNS);
  }

  let history = loadHistory(); // [{role:"user"/"assistant", content:"..."}]

  // ===== UI =====
  const open = () => {
    chat.classList.add("show");
    chat.setAttribute("aria-hidden", "false");
    setTimeout(() => input.focus(), 60);
  };

  const close = () => {
    chat.classList.remove("show");
    chat.setAttribute("aria-hidden", "true");
  };

  fab.addEventListener("click", () => (chat.classList.contains("show") ? close() : open()));
  closeBtn?.addEventListener("click", close);
  minBtn?.addEventListener("click", close);

  function addMsg(role, text) {
    const wrap = document.createElement("div");
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
    for (const m of history) {
      addMsg(m.role === "assistant" ? "ai" : "user", m.content);
    }
  }
  renderHistory();

  // ✅ One-time intro (only if chat is empty in this session)
    if (history.length === 0) {
    const intro = "Hi 👋 I’m Iris — how can I help?";
    addMsg("ai", intro);
    history.push({ role: "assistant", content: intro });
    saveHistory(history);
    }

  // Debug reset
  window.IrisResetChat = () => {
    history = [];
    try { sessionStorage.removeItem(KEY); } catch {}
    renderHistory();
  };

  async function sendMsg() {
    const text = (input.value || "").trim();
    if (!text) return;

    addMsg("user", text);
    input.value = "";

    // update memory
    history.push({ role: "user", content: text });
    history = trimHistory(history);
    saveHistory(history);

    // thinking bubble
    const thinkingEl = document.createElement("div");
    thinkingEl.className = "ai-msg ai";
    thinkingEl.innerHTML = `<div class="ai-bubble">Thinking...</div>`;
    body.appendChild(thinkingEl);
    body.scrollTop = body.scrollHeight;

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, maxTurns: MAX_TURNS }),
      });

      const data = await res.json().catch(() => ({}));
      thinkingEl.remove();

      if (!res.ok) {
        addMsg("ai", data?.error || "Server error.");
        return;
      }

      const reply = (data?.reply || "").trim() || "…";
      addMsg("ai", reply);

      // update memory
      history.push({ role: "assistant", content: reply });
      history = trimHistory(history);
      saveHistory(history);
    } catch (err) {
      thinkingEl.remove();
      addMsg("ai", "Network error.");
    }
  }

  send.addEventListener("click", sendMsg);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMsg();
  });
})();