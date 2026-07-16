// OpenAgentX Content Script
(() => {
  if (window.__OAX_CONTENT_LOADED__) return;
  window.__OAX_CONTENT_LOADED__ = true;

  function extractPage() {
    const MAX = 50 * 1024; // 50KB
    const meta = {};
    document.querySelectorAll('meta[name], meta[property]').forEach((m) => {
      const key = m.getAttribute("name") || m.getAttribute("property");
      const val = m.getAttribute("content");
      if (key && val) meta[key] = val;
    });

    const headings = [];
    document.querySelectorAll("h1, h2, h3").forEach((h) => {
      const t = (h.textContent || "").trim();
      if (t) headings.push({ tag: h.tagName.toLowerCase(), text: t });
    });

    const jsonld = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        jsonld.push(JSON.parse(s.textContent));
      } catch (_) {}
    });

    let text = (document.body?.innerText || "").trim();
    if (text.length > MAX) text = text.slice(0, MAX) + "\n...[truncated]";

    return {
      url: location.href,
      title: document.title,
      meta,
      headings,
      jsonld,
      text,
      extractedAt: new Date().toISOString(),
    };
  }

  function extractSelection() {
    const sel = window.getSelection();
    return {
      url: location.href,
      title: document.title,
      selection: sel ? sel.toString() : "",
      extractedAt: new Date().toISOString(),
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (msg?.type === "extractPage") {
        sendResponse(extractPage());
      } else if (msg?.type === "extractSelection") {
        sendResponse(extractSelection());
      }
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true;
  });
})();
