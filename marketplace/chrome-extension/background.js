// OpenAgentX Service Worker (MV3)
const API_BASE = "https://openagentx.org/api/v1";

// 상태: 가장 최근 결과 (sidepanel이 열릴 때 가져감)
let latestResult = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "oax-analyze-page",
    title: "OpenAgentX로 분석",
    contexts: ["page"],
  });
  chrome.contextMenus.create({
    id: "oax-analyze-selection",
    title: "선택 영역 분석",
    contexts: ["selection"],
  });

  // sidepanel 자동 동작
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: false })
      .catch(() => {});
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  try {
    const msgType = info.menuItemId === "oax-analyze-selection" ? "extractSelection" : "extractPage";
    let pageData;
    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { type: msgType });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      pageData = await chrome.tabs.sendMessage(tab.id, { type: msgType });
    }
    if (chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
    // 컨텍스트 메뉴는 사용자가 sidepanel에서 에이전트 선택하도록 유도
    await pushResult({
      pending: true,
      contextSource: pageData,
      message: "에이전트를 선택하여 실행하세요. (popup 사용)",
    });
  } catch (err) {
    await pushResult({ error: err.message });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "runAgent") {
      try {
        await pushResult({
          loading: true,
          itemName: msg.itemName,
          itemType: msg.itemType,
          input: msg.input,
        });
        const result = await runAgent(msg);
        await pushResult({
          itemName: msg.itemName,
          itemType: msg.itemType,
          itemId: msg.itemId,
          input: msg.input,
          output: result,
          ts: Date.now(),
        });
        sendResponse({ ok: true });
      } catch (err) {
        await pushResult({ error: err.message, itemName: msg.itemName });
        sendResponse({ ok: false, error: err.message });
      }
    } else if (msg?.type === "getLatestResult") {
      sendResponse(latestResult);
    } else if (msg?.type === "rerun") {
      try {
        if (!latestResult || !latestResult.itemId) throw new Error("재실행할 항목 없음");
        await pushResult({ loading: true, ...latestResult });
        const result = await runAgent({
          itemType: latestResult.itemType,
          itemId: latestResult.itemId,
          itemName: latestResult.itemName,
          input: latestResult.input,
        });
        await pushResult({ ...latestResult, output: result, ts: Date.now() });
        sendResponse({ ok: true });
      } catch (err) {
        await pushResult({ ...latestResult, error: err.message });
        sendResponse({ ok: false, error: err.message });
      }
    }
  })();
  return true;
});

async function runAgent({ itemType, itemId, input }) {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) throw new Error("API 키 미설정. 옵션에서 키를 등록하세요.");

  const inputText = formatInput(input);
  let url, body;
  if (itemType === "prompt") {
    url = `${API_BASE}/prompts/${encodeURIComponent(itemId)}/run`;
    body = { input: inputText, context: input };
  } else {
    url = `${API_BASE}/agents/${encodeURIComponent(itemId)}/run`;
    body = { input: inputText, context: input };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("API 키 만료/무효, 설정 다시 확인");
    if (res.status === 402) throw new Error("잔액 부족");
    if (res.status >= 500) throw new Error("서버 에러, 잠시 후 재시도");
    const txt = await res.text().catch(() => "");
    throw new Error(`요청 실패 (${res.status}): ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

function formatInput(input) {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (input.selection) return input.selection;
  const parts = [];
  if (input.title) parts.push(`# ${input.title}`);
  if (input.url) parts.push(`URL: ${input.url}`);
  if (input.headings?.length) {
    parts.push("## Headings");
    input.headings.slice(0, 20).forEach((h) => parts.push(`- (${h.tag}) ${h.text}`));
  }
  if (input.text) {
    parts.push("## Content");
    parts.push(input.text);
  }
  return parts.join("\n\n");
}

async function pushResult(payload) {
  latestResult = payload;
  try {
    await chrome.runtime.sendMessage({ type: "resultUpdate", payload });
  } catch (_) {
    // sidepanel이 아직 안 열려 있으면 무시 (열릴 때 getLatestResult로 가져감)
  }
}
