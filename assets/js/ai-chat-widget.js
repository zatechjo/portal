(() => {
  const ENDPOINT = "https://eymqvzjwbolgmywpwhgi.supabase.co/functions/v1/iris";

  const fab      = document.getElementById("aiFab");
  const chat     = document.getElementById("aiChat");
  const closeBtn = document.getElementById("aiCloseBtn");
  const minBtn   = document.getElementById("aiMinBtn");
  const body     = document.getElementById("aiBody");

  // Upgrade <input id="aiInput"> → <textarea> so it can auto-grow with multi-line content.
  (function upgradeInputToTextarea() {
    const old = document.getElementById("aiInput");
    if (!old || old.tagName === "TEXTAREA") return;
    const ta = document.createElement("textarea");
    ta.id = "aiInput";
    ta.className = old.className;
    ta.placeholder = old.placeholder || "";
    ta.rows = 1;
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("spellcheck", "true");
    old.replaceWith(ta);
  })();

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
  let expandBtn = null;

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
    return wrap;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Walk text nodes and reveal them progressively for a typewriter feel.
  async function typewriteAssistant(bubble, text, reqId) {
    bubble.innerHTML = renderAssistantContent(text);
    const cursor = document.createElement("span");
    cursor.className = "ai-typing-cursor";
    bubble.appendChild(cursor);

    const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.classList.contains("ai-typing-cursor"))
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
    });
    const segments = [];
    let n;
    while ((n = walker.nextNode())) {
      segments.push({ node: n, full: n.nodeValue });
      n.nodeValue = "";
    }

    // Tune speed by total length so long replies aren't agonizing.
    const totalLen = segments.reduce((s, x) => s + x.full.length, 0);
    const chunkSize = totalLen > 600 ? 4 : totalLen > 250 ? 2 : 1;
    const frameDelay = totalLen > 600 ? 8 : 14;

    for (const seg of segments) {
      const { node, full } = seg;
      for (let i = 0; i < full.length; i += chunkSize) {
        if (reqId !== requestSeq) return;
        node.nodeValue = full.slice(0, Math.min(i + chunkSize, full.length));
        await sleep(frameDelay);
      }
      node.nodeValue = full;
    }
    cursor.remove();
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
    installExpandButton(actions);
  }

  window.IrisResetChat = resetChat;
  installResetButtons();

  window.addEventListener("iris:reset", resetChat);

  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    history = loadHistory();
    renderHistory();
  });

  function isDesktopExpandAllowed() {
    return window.matchMedia("(min-width: 1101px)").matches;
  }

  function buildExpandIcon(expanded = false) {
    if (expanded) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 3v5H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 3v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 21v-5H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 21v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 9V3h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 9V3h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 15v6h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 15v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function syncExpandButton() {
    if (!expandBtn) return;
    const slot = chat.closest(".dash-iris-slot");
    const expanded = Boolean(slot?.classList.contains("iris-expanded"));
    const allowed = isDesktopExpandAllowed();
    expandBtn.hidden = !allowed;
    expandBtn.disabled = !allowed;
    expandBtn.setAttribute("aria-pressed", String(expanded));
    expandBtn.title = expanded ? "Collapse Iris" : "Expand Iris";
    expandBtn.setAttribute("aria-label", expanded ? "Collapse Iris" : "Expand Iris");
    expandBtn.innerHTML = buildExpandIcon(expanded);
  }

  function setIrisExpanded(expanded, animate = true) {
    const slot = chat.closest(".dash-iris-slot");
    if (!slot) return;

    const nextExpanded = Boolean(expanded && isDesktopExpandAllowed());
    const wasExpanded = slot.classList.contains("iris-expanded");
    if (wasExpanded === nextExpanded) {
      syncExpandButton();
      return;
    }

    const before = animate ? slot.getBoundingClientRect() : null;
    slot.classList.toggle("iris-expanded", nextExpanded);
    chat.classList.toggle("iris-expanded", nextExpanded);
    syncExpandButton();

    if (!animate || !before) return;

    const after = slot.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    const sx = before.width / Math.max(after.width, 1);
    const sy = before.height / Math.max(after.height, 1);

    if (typeof slot.animate !== "function") return;

    slot.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: "translate(0, 0) scale(1, 1)" },
      ],
      { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }

  function installExpandButton(container) {
    if (!chat.classList.contains("dash-iris-embed") || !container || container.querySelector(".ai-expand-btn")) return;
    expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "ai-icon-btn ai-expand-btn";
    expandBtn.addEventListener("click", () => {
      const slot = chat.closest(".dash-iris-slot");
      setIrisExpanded(!slot?.classList.contains("iris-expanded"));
    });
    container.appendChild(expandBtn);
    syncExpandButton();
  }

  const expandMq = window.matchMedia("(min-width: 1101px)");
  const onExpandViewportChange = () => {
    if (!isDesktopExpandAllowed()) setIrisExpanded(false, false);
    syncExpandButton();
  };
  if (expandMq.addEventListener) expandMq.addEventListener("change", onExpandViewportChange);
  else if (expandMq.addListener) expandMq.addListener(onExpandViewportChange);

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
    const userWrap = addMsg("user", text);
    input.value = "";
    autosizeInput();

    history.push({ role: "user", content: text });
    history = trimHistory(history);
    saveHistory(history);

    // Spacer below user msg gives enough room to scroll the user bubble to the top.
    const spacer = document.createElement("div");
    spacer.className = "ai-spacer";
    spacer.style.flex = "0 0 auto";
    spacer.style.minHeight = body.clientHeight + "px";
    body.appendChild(spacer);

    const thinkingEl = document.createElement("div");
    thinkingEl.className = "ai-msg ai";
    thinkingEl.innerHTML = `<div class="ai-bubble ai-thinking"><span></span><span></span><span></span></div>`;
    body.insertBefore(thinkingEl, spacer);

    // Anchor user's question near the top of the chat body (no page scroll).
    requestAnimationFrame(() => {
      if (!userWrap) return;
      const userRect = userWrap.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const top = body.scrollTop + (userRect.top - bodyRect.top) - 8;
      if (typeof body.scrollTo === "function") {
        body.scrollTo({ top, behavior: "smooth" });
      } else {
        body.scrollTop = top;
      }
    });

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
      if (requestId !== requestSeq) { spacer.remove(); return; }

      if (!res.ok) {
        const fallback = res.status === 401
          ? "Please refresh and sign in again, then ask me once more."
          : "Server error.";
        const errWrap = addMsg("ai", "");
        const errBubble = errWrap.querySelector(".ai-bubble");
        await typewriteAssistant(errBubble, data?.error || fallback, requestId);
        spacer.remove();
        return;
      }

      const reply = (data?.reply || "").trim() || "…";
      const aiWrap = document.createElement("div");
      aiWrap.className = "ai-msg ai";
      const aiBubble = document.createElement("div");
      aiBubble.className = "ai-bubble";
      aiWrap.appendChild(aiBubble);
      body.insertBefore(aiWrap, spacer);

      await typewriteAssistant(aiBubble, reply, requestId);
      spacer.remove();

      history.push({ role: "assistant", content: reply });
      history = trimHistory(history);
      saveHistory(history);
    } catch {
      thinkingEl.remove();
      spacer.remove();
      if (requestId !== requestSeq) return;
      addMsg("ai", "Network error.");
    } finally {
      if (requestId === requestSeq) {
        pending = false;
        send.disabled = false;
      }
    }
  }

  function autosizeInput() {
    if (!input || input.tagName !== "TEXTAREA") return;
    input.style.height = "auto";
    const max = 120;
    const next = Math.min(input.scrollHeight, max);
    input.style.height = next + "px";
    input.style.overflowY = input.scrollHeight > max ? "auto" : "hidden";
  }

  send.addEventListener("click", sendMsg);
  input.addEventListener("input", autosizeInput);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  });
  autosizeInput();

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
