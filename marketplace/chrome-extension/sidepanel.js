// OpenAgentX SidePanel
const $ = (s) => document.querySelector(s);

let currentResult = null;

function setLoading(on) {
  $("#loadingBox").classList.toggle("hidden", !on);
  if (on) {
    $("#errorBox").classList.add("hidden");
    $("#contentBox").innerHTML = "";
  }
}

function showError(msg) {
  $("#errorBox").textContent = msg;
  $("#errorBox").classList.remove("hidden");
  $("#loadingBox").classList.add("hidden");
}

function renderResult(payload) {
  currentResult = payload;
  if (!payload) {
    $("#contentBox").innerHTML = '<p style="color:#6b7280">popup에서 에이전트를 선택하세요.</p>';
    return;
  }
  if (payload.loading) {
    $("#agentName").textContent = payload.itemName || "OpenAgentX";
    $("#agentMeta").textContent = payload.itemType === "prompt" ? "프롬프트" : "에이전트";
    setLoading(true);
    return;
  }
  if (payload.error) {
    $("#agentName").textContent = payload.itemName || "OpenAgentX";
    $("#agentMeta").textContent = "오류";
    showError(payload.error);
    return;
  }
  if (payload.pending) {
    $("#agentName").textContent = "대기 중";
    $("#agentMeta").textContent = "popup에서 에이전트를 선택하세요";
    $("#contentBox").innerHTML = '<p style="color:#6b7280">popup을 열고 실행할 에이전트/프롬프트를 클릭하세요.</p>';
    setLoading(false);
    return;
  }

  $("#agentName").textContent = payload.itemName || "결과";
  $("#agentMeta").textContent = payload.itemType === "prompt" ? "프롬프트" : "에이전트";
  setLoading(false);
  $("#errorBox").classList.add("hidden");

  const text = extractText(payload.output);
  $("#contentBox").innerHTML = renderMarkdown(text);
}

function extractText(output) {
  if (output == null) return "";
  if (typeof output === "string") return output;
  if (output.output) return typeof output.output === "string" ? output.output : JSON.stringify(output.output, null, 2);
  if (output.result) return typeof output.result === "string" ? output.result : JSON.stringify(output.result, null, 2);
  if (output.text) return output.text;
  if (output.content) return typeof output.content === "string" ? output.content : JSON.stringify(output.content, null, 2);
  if (output.message) return output.message;
  return JSON.stringify(output, null, 2);
}

// Minimal markdown renderer (no external deps)
function renderMarkdown(md) {
  if (!md) return "";
  const escape = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  let html = escape(md);
  // code blocks
  html = html.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_m, _lang, code) => `<pre><code>${code}</code></pre>`);
  // inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // headings
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, "$1<em>$2</em>");
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // blockquotes
  html = html.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");
  // unordered list
  html = html.replace(/(^|\n)((?:- .*(?:\n|$))+)/g, (_m, pre, block) => {
    const items = block.trim().split(/\n/).map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `${pre}<ul>${items}</ul>`;
  });
  // ordered list
  html = html.replace(/(^|\n)((?:\d+\. .*(?:\n|$))+)/g, (_m, pre, block) => {
    const items = block.trim().split(/\n/).map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `${pre}<ol>${items}</ol>`;
  });
  // paragraphs
  html = html
    .split(/\n{2,}/)
    .map((chunk) => {
      if (/^\s*<(h\d|pre|ul|ol|blockquote|table)/.test(chunk)) return chunk;
      return `<p>${chunk.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
  return html;
}

async function init() {
  const latest = await chrome.runtime.sendMessage({ type: "getLatestResult" }).catch(() => null);
  renderResult(latest);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "resultUpdate") renderResult(msg.payload);
  });

  $("#copyBtn").addEventListener("click", () => {
    const text = $("#contentBox").innerText;
    navigator.clipboard.writeText(text).then(() => {
      $("#copyBtn").textContent = "✓";
      setTimeout(() => ($("#copyBtn").textContent = "📋"), 1200);
    });
  });

  $("#rerunBtn").addEventListener("click", async () => {
    if (!currentResult?.itemId) return;
    setLoading(true);
    await chrome.runtime.sendMessage({ type: "rerun" });
  });

  $("#otherBtn").addEventListener("click", () => {
    // popup 열기 안내
    chrome.action?.openPopup?.().catch(() => {
      alert("툴바의 OpenAgentX 아이콘을 클릭하여 다른 에이전트를 선택하세요.");
    });
  });
}

init();
