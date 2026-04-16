/* ============================================================
   SHELL.JS — Easter-egg live prompt, opened via `shell` command.
              Mounts inside the terminal body; unmounts on Esc.
   ============================================================ */

(function () {
  'use strict';

  var shellEl = null;
  var scrollbackEl = null;
  var inputEl = null;
  var history = [];
  var historyIdx = 0;

  function build() {
    var el = document.createElement('div');
    el.className = 'shell';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Live terminal');
    el.innerHTML =
      '<div class="shell-scrollback" id="shell-scrollback" aria-live="polite"></div>' +
      '<div class="shell-inputrow">' +
        '<span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>' +
        '<input type="text" class="shell-input" id="shell-input" autocomplete="off" spellcheck="false" aria-label="Shell input">' +
      '</div>';
    return el;
  }

  function mount() {
    if (shellEl) return;
    var host = document.querySelector('#contact') || document.querySelector('.terminal-body');
    if (!host) return;
    shellEl = build();
    host.parentNode.insertBefore(shellEl, host.nextSibling);
    scrollbackEl = shellEl.querySelector('#shell-scrollback');
    inputEl = shellEl.querySelector('#shell-input');
    inputEl.addEventListener('keydown', onKey);
    print('type a command, or `help`. `exit` / esc to close.');
    setTimeout(function () { inputEl.focus(); }, 10);
    shellEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function unmount() {
    if (!shellEl) return;
    shellEl.parentNode && shellEl.parentNode.removeChild(shellEl);
    shellEl = null;
    scrollbackEl = null;
    inputEl = null;
    history = [];
    historyIdx = 0;
  }

  function print(text, opts) {
    if (!scrollbackEl) return;
    var line = document.createElement('div');
    line.className = 'shell-line' + (opts && opts.result ? ' result' : '');
    if (opts && opts.echo) {
      var prompt = document.createElement('span');
      prompt.className = 'prompt';
      prompt.textContent = '$ ';
      line.appendChild(prompt);
      line.appendChild(document.createTextNode(text));
    } else {
      line.textContent = text;
    }
    scrollbackEl.appendChild(line);
    scrollbackEl.scrollTop = scrollbackEl.scrollHeight;
    trimScrollback();
  }

  function trimScrollback() {
    while (scrollbackEl.children.length > 24) {
      scrollbackEl.removeChild(scrollbackEl.firstChild);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var value = inputEl.value.trim();
      if (!value) return;
      history.push(value);
      historyIdx = history.length;
      inputEl.value = '';
      submit(value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      historyIdx = Math.max(0, historyIdx - 1);
      inputEl.value = history[historyIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length === 0) return;
      historyIdx = Math.min(history.length, historyIdx + 1);
      inputEl.value = history[historyIdx] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      unmount();
    }
  }

  function tabComplete() {
    var q = inputEl.value.trim().toLowerCase();
    if (!q || !Array.isArray(window.commands)) return;
    var matches = window.commands
      .filter(function (c) { return c.name.indexOf(q) === 0; })
      .map(function (c) { return c.name; });
    if (matches.length === 1) {
      inputEl.value = matches[0];
    } else if (matches.length > 1) {
      print(matches.join('  '));
    }
  }

  function submit(value) {
    print(value, { echo: true });
    if (value === 'exit' || value === 'quit') {
      unmount();
      return;
    }
    var res = window.runCommand ? window.runCommand(value) : { ok: false, output: 'runCommand unavailable' };
    if (res && res.output) {
      print(res.output, { result: true });
    }
  }

  // Public API (consumed by palette.js commands)
  window.shellOpen = mount;
  window.shellClose = unmount;
  window.shellClear = function () {
    if (scrollbackEl) scrollbackEl.innerHTML = '';
  };
})();
