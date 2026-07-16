// OpenAgentX Popup
const API_BASE = "https://openagentx.org/api/v1";

const state = {
  apiKey: null,
  agents: [],
  prompts: [],
  query: "",
  tab: "all",
};

const $ = (sel) => document.querySelector(sel);

async function init() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  state.apiKey = apiKey;

  if (!apiKey) {
    $("#apiKeyMissing").classList.remove("hidden");
    $("#loading").classList.add("hidden");
    return;
  }

  await loadCatalog();
  bindUI();
}

async function loadCatalog() {
  $("#loading").classList.remove("hidden");
  $("#errorBox").classList.add("hidden");

  try {
    const [agentsRes, promptsRes] = await Promise.allSettled([
      fetchAPI("/agents"),
      fetchAPI("/prompts"),
    ]);

    if (agentsRes.status === "fulfilled") {
      const agents = agentsRes.value?.data || agentsRes.value || [];
      state.agents = (Array.isArray(agents) ? agents : agents.items || []).filter(
        (a) => a.status === "active" || a.is_active || !("status" in a)
      );
    }
    if (promptsRes.status === "fulfilled") {
      const prompts = promptsRes.value?.data || promptsRes.value || [];
      state.prompts = Array.isArray(prompts) ? prompts : prompts.items || [];
    }

    render();
  } catch (err) {
    showError(err.message);
  } finally {
    $("#loading").classList.add("hidden");
  }
}

async function fetchAPI(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${state.apiKey}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("API 키 만료/무효. 설정에서 다시 확인하세요.");
    if (res.status === 402) throw new Error("잔액 부족.");
    throw new Error(`서버 오류 (${res.status})`);
  }
  return res.json();
}

function showError(msg) {
  const box = $("#errorBox");
  box.textContent = msg;
  box.classList.remove("hidden");
}

function bindUI() {
  $("#settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#openOptionsBtn")?.addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#searchInput").addEventListener("input", (e) => {
    state.query = e.target.value.toLowerCase();
    render();
  });
  document.querySelectorAll(".oax-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".oax-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.tab = btn.dataset.tab;
      render();
    });
  });
}

function render() {
  const grid = $("#catalog");
  grid.innerHTML = "";

  let items = [];
  if (state.tab === "all" || state.tab === "agents") {
    items = items.concat(
      state.agents.map((a) => ({
        type: "agent",
        id: a.id || a.slug,
        name: a.name || a.title || a.slug,
        category: a.category || "agent",
        raw: a,
      }))
    );
  }
  if (state.tab === "all" || state.tab === "prompts") {
    items = items.concat(
      state.prompts.map((p) => ({
        type: "prompt",
        id: p.slug || p.id,
        name: p.title || p.name || p.slug,
        category: p.category || "prompt",
        raw: p,
      }))
    );
  }

  if (state.query) {
    items = items.filter(
      (it) =>
        it.name.toLowerCase().includes(state.query) ||
        (it.category || "").toLowerCase().includes(state.query)
    );
  }

  if (items.length === 0) {
    grid.innerHTML = '<div class="oax-loading" style="grid-column:1/-1">결과 없음</div>';
    return;
  }

  for (const it of items) {
    const card = document.createElement("div");
    card.className = "oax-card";
    card.innerHTML = `
      <div class="oax-card-name">${escapeHtml(it.name)}</div>
      <div class="oax-card-meta">
        <span class="oax-badge ${it.type}">${it.type === "agent" ? "에이전트" : "프롬프트"}</span>
        ${it.category ? `<span class="oax-badge">${escapeHtml(it.category)}</span>` : ""}
      </div>
    `;
    card.addEventListener("click", () => runItem(it));
    grid.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function runItem(item) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("활성 탭 없음");

    // 페이지 콘텐츠 추출 요청
    let pageData;
    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { type: "extractPage" });
    } catch (e) {
      // content script가 없으면 주입
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      pageData = await chrome.tabs.sendMessage(tab.id, { type: "extractPage" });
    }

    // sidepanel 열기
    if (chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }

    // background에 실행 요청
    await chrome.runtime.sendMessage({
      type: "runAgent",
      itemType: item.type,
      itemId: item.id,
      itemName: item.name,
      input: pageData,
    });

    window.close();
  } catch (err) {
    showError(err.message);
  }
}

init();
