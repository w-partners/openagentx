// OpenAgentX Options
const API_BASE = "https://openagentx.org/api/v1";
const $ = (s) => document.querySelector(s);

async function loadKey() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) $("#apiKey").value = apiKey;
}

function setStatus(msg, type) {
  const el = $("#status");
  el.textContent = msg;
  el.className = "opt-status " + type;
  el.classList.remove("hidden");
}

async function save() {
  const key = $("#apiKey").value.trim();
  if (!key) {
    setStatus("키를 입력하세요.", "err");
    return;
  }
  await chrome.storage.local.set({ apiKey: key });
  setStatus("저장되었습니다.", "ok");
}

async function test() {
  const key = $("#apiKey").value.trim();
  if (!key) {
    setStatus("키를 입력 후 테스트하세요.", "err");
    return;
  }
  setStatus("테스트 중...", "ok");
  try {
    const res = await fetch(`${API_BASE}/balance`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      const balance = j?.data?.balance ?? j?.balance;
      setStatus(`OK${balance != null ? ` — 잔액: ${balance}` : ""}`, "ok");
    } else if (res.status === 401) {
      setStatus("키가 유효하지 않습니다 (401).", "err");
    } else {
      setStatus(`오류 (${res.status})`, "err");
    }
  } catch (e) {
    setStatus(`네트워크 오류: ${e.message}`, "err");
  }
}

function toggleVisibility() {
  const inp = $("#apiKey");
  if (inp.type === "password") {
    inp.type = "text";
    $("#toggleBtn").textContent = "숨김";
  } else {
    inp.type = "password";
    $("#toggleBtn").textContent = "표시";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadKey();
  $("#saveBtn").addEventListener("click", save);
  $("#testBtn").addEventListener("click", test);
  $("#toggleBtn").addEventListener("click", toggleVisibility);
});
