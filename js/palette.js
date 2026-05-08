/* ============================================================
   PALETTE.JS — Shared command registry + ⌘K (desktop) +
                mobile Quick Actions sheet + data-command wiring
   ============================================================ */

(function () {
  'use strict';

  // ----------------------------------------------------------
  // Command registry
  // ----------------------------------------------------------
  var commands = [
    { name: 'help',       aliases: ['?', 'h'],             desc: 'show all commands',      action: cmdHelp },
    { name: 'about',      aliases: ['cat about', 'whoami'], desc: 'cat about.json',         action: scrollTo('#about') },
    { name: 'experience', aliases: ['exp', 'work'],        desc: 'cat experience.log',     action: scrollTo('#experience') },
    { name: 'projects',   aliases: ['proj', 'ls projects'], desc: 'ls -la projects/',       action: scrollTo('#projects') },
    { name: 'skills',     aliases: ['sk', 'stack'],        desc: 'cat skills.md',          action: scrollTo('#skills') },
    { name: 'contact',    aliases: ['mail'],               desc: 'cat contact.txt',        action: scrollTo('#contact') },
    { name: 'resume',     aliases: ['cv', 'download'],     desc: '[pdf] download resume',  action: cmdResume },
    { name: 'github',     aliases: ['gh'],                 desc: 'open GitHub',            action: openUrl('https://github.com/pradeeprakash') },
    { name: 'linkedin',   aliases: ['li'],                 desc: 'open LinkedIn',          action: openUrl('https://linkedin.com/in/pradeep-prakash24') },
    { name: 'email',      aliases: ['copy email'],         desc: 'copy email to clipboard', action: cmdCopyEmail },
    { name: 'clear',      aliases: ['cls'],                desc: 'clear shell scrollback', action: function () { if (window.shellClear) window.shellClear(); } },
    { name: 'shell',      aliases: [],                     desc: 'open live shell',        action: function () { if (window.shellOpen) window.shellOpen(); } }
  ];

  // ----------------------------------------------------------
  // Command implementations
  // ----------------------------------------------------------
  function scrollTo(selector) {
    return function () {
      var el = document.querySelector(selector);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };
  }

  function openUrl(url) {
    return function () {
      window.open(url, '_blank', 'noopener');
    };
  }

  function cmdResume() {
    var link = document.querySelector('.hero-cta[data-command="resume"]') ||
               document.querySelector('.contact-resume');
    if (link) link.click();
  }

  function cmdCopyEmail() {
    var email = 'pradeep00327@gmail.com';
    navigator.clipboard.writeText(email).then(stampCopied, function () {
      // Clipboard rejected (permissions, insecure context) — surface the address.
      stampCopied('[' + email + ']');
    });
    return 'copied.';
  }

  function stampCopied(override) {
    document.querySelectorAll('[data-command="email"].contact-action').forEach(function (btn) {
      if (btn.classList.contains('copied')) return;
      var original = btn.textContent;
      btn.textContent = override || '[copied]';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 1500);
    });
  }

  function cmdHelp() {
    var lines = ['Available commands:'];
    commands.filter(function (c) { return c.listed !== false; }).forEach(function (c) {
      lines.push('  ' + c.name.padEnd(14) + ' ' + c.desc);
    });
    return lines.join('\n');
  }

  // ----------------------------------------------------------
  // Analytics — single source of truth for which commands are tracked.
  // Returns null for commands that should NOT fire an event.
  // ----------------------------------------------------------
  var TRACKED = {
    resume:   { name: 'resume_download' },
    email:    { name: 'contact_click', props: { channel: 'email' } },
    linkedin: { name: 'contact_click', props: { channel: 'linkedin' } },
    github:   { name: 'contact_click', props: { channel: 'github' } },
  };

  function mapToTrackEvent(commandName) {
    return TRACKED[commandName] || null;
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  window.commands = commands;

  window.runCommand = function (name) {
    var token = (name || '').trim().toLowerCase();
    if (!token) return { ok: false, output: '' };
    var cmd = findCommand(token);
    if (!cmd) {
      return { ok: false, output: "command not found: " + token + ". try 'help'." };
    }
    if (window.track) {
      var ev = mapToTrackEvent(token);
      if (ev) window.track(ev.name, ev.props);
    }
    var out;
    try { out = cmd.action(); } catch (e) { out = 'error: ' + e.message; }
    return { ok: true, output: out || '' };
  };

  function findCommand(token) {
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].name === token) return commands[i];
      if (commands[i].aliases.indexOf(token) !== -1) return commands[i];
    }
    return null;
  }

  // ----------------------------------------------------------
  // Delegated data-command dispatcher
  // One document-level listener; catches dynamically-added elements too.
  // ----------------------------------------------------------
  function installDataCommandDelegation() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-command]');
      if (!el) return;
      var name = el.getAttribute('data-command');
      if (!name) return;
      // Plain anchors already navigate; fire tracking inline (runCommand
      // would invoke cmd.action() which conflicts with native anchor
      // behavior — e.g. resume's link.click() would open the file twice).
      // Gate tracking on e.isTrusted so synthetic clicks dispatched by
      // cmdResume's link.click() don't double-fire (runCommand already
      // tracked the resume_download in that path).
      if (el.tagName === 'A' && !e.defaultPrevented) {
        if (e.isTrusted && window.track) {
          var ev = mapToTrackEvent(name);
          if (ev) window.track(ev.name, ev.props);
        }
        return;
      }
      if (el.tagName === 'BUTTON') e.preventDefault();
      window.runCommand(name);
    });
  }

  // ----------------------------------------------------------
  // ⌘K COMMAND PALETTE (desktop)
  // ----------------------------------------------------------
  var paletteBackdrop, paletteInput, paletteList, paletteOpen = false, selectedIdx = 0, filtered = [];
  var lastFocusedBeforePalette = null;

  function initPalette() {
    paletteBackdrop = document.getElementById('palette-backdrop');
    paletteInput    = document.getElementById('palette-input');
    paletteList     = document.getElementById('palette-list');
    if (!paletteBackdrop || !paletteInput || !paletteList) return;

    paletteBackdrop.addEventListener('click', function (e) {
      if (e.target === paletteBackdrop) closePalette();
    });
    paletteInput.addEventListener('input', renderPalette);
    paletteInput.addEventListener('keydown', onPaletteKey);

    document.addEventListener('keydown', function (e) {
      // Open triggers: ⌘K / Ctrl+K / `/`
      var isK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      var isSlash = e.key === '/' && !inEditable(e.target);
      if (!paletteOpen && (isK || isSlash)) {
        e.preventDefault();
        openPalette();
      } else if (paletteOpen && e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });

    // Nav ⌘K hint button opens the palette directly.
    var hint = document.querySelector('.nav-kbd-hint');
    if (hint) hint.addEventListener('click', openPalette);
  }

  function inEditable(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  function openPalette() {
    if (paletteOpen || !paletteBackdrop) return;
    // Not available on mobile — CSS hides it, but guard anyway.
    if (window.matchMedia('(max-width: 768px)').matches) {
      openSheet();
      return;
    }
    paletteOpen = true;
    lastFocusedBeforePalette = document.activeElement;
    paletteBackdrop.classList.add('open');
    paletteBackdrop.setAttribute('aria-hidden', 'false');
    paletteInput.value = '';
    renderPalette();
    setTimeout(function () { paletteInput.focus(); }, 10);
  }

  function closePalette() {
    if (!paletteOpen || !paletteBackdrop) return;
    paletteOpen = false;
    paletteBackdrop.classList.remove('open');
    paletteBackdrop.setAttribute('aria-hidden', 'true');
    if (lastFocusedBeforePalette && typeof lastFocusedBeforePalette.focus === 'function') {
      lastFocusedBeforePalette.focus();
    }
    lastFocusedBeforePalette = null;
  }

  function renderPalette() {
    var q = (paletteInput.value || '').trim().toLowerCase();
    filtered = commands.filter(function (c) { return c.listed !== false || c.name === 'shell' || q.length > 0; })
      .filter(function (c) {
        if (!q) return c.listed !== false;
        if (c.name.indexOf(q) !== -1) return true;
        if (c.desc.toLowerCase().indexOf(q) !== -1) return true;
        for (var i = 0; i < c.aliases.length; i++) {
          if (c.aliases[i].indexOf(q) !== -1) return true;
        }
        return false;
      });
    selectedIdx = 0;
    paletteList.innerHTML = '';
    if (!filtered.length) {
      var li = document.createElement('li');
      li.className = 'palette-empty';
      li.textContent = "no match — try 'help'";
      paletteList.appendChild(li);
      return;
    }
    filtered.forEach(function (c, i) {
      var li = document.createElement('li');
      li.className = 'palette-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-setsize', filtered.length);
      li.setAttribute('aria-posinset', i + 1);
      li.setAttribute('aria-selected', i === selectedIdx ? 'true' : 'false');
      li.id = 'palette-item-' + i;
      li.innerHTML =
        '<span class="palette-marker">❯</span>' +
        '<span class="palette-name"></span>' +
        '<span class="palette-desc"></span>';
      li.querySelector('.palette-name').textContent = c.name;
      li.querySelector('.palette-desc').textContent = c.desc;
      li.addEventListener('click', function () {
        runFiltered(i);
      });
      li.addEventListener('mousemove', function () {
        setSelected(i);
      });
      paletteList.appendChild(li);
    });
    paletteInput.setAttribute('aria-activedescendant', 'palette-item-0');
  }

  function setSelected(i) {
    if (i < 0 || i >= filtered.length || i === selectedIdx) return;
    selectedIdx = i;
    var items = paletteList.querySelectorAll('.palette-item');
    items.forEach(function (el, idx) {
      el.setAttribute('aria-selected', idx === selectedIdx ? 'true' : 'false');
    });
    paletteInput.setAttribute('aria-activedescendant', 'palette-item-' + selectedIdx);
  }

  function onPaletteKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(Math.min(selectedIdx + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(Math.max(selectedIdx - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runFiltered(selectedIdx);
    } else if (e.key === 'Tab') {
      // Focus trap: palette has only one focusable element; just prevent escape.
      e.preventDefault();
    }
  }

  function runFiltered(i) {
    if (!filtered[i]) return;
    var name = filtered[i].name;
    closePalette();
    window.runCommand(name);
  }

  // ----------------------------------------------------------
  // MOBILE QUICK ACTIONS SHEET
  // ----------------------------------------------------------
  var fab, sheet, sheetBackdrop, sheetOpen = false, lastFocusedBeforeSheet = null;

  function initSheet() {
    fab           = document.getElementById('mobile-fab');
    sheet         = document.getElementById('mobile-sheet');
    sheetBackdrop = document.getElementById('mobile-sheet-backdrop');
    if (!fab || !sheet || !sheetBackdrop) return;

    fab.addEventListener('click', function () {
      if (sheetOpen) closeSheet(); else openSheet();
    });
    sheetBackdrop.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) {
      if (sheetOpen && e.key === 'Escape') closeSheet();
    });

    // Swipe-down dismiss
    var startY = null;
    sheet.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) startY = e.touches[0].clientY;
    });
    sheet.addEventListener('touchmove', function (e) {
      if (startY === null) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 60) { startY = null; closeSheet(); }
    });
    sheet.addEventListener('touchend', function () { startY = null; });

    // Sheet actions dispatch through the global data-command wirer;
    // close the sheet once any action runs.
    sheet.querySelectorAll('[data-command]').forEach(function (btn) {
      btn.addEventListener('click', closeSheet);
    });
  }

  function openSheet() {
    if (sheetOpen || !sheet) return;
    sheetOpen = true;
    lastFocusedBeforeSheet = document.activeElement;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    sheetBackdrop.classList.add('open');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    // Focus first action
    var first = sheet.querySelector('.mobile-action');
    if (first) setTimeout(function () { first.focus(); }, 10);
  }

  function closeSheet() {
    if (!sheetOpen || !sheet) return;
    sheetOpen = false;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    sheetBackdrop.classList.remove('open');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    if (lastFocusedBeforeSheet && typeof lastFocusedBeforeSheet.focus === 'function') {
      lastFocusedBeforeSheet.focus();
    }
    lastFocusedBeforeSheet = null;
  }

  // ----------------------------------------------------------
  // Init
  // ----------------------------------------------------------
  function init() {
    installDataCommandDelegation();
    initPalette();
    initSheet();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
