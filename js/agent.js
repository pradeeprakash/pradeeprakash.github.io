/* ============================================================
   AGENT.JS — AI agent chat panel.
              Floats over the page as a terminal-styled overlay.
              Uses window.runCommand (palette.js) for command reg.
   ============================================================ */

(function () {
  'use strict';

  var API_URL = '/api/chat';
  var MAX_PAIRS = 10;
  var MAX_MSG_LEN = 500;

  var backdrop = null;
  var panel = null;
  var messagesEl = null;
  var inputEl = null;
  var closeBtn = null;
  var fab = null;
  var isOpen = false;
  var conversation = [];
  var lastFocused = null;
  var streaming = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----------------------------------------------------------
  // DOM builders
  // ----------------------------------------------------------
  function buildPanel() {
    var bd = document.createElement('div');
    bd.className = 'agent-backdrop';
    bd.setAttribute('role', 'dialog');
    bd.setAttribute('aria-modal', 'true');
    bd.setAttribute('aria-label', 'AI Agent');
    bd.setAttribute('aria-hidden', 'true');

    bd.innerHTML =
      '<div class="agent-panel">' +
        '<div class="agent-titlebar">' +
          '<span>&gt; agent_session</span>' +
          '<button class="agent-close" type="button" aria-label="Close agent">[x]</button>' +
        '</div>' +
        '<div class="agent-messages" id="agent-messages"></div>' +
        '<div class="agent-inputrow">' +
          '<span class="agent-input-prefix">&gt;</span>' +
          '<input type="text" class="agent-input" id="agent-input" ' +
            'placeholder="ask me anything..." ' +
            'aria-label="Message the AI agent" ' +
            'autocomplete="off" spellcheck="false" ' +
            'maxlength="' + MAX_MSG_LEN + '">' +
        '</div>' +
      '</div>';

    return bd;
  }

  function buildFab() {
    var btn = document.createElement('button');
    btn.className = 'agent-fab';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open AI agent');
    btn.textContent = '[ AI ]';
    return btn;
  }

  // ----------------------------------------------------------
  // Mount / unmount
  // ----------------------------------------------------------
  function mount() {
    if (backdrop) return;

    backdrop = buildPanel();
    document.body.appendChild(backdrop);

    panel = backdrop.querySelector('.agent-panel');
    messagesEl = backdrop.querySelector('#agent-messages');
    inputEl = backdrop.querySelector('#agent-input');
    closeBtn = backdrop.querySelector('.agent-close');

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) close();
    });
    closeBtn.addEventListener('click', close);
    inputEl.addEventListener('keydown', onInputKey);

    document.addEventListener('keydown', onDocKey);
  }

  function open() {
    if (isOpen) return;
    if (!backdrop) mount();

    isOpen = true;
    lastFocused = document.activeElement;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');

    if (conversation.length === 0) {
      appendMessage('agent', "Pradeep's AI. Ask me about his experience, skills, or projects — or paste a job description and I'll tell you why he's a fit.");
    }

    setTimeout(function () { inputEl.focus(); }, 10);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');

    // Clear conversation on close
    conversation = [];
    if (messagesEl) messagesEl.innerHTML = '';

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  // ----------------------------------------------------------
  // Message rendering
  // ----------------------------------------------------------
  function appendMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'agent-msg agent-msg-' + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function appendCursor() {
    var div = document.createElement('div');
    div.className = 'agent-msg agent-msg-agent';
    var cursor = document.createElement('span');
    cursor.className = 'agent-cursor';
    cursor.textContent = '\u2588';
    div.appendChild(cursor);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  // ----------------------------------------------------------
  // Markdown-light formatting
  // ----------------------------------------------------------
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function formatResponse(text) {
    var escaped = escapeHtml(text);
    // **bold**
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    return escaped;
  }

  // ----------------------------------------------------------
  // Streaming response
  // ----------------------------------------------------------
  function streamResponse(userText) {
    streaming = true;
    inputEl.disabled = true;

    // Add user message to conversation
    conversation.push({ role: 'user', content: userText });

    // Trim to max pairs
    while (conversation.length > MAX_PAIRS * 2) {
      conversation.shift();
      conversation.shift();
    }

    var cursorDiv = appendCursor();
    var fullText = '';

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation }),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data.error || 'Request failed');
          });
        }
        return readStream(res.body, cursorDiv, function (chunk) {
          fullText += chunk;
        });
      })
      .then(function () {
        // Replace cursor div with final formatted message
        cursorDiv.className = 'agent-msg agent-msg-agent';
        cursorDiv.innerHTML = formatResponse(fullText);

        // Add to conversation
        conversation.push({ role: 'assistant', content: fullText });

        streaming = false;
        inputEl.disabled = false;
        inputEl.focus();
      })
      .catch(function (err) {
        cursorDiv.className = 'agent-msg agent-msg-error';
        cursorDiv.textContent = err.message || 'Something went wrong. Try again.';

        // Remove failed user message from conversation
        conversation.pop();

        streaming = false;
        inputEl.disabled = false;
        inputEl.focus();
      });
  }

  function readStream(body, cursorDiv, onChunk) {
    var reader = body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';

    // Build text content node for streaming chars
    var textNode = document.createTextNode('');
    var cursor = cursorDiv.querySelector('.agent-cursor');
    cursorDiv.insertBefore(textNode, cursor);

    function pump() {
      return reader.read().then(function (result) {
        if (result.done) return;

        buffer += decoder.decode(result.value, { stream: true });

        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line.startsWith('data: ')) continue;
          var data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            var parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
              var chunk = parsed.delta.text;
              onChunk(chunk);
              textNode.textContent += chunk;
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          } catch (e) {
            // Skip unparseable lines
          }
        }

        return pump();
      });
    }

    return pump().then(function () {
      // Remove cursor after streaming completes
      if (cursor && cursor.parentNode) {
        cursor.parentNode.removeChild(cursor);
      }
    });
  }

  // ----------------------------------------------------------
  // Input handling
  // ----------------------------------------------------------
  function onInputKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var value = inputEl.value.trim();
      if (!value || streaming) return;
      inputEl.value = '';
      appendMessage('user', value);
      streamResponse(value);
    } else if (e.key === 'Tab') {
      // Focus trap: cycle between input and close button
      e.preventDefault();
      if (closeBtn) closeBtn.focus();
    }
  }

  function onDocKey(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  // ----------------------------------------------------------
  // Focus trap for close button
  // ----------------------------------------------------------
  function initFocusTrap() {
    if (closeBtn) {
      closeBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          if (inputEl) inputEl.focus();
        }
      });
    }
  }

  // ----------------------------------------------------------
  // Init
  // ----------------------------------------------------------
  function init() {
    // Create floating button
    fab = buildFab();
    document.body.appendChild(fab);
    fab.addEventListener('click', open);

    // Pre-mount the panel (hidden)
    mount();
    initFocusTrap();

    // Register command in palette
    if (window.commands && Array.isArray(window.commands)) {
      window.commands.push({
        name: 'agent',
        aliases: ['ai', 'ask', 'chat'],
        desc: 'talk to AI agent',
        action: open,
      });
    }
  }

  // Public API
  window.agentOpen = open;
  window.agentClose = close;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
