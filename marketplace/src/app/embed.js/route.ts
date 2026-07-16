/**
 * GET /embed.js?token=oaw_xxx — 외부 사이트에 1줄 임베드용 vanilla JS
 *
 *  사용법:
 *    <script src="https://openagentx.org/embed.js?token=oaw_xxx" async></script>
 */
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildScript(origin: string): string {
  // ⚠️  template literal 안에 backtick/$ 사용 시 escape 필요
  return `(function(){
  'use strict';
  if (window.__OAX_WIDGET_LOADED__) return;
  window.__OAX_WIDGET_LOADED__ = true;

  var thisScript = document.currentScript;
  if (!thisScript) {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('/embed.js') !== -1) { thisScript = scripts[i]; break; }
    }
  }
  if (!thisScript) return;

  var srcUrl;
  try { srcUrl = new URL(thisScript.src); } catch(e) { return; }
  var token = srcUrl.searchParams.get('token');
  if (!token) { console.warn('[OpenAgentX] embed.js: token query param required'); return; }

  var API_BASE = ${JSON.stringify(origin)};
  var SESSION_KEY = 'oax_session_' + token;
  var sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  var config = null;
  var messages = []; // {role, text}

  function el(tag, props, children) {
    var e = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === 'style') for (var s in props.style) e.style[s] = props.style[s];
      else if (k === 'text') e.textContent = props.text;
      else if (k === 'html') e.innerHTML = props.html;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else e.setAttribute(k, props[k]);
    }
    if (children) for (var c = 0; c < children.length; c++) {
      if (children[c]) e.appendChild(children[c]);
    }
    return e;
  }

  function loadConfig(cb) {
    fetch(API_BASE + '/api/embed/config?token=' + encodeURIComponent(token))
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (j.success) { config = j.data; cb(); }
        else console.warn('[OpenAgentX] config failed', j);
      })
      .catch(function(err){ console.warn('[OpenAgentX] config error', err); });
  }

  function buildUI() {
    var color = (config && config.primary_color) || '#0EA5E9';
    var pos = (config && config.position) || 'bottom-right';
    var btnSide = pos === 'bottom-left' ? { left: '20px' } : { right: '20px' };
    var panelSide = pos === 'bottom-left' ? { left: '20px' } : { right: '20px' };

    // Floating button
    var btn = el('button', {
      'aria-label': 'Open chat',
      style: Object.assign({
        position: 'fixed', bottom: '20px', width: '56px', height: '56px',
        borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: color, color: '#fff', fontSize: '24px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        zIndex: '2147483646'
      }, btnSide),
      html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
    });

    // Panel
    var panel = el('div', {
      style: Object.assign({
        position: 'fixed', bottom: '90px', width: '380px', height: '520px',
        maxHeight: 'calc(100vh - 110px)', maxWidth: 'calc(100vw - 40px)',
        background: '#fff', borderRadius: '14px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        display: 'none', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
        zIndex: '2147483647'
      }, panelSide)
    });

    // Header
    var header = el('div', {
      style: { padding: '14px 16px', background: color, color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between' }
    }, [
      el('div', { style: { fontWeight: '600', fontSize: '15px' },
        text: (config && (config.source_name || config.name)) || 'AI Assistant' }),
      el('button', {
        'aria-label': 'Close', style: { background: 'transparent', border: 'none',
          color: '#fff', fontSize: '20px', cursor: 'pointer', lineHeight: '1' },
        text: '×',
        onClick: function(){ panel.style.display = 'none'; }
      })
    ]);

    // Body
    var body = el('div', {
      style: { flex: '1', padding: '14px', overflowY: 'auto', background: '#f7f8fa' }
    });

    // Welcome message
    if (config && config.welcome_message) {
      messages.push({ role: 'assistant', text: config.welcome_message });
    }

    function renderMessages() {
      body.innerHTML = '';
      for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        var bubble = el('div', {
          style: {
            margin: '6px 0', padding: '10px 12px', borderRadius: '12px',
            maxWidth: '82%', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontSize: '14px', lineHeight: '1.45',
            background: m.role === 'user' ? color : '#fff',
            color: m.role === 'user' ? '#fff' : '#111',
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginLeft: m.role === 'user' ? 'auto' : '0',
            boxShadow: m.role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.06)'
          }, text: m.text
        });
        body.appendChild(bubble);
      }
      body.scrollTop = body.scrollHeight;
    }

    // Input bar
    var input = el('input', {
      type: 'text', placeholder: '메시지를 입력하세요...',
      style: { flex: '1', padding: '10px 12px', border: '1px solid #e2e4e8',
        borderRadius: '8px', fontSize: '14px', outline: 'none' }
    });

    var sendBtn = el('button', {
      style: { padding: '10px 14px', background: color, color: '#fff',
        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
        fontSize: '14px' },
      text: '전송'
    });

    var inputRow = el('div', {
      style: { display: 'flex', gap: '8px', padding: '10px 12px', borderTop: '1px solid #eef0f3', background: '#fff' }
    }, [input, sendBtn]);

    var footer = el('div', {
      style: { padding: '4px 12px 8px', textAlign: 'center', fontSize: '11px',
        color: '#999', background: '#fff' },
      html: 'Powered by <a href="https://openagentx.org" target="_blank" rel="noopener" style="color:#666;text-decoration:none">OpenAgentX</a>'
    });

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(inputRow);
    panel.appendChild(footer);

    function sendMessage() {
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      messages.push({ role: 'user', text: text });
      messages.push({ role: 'assistant', text: '...' });
      renderMessages();

      var pageContext = (config && config.inject_page_context) ? {
        url: location.href.slice(0, 2000),
        title: (document.title || '').slice(0, 500)
      } : undefined;

      fetch(API_BASE + '/api/embed/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token, session_id: sessionId, message: text,
          page_context: pageContext
        })
      })
        .then(function(r){ return r.json(); })
        .then(function(j){
          messages.pop();
          if (j.success) {
            messages.push({ role: 'assistant', text: j.message || '(빈 응답)' });
          } else {
            var msg = '오류: ' + (j.error || 'unknown');
            if (j.error === 'quota_exceeded') msg = '월 사용량을 초과했습니다.';
            if (j.error === 'origin_not_allowed') msg = '이 도메인에서는 사용할 수 없습니다.';
            messages.push({ role: 'assistant', text: msg });
          }
          renderMessages();
        })
        .catch(function(err){
          messages.pop();
          messages.push({ role: 'assistant', text: '네트워크 오류: ' + err.message });
          renderMessages();
        });
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') sendMessage(); });

    btn.addEventListener('click', function(){
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      if (panel.style.display === 'flex') {
        renderMessages();
        setTimeout(function(){ input.focus(); }, 50);
      }
    });

    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ loadConfig(buildUI); });
    } else {
      loadConfig(buildUI);
    }
  }

  init();
})();`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const script = buildScript(origin);

  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
