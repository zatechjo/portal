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
  const EMPTY_STATE_HTML = body.innerHTML;
  let pending = false;
  let requestSeq = 0;

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
  function showMessagesView() {
    const hero = document.getElementById("irisHero");
    if (hero) hero.style.display = "none";
    body.style.display = "";
    body.style.flex = "1";
    body.style.minHeight = "0";
  }

  function showWelcomeView() {
    const hero = document.getElementById("irisHero");
    if (hero) hero.style.display = "";
    if (chat.classList.contains("dash-iris-embed")) {
      body.style.display = "none";
      body.style.flex = "";
      body.style.minHeight = "";
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function formatInline(text) {
    return escapeHTML(text)
      .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(\$-?\d[\d,]*(?:\.\d{1,2})?)/g, '<span class="ai-money">$1</span>')
      .replace(/\b(-?\d+(?:\.\d+)?%)/g, '<span class="ai-percent">$1</span>');
  }

  function renderListItem(text) {
    const match = String(text || "").match(/^([^:]{1,44}):\s*(.+)$/);
    if (!match) return formatInline(text);

    return `
      <span class="ai-item-label">${formatInline(match[1])}</span>
      <span class="ai-item-value">${formatInline(match[2])}</span>
    `;
  }

  function renderAssistantContent(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) return "";

    const lines = normalized.split("\n");
    let html = "";
    let inList = false;

    const closeList = () => {
      if (!inList) return;
      html += "</ul>";
      inList = false;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        closeList();
        continue;
      }

      const bullet = line.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        if (!inList) {
          html += '<ul class="ai-list">';
          inList = true;
        }
        html += `<li>${renderListItem(bullet[1])}</li>`;
        continue;
      }

      closeList();

      const callout = line.match(/^(Net|Bottom line|Summary|Heads up|Note):\s*(.+)$/i);
      if (callout) {
        html += `<p class="ai-callout"><span class="ai-callout-label">${formatInline(callout[1])}</span>${formatInline(callout[2])}</p>`;
      } else {
        html += `<p>${formatInline(line)}</p>`;
      }
    }

    closeList();
    return `<div class="ai-rich">${html}</div>`;
  }

  function addMsg(role, text) {
    showMessagesView();

    const wrap   = document.createElement("div");
    wrap.className = `ai-msg ${role}`;
    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";

    if (role === "ai") {
      bubble.innerHTML = renderAssistantContent(text);
    } else {
      bubble.textContent = String(text || "").replace(/\r\n/g, "\n").trim();
    }

    wrap.appendChild(bubble);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  function renderHistory() {
    if (!history.length) {
      body.innerHTML = EMPTY_STATE_HTML;
      showWelcomeView();
      return;
    }

    body.innerHTML = "";
    showMessagesView();
    for (const m of history) addMsg(m.role === "assistant" ? "ai" : "user", m.content);
  }
  renderHistory();

  // Do NOT add a local intro message — #irisHero is the welcome state.
  // An auto-intro here would immediately trigger the MutationObserver
  // → activateChat() → hide the suggestion chips before the user types anything.

  function resetChat() {
    requestSeq++;
    pending = false;
    send.disabled = false;
    input.value = "";
    history = [];
    try { sessionStorage.removeItem(KEY); } catch {}
    renderHistory();
    input.focus();
  }

  function buildResetIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 12a9 9 0 1 0 3-6.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 3v6h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function installResetButton(container, extraClass = "") {
    if (!container || container.querySelector(".ai-reset-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ai-icon-btn ai-reset-btn${extraClass}`;
    btn.title = "Reset chat";
    btn.setAttribute("aria-label", "Reset Iris chat");
    btn.innerHTML = buildResetIcon();
    btn.addEventListener("click", resetChat);
    container.prepend(btn);
  }

  function installResetButtons() {
    installResetButton(chat.querySelector(".ai-chat-actions"));

    const embedHeader = chat.querySelector(".iris-embed-header");
    if (!embedHeader) return;

    let actions = embedHeader.querySelector(".iris-embed-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "iris-embed-actions";
      embedHeader.appendChild(actions);
    }
    installResetButton(actions, " iris-reset-btn");
  }

  window.IrisResetChat = resetChat;
  installResetButtons();

  window.addEventListener("iris:reset", resetChat);

  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    history = loadHistory();
    renderHistory();
  });

  async function getRequestHeaders() {
    const headers = { "Content-Type": "application/json" };
    try {
      const token = await window.__getIrisAuthToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn("Iris widget: could not get auth token", err);
    }
    return headers;
  }

  function getRequestContext() {
    let timezone = "Asia/Amman";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
    } catch {}

    return {
      page: window.location.pathname || "/",
      title: document.title || "",
      timezone,
      now: new Date().toISOString(),
      clientVersion: "iris-widget-v2",
    };
  }

  // ===== Send =====
  async function sendMsg() {
    if (pending) return;
    const text = (input.value || "").trim();
    if (!text) return;

    pending = true;
    const requestId = ++requestSeq;
    send.disabled = true;
    showMessagesView();
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
        headers: await getRequestHeaders(),
        body: JSON.stringify({
          messages: history,
          maxTurns: MAX_TURNS,
          user: window.__irisUser || null,
          context: getRequestContext(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      thinkingEl.remove();
      if (requestId !== requestSeq) return;

      if (!res.ok) {
        const fallback = res.status === 401
          ? "Please refresh and sign in again, then ask me once more."
          : "Server error.";
        addMsg("ai", data?.error || fallback);
        return;
      }

      const reply = (data?.reply || "").trim() || "…";
      addMsg("ai", reply);

      history.push({ role: "assistant", content: reply });
      history = trimHistory(history);
      saveHistory(history);
    } catch {
      thinkingEl.remove();
      if (requestId !== requestSeq) return;
      addMsg("ai", "Network error.");
    } finally {
      if (requestId === requestSeq) {
        pending = false;
        send.disabled = false;
      }
    }
  }

  send.addEventListener("click", sendMsg);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  });

  // Chip quick-prompts (delegated so they work after renderHistory clears body)
  body.addEventListener("click", (e) => {
    const chip = e.target.closest(".ai-chip");
    if (!chip) return;
    const prompt = chip.dataset.prompt;
    if (!prompt) return;
    input.value = prompt;
    sendMsg();
  });
})();
