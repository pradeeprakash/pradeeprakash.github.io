/* ============================================================
   AGENT.JS — AI agent chat panel.
              Floats over the page as a terminal-styled overlay.
              Uses window.runCommand (palette.js) for command reg.
   ============================================================ */

(function () {
  'use strict';

  var API_URL = 'https://portfolio-pradeeprakashs-projects.vercel.app/api/chat';
  var MAX_PAIRS = 10;
  var MAX_MSG_LEN = 500;

  var SUGGESTIONS = [
    "Tell me about Fynd Migrate's architecture",
    "Why is Pradeep a fit for a senior backend role?",
    "What's his strongest technical depth?"
  ];

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
  var tooltip = null;
  var attentionTimer = null;
  var recognition = null;
  var isListening = false;
  var speechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  var ttsSupported = 'speechSynthesis' in window;

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

    var micBtn = speechSupported
      ? '<button class="agent-mic" type="button" aria-label="Voice input" title="Voice input">🎤</button>'
      : '';
    var speakerBtn = ttsSupported
      ? '<button class="agent-speaker" type="button" aria-label="Read response aloud" title="Read aloud" disabled>🔊</button>'
      : '';

    bd.innerHTML =
      '<div class="agent-panel">' +
        '<div class="agent-titlebar">' +
          '<span>&gt; agent_session</span>' +
          '<button class="agent-close" type="button" aria-label="Close agent">[x]</button>' +
        '</div>' +
        '<div class="agent-messages" id="agent-messages" aria-live="off"></div>' +
        '<div class="agent-inputrow">' +
          '<span class="agent-input-prefix">&gt;</span>' +
          '<input type="text" class="agent-input" id="agent-input" ' +
            'placeholder="ask me anything..." ' +
            'aria-label="Message the AI agent" ' +
            'autocomplete="off" spellcheck="false" ' +
            'maxlength="' + MAX_MSG_LEN + '">' +
          micBtn +
          speakerBtn +
        '</div>' +
      '</div>';

    return bd;
  }

  // ----------------------------------------------------------
  // ASCII face expressions
  // ----------------------------------------------------------
  var FACES = {
    idle:     '(o_o)',
    blink:    '(- -)',
    happy:    '(^_^)',
    curious:  '(o.o)',
    wave:     '(^_^)/',
    think:    '(>_<)',
    sleepy:   '(~_~)',
  };

  // Section → expression mapping for scroll reactivity
  var SECTION_FACES = {
    hero:       'idle',
    about:      'curious',
    experience: 'happy',
    projects:   'happy',
    skills:     'curious',
    contact:    'wave',
  };

  var currentFace = 'idle';
  var blinkTimer = null;
  var scrollFace = 'idle';

  function setFace(name) {
    currentFace = name;
    if (fab) fab.textContent = FACES[name] || FACES.idle;
  }

  function startBlinking() {
    if (blinkTimer) return;
    function doBlink() {
      if (isOpen) return;
      // Blink: close eyes briefly
      setFace('blink');
      setTimeout(function () {
        if (!isOpen) setFace(scrollFace);
      }, 150);
    }
    // Blink every 3-5 seconds (randomized)
    function scheduleNext() {
      var delay = 3000 + Math.random() * 2000;
      blinkTimer = setTimeout(function () {
        doBlink();
        scheduleNext();
      }, delay);
    }
    scheduleNext();
  }

  function stopBlinking() {
    if (blinkTimer) {
      clearTimeout(blinkTimer);
      blinkTimer = null;
    }
  }

  function initScrollReaction() {
    var sections = ['hero', 'about', 'experience', 'projects', 'skills', 'contact'];
    var sectionEls = [];
    sections.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sectionEls.push({ id: id, el: el });
    });

    if (!sectionEls.length) return;

    function onScroll() {
      if (isOpen) return;
      var viewMid = window.innerHeight / 2;
      var closest = sectionEls[0].id;
      var closestDist = Infinity;

      for (var i = 0; i < sectionEls.length; i++) {
        var rect = sectionEls[i].el.getBoundingClientRect();
        var dist = Math.abs(rect.top - viewMid);
        if (dist < closestDist) {
          closestDist = dist;
          closest = sectionEls[i].id;
        }
      }

      var face = SECTION_FACES[closest] || 'idle';
      if (face !== scrollFace) {
        scrollFace = face;
        setFace(face);
      }
    }

    var scrollTimeout;
    window.addEventListener('scroll', function () {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(function () {
        scrollTimeout = null;
        onScroll();
      }, 100);
    }, { passive: true });

    onScroll();
  }

  function buildFab() {
    var btn = document.createElement('button');
    btn.className = 'agent-fab';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open AI agent');
    btn.textContent = FACES.idle;

    // Desktop hover reaction
    btn.addEventListener('mouseenter', function () {
      if (!isOpen) setFace('happy');
    });
    btn.addEventListener('mouseleave', function () {
      if (!isOpen) setFace(scrollFace);
    });

    return btn;
  }

  function buildTooltip() {
    var t = document.createElement('div');
    t.className = 'agent-tooltip';
    t.innerHTML = '<span class="agent-tooltip-prompt">></span> ask me anything <kbd>⌘K</kbd>';
    return t;
  }

  function showTooltip() {
    if (tooltip) return;
    if (sessionStorage.getItem('portfolio.agent.tooltip')) return;
    tooltip = buildTooltip();
    document.body.appendChild(tooltip);
    // Fade in, then auto-remove after 5s
    requestAnimationFrame(function () { tooltip.classList.add('show'); });
    setTimeout(function () {
      if (!tooltip) return;
      tooltip.classList.remove('show');
      tooltip.addEventListener('transitionend', function handler() {
        if (tooltip && tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
        tooltip = null;
        tooltip.removeEventListener('transitionend', handler);
      });
    }, 5000);
    sessionStorage.setItem('portfolio.agent.tooltip', '1');
  }

  function startAttention() {
    if (reducedMotion) return;
    fab.classList.add('attention');
    attentionTimer = setTimeout(function () {
      fab.classList.remove('attention');
      attentionTimer = null;
    }, 4000);
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

    var micBtn = backdrop.querySelector('.agent-mic');
    if (micBtn) micBtn.addEventListener('click', toggleMic);

    var speakerBtn = backdrop.querySelector('.agent-speaker');
    if (speakerBtn) speakerBtn.addEventListener('click', function () {
      var lastMsg = messagesEl.querySelector('.agent-msg-agent:last-of-type');
      if (lastMsg) speakResponse(lastMsg.textContent);
    });

    document.addEventListener('keydown', onDocKey);
  }

  function open() {
    if (isOpen) return;
    if (!backdrop) mount();

    isOpen = true;
    lastFocused = document.activeElement;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    stopBlinking();
    setFace('think');

    if (conversation.length === 0) {
      appendMessage('agent', "Pradeep's AI. Ask me about his experience, skills, or projects — or paste a job description and I'll tell you why he's a fit.");
      appendSuggestions();
    }

    setTimeout(function () { inputEl.focus(); }, 10);
  }

  function appendSuggestions() {
    var wrap = document.createElement('div');
    wrap.className = 'agent-suggestions';
    wrap.setAttribute('role', 'list');

    var label = document.createElement('span');
    label.className = 'agent-suggestions-label';
    label.textContent = 'try:';
    wrap.appendChild(label);

    SUGGESTIONS.forEach(function (text) {
      var btn = document.createElement('button');
      btn.className = 'agent-suggestion';
      btn.type = 'button';
      btn.setAttribute('role', 'listitem');
      btn.textContent = text;
      btn.addEventListener('click', function () { onSuggestionClick(text); });
      wrap.appendChild(btn);
    });

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeSuggestions() {
    if (!messagesEl) return;
    var s = messagesEl.querySelector('.agent-suggestions');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }

  function onSuggestionClick(prompt) {
    if (streaming) return;
    removeSuggestions();
    appendMessage('user', prompt);
    streamResponse(prompt);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');

    document.removeEventListener('keydown', onDocKey);

    // Clear conversation on close
    conversation = [];
    if (messagesEl) messagesEl.innerHTML = '';

    setFace(scrollFace);
    if (!reducedMotion) startBlinking();

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
  // Rate-limit jokes (HTTP 429)
  // ----------------------------------------------------------
  var RATE_LIMIT_JOKES = [
    'ERR 429: you type faster than I think. give me a sec.',
    'rate_limit_exceeded — even chatbots need a coffee break.',
    'whoa, slow down speed-runner. the API is wheezing.',
    'kernel panic: enthusiasm overflow. take a breath.',
    '429 too many requests — i\'m flattered, really, but pace yourself.',
    'sigh… i\'m an LLM, not a vending machine. wait a moment.',
    'rate limited. blame my tiny serverless brain, not me.',
    '> sudo chill --duration=60s',
    'busy buffering my excuses. try again shortly.',
  ];

  function pickRateLimitJoke() {
    return RATE_LIMIT_JOKES[Math.floor(Math.random() * RATE_LIMIT_JOKES.length)];
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
          var status = res.status;
          return res.json().then(function (data) {
            var err = new Error(data.error || 'Request failed');
            err.status = status;
            throw err;
          }, function () {
            var err = new Error('Request failed');
            err.status = status;
            throw err;
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

        // Announce to screen readers now that response is complete
        messagesEl.setAttribute('aria-live', 'polite');
        setTimeout(function () { messagesEl.setAttribute('aria-live', 'off'); }, 100);

        // Add to conversation
        conversation.push({ role: 'assistant', content: fullText });

        streaming = false;
        inputEl.disabled = false;
        inputEl.focus();
      })
      .catch(function (err) {
        cursorDiv.className = 'agent-msg agent-msg-error';
        cursorDiv.textContent = err.status === 429
          ? pickRateLimitJoke()
          : (err.message || 'Something went wrong. Try again.');

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

    // For reduced-motion, collect all text without live DOM updates
    var textNode = null;
    var cursor = cursorDiv.querySelector('.agent-cursor');
    if (!reducedMotion) {
      textNode = document.createTextNode('');
      cursorDiv.insertBefore(textNode, cursor);
    }

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
              if (!reducedMotion && textNode) {
                textNode.textContent += chunk;
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
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
      removeSuggestions();
      appendMessage('user', value);
      streamResponse(value);
    } else if (e.key === 'Tab') {
      // Focus trap: cycle between input and close button
      e.preventDefault();
      if (e.shiftKey) return; // Already at first focusable
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
  // Voice input (Speech Recognition)
  // ----------------------------------------------------------
  function initRecognition() {
    if (!speechSupported) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (e) {
      var transcript = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          inputEl.value = transcript;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if (!transcript) return;
      inputEl.value = transcript;
    };

    recognition.onend = function () {
      isListening = false;
      var btn = backdrop && backdrop.querySelector('.agent-mic');
      if (btn) btn.classList.remove('listening');
      if (inputEl) inputEl.focus();
      // Auto-submit if we got a final result
      var val = inputEl && inputEl.value.trim();
      if (val) {
        inputEl.value = '';
        removeSuggestions();
        appendMessage('user', val);
        streamResponse(val);
      }
    };

    recognition.onerror = function (e) {
      isListening = false;
      var btn = backdrop && backdrop.querySelector('.agent-mic');
      if (btn) btn.classList.remove('listening');
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        appendMessage('error', 'mic error: ' + e.error);
      }
      if (inputEl) inputEl.focus();
    };
  }

  function toggleMic() {
    if (!recognition) initRecognition();
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      return;
    }
    if (streaming) return;

    isListening = true;
    var btn = backdrop.querySelector('.agent-mic');
    if (btn) btn.classList.add('listening');
    recognition.start();
  }

  // ----------------------------------------------------------
  // Voice output (Speech Synthesis)
  // ----------------------------------------------------------
  var speaking = false;
  var currentUtterance = null;

  function speakResponse(text) {
    if (!ttsSupported) return;
    if (speaking) {
      speechSynthesis.cancel();
      speaking = false;
      updateSpeakerBtn();
      return;
    }

    // Strip HTML for cleaner reading
    var clean = text.replace(/<[^>]+>/g, '');
    if (!clean.trim()) return;
    // Trim to avoid extremely long speech
    clean = clean.slice(0, 1000);

    currentUtterance = new SpeechSynthesisUtterance(clean);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;

    currentUtterance.onstart = function () {
      speaking = true;
      updateSpeakerBtn();
    };

    currentUtterance.onend = function () {
      speaking = false;
      updateSpeakerBtn();
    };

    currentUtterance.onerror = function () {
      speaking = false;
      updateSpeakerBtn();
    };

    speechSynthesis.speak(currentUtterance);
  }

  function updateSpeakerBtn() {
    var btn = backdrop && backdrop.querySelector('.agent-speaker');
    if (!btn) return;
    btn.classList.toggle('speaking', speaking);
    btn.textContent = speaking ? '🔊' : '🔊';
    btn.setAttribute('aria-label', speaking ? 'Stop reading' : 'Read response aloud');
  }

  // ----------------------------------------------------------
  // Init
  // ----------------------------------------------------------
  function init() {
    // Create floating button
    fab = buildFab();
    document.body.appendChild(fab);
    fab.addEventListener('click', open);

    // Entrance: slide in after mount
    requestAnimationFrame(function () { fab.classList.add('entered'); });

    // Start face animations (skip for reduced-motion)
    if (!reducedMotion) {
      startBlinking();
      initScrollReaction();
      // Attention-grabbing pulse for first few seconds
      startAttention();
      // Tooltip on first session visit
      setTimeout(showTooltip, 2000);
    }

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
