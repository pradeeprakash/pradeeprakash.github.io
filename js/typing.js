/* ============================================================
   TYPING.JS — Cinematic boot overlay + hero sequence
               + shared window.typeText utility
   ============================================================ */

/**
 * Types text into an element character by character.
 * @param {HTMLElement} element
 * @param {string} text
 * @param {number} speed - Base ms per character (default 60)
 * @returns {Promise<void>}
 */
window.typeText = function (element, text, speed) {
  if (speed == null) speed = 60;
  return new Promise(function (resolve) {
    var i = 0;
    element.textContent = '';
    function tick() {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
        var jitter = speed + (Math.random() * 40 - 20);
        setTimeout(tick, Math.max(16, jitter));
      } else {
        resolve();
      }
    }
    tick();
  });
};

window.delay = function (ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
};

(function () {
  'use strict';

  var delay = window.delay;

  // ----------------------------------------------------------
  // Gating — boot overlay only runs when:
  //   - desktop (> 768px)
  //   - prefers-reduced-motion != reduce
  //   - not already booted this session
  //   - no deep-link anchor/param that skips the intro
  // ----------------------------------------------------------
  function shouldBoot() {
    if (window.matchMedia('(max-width: 768px)').matches) return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try {
      if (sessionStorage.getItem('portfolio.booted') === '1') return false;
    } catch (_) { /* storage blocked → still allow boot */ }
    var hash = (window.location.hash || '').toLowerCase();
    var search = (window.location.search || '').toLowerCase();
    if (hash === '#resume' || hash === '#contact') return false;
    if (search.indexOf('direct') !== -1) return false;
    return true;
  }

  function markBooted() {
    try { sessionStorage.setItem('portfolio.booted', '1'); } catch (_) {}
  }

  // ----------------------------------------------------------
  // Boot sequence
  // ----------------------------------------------------------
  var BOOT_LINES = [
    { delay:    0, text: 'portfolio.pp.dev · boot [4.18.0]' },
    { delay:   80, text: 'checking /dev/sda0 ............................ ', status: 'OK' },
    { delay:  240, text: 'mounting /home ................................ ', status: 'OK' },
    { delay:  380, text: 'starting network .............................. ', status: 'OK' },
    { delay:  500, text: 'starting sshd ................................. ', status: 'OK' },
    { delay:  620, text: 'starting tty1 ................................. ', status: 'OK' },
    { delay:  760, text: 'login as: pradeep' },
    { delay:  900, text: 'last login: Thu Apr 16 09:32:01 on ttys001' },
    { delay: 1050, text: '$' }
  ];
  var BOOT_FADE_MS = 180;
  var BOOT_TOTAL_MS = 1200;

  async function runBoot() {
    var overlay = document.getElementById('boot-overlay');
    var host    = document.getElementById('boot-lines');
    if (!overlay || !host) return;

    overlay.setAttribute('aria-hidden', 'true');

    var cancelled = false;
    var timers = [];

    function cancel() {
      if (cancelled) return;
      cancelled = true;
      timers.forEach(clearTimeout);
      finish();
    }

    function onSkipKey(e) {
      if (cancelled) return;
      cancel();
      e && e.preventDefault && e.preventDefault();
    }

    window.addEventListener('keydown', onSkipKey, { once: true });
    overlay.addEventListener('click', onSkipKey, { once: true });
    overlay.addEventListener('touchstart', onSkipKey, { once: true, passive: true });
    window.addEventListener('wheel', onSkipKey, { once: true, passive: true });

    function finish() {
      overlay.classList.add('fade-out');
      setTimeout(function () {
        overlay.remove();
        markBooted();
        runHeroSequence();
      }, BOOT_FADE_MS);
    }

    // Render lines with cumulative delays
    BOOT_LINES.forEach(function (line) {
      var t = setTimeout(function () {
        if (cancelled) return;
        var div = document.createElement('div');
        div.className = 'boot-line';
        div.textContent = line.text;
        if (line.status) {
          var ok = document.createElement('span');
          ok.className = 'ok';
          ok.textContent = '[ ' + line.status + ' ]';
          div.appendChild(ok);
        }
        host.appendChild(div);
      }, line.delay);
      timers.push(t);
    });

    // Final fade
    var fadeT = setTimeout(function () {
      if (cancelled) return;
      cancel();
    }, BOOT_TOTAL_MS);
    timers.push(fadeT);
  }

  // ----------------------------------------------------------
  // Hero sequence (after boot / or standalone on mobile + reduced-motion)
  // ----------------------------------------------------------
  async function runHeroSequence() {
    var heroSection = document.getElementById('hero');
    if (!heroSection) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mobile = window.matchMedia('(max-width: 768px)').matches;
    var fast = reduced || mobile;

    var lastLogin      = heroSection.querySelector('.terminal-line');
    var promptLines    = heroSection.querySelectorAll('.prompt-line');
    var firstPrompt    = promptLines[0];
    var firstCommand   = firstPrompt && firstPrompt.querySelector('.typed-command');
    var heroName       = heroSection.querySelector('.hero-name');
    var heroSubtitle   = heroSection.querySelector('.hero-subtitle');
    var heroWelcome    = heroSection.querySelector('.hero-welcome');
    var heroStatus     = heroSection.querySelector('.hero-status');
    var heroNow        = heroSection.querySelector('.hero-now');
    var secondPromptLine = promptLines[1];
    var secondCommand    = secondPromptLine && secondPromptLine.querySelector('.typed-command');
    var heroMission    = heroSection.querySelector('.hero-mission');
    var heroCta        = heroSection.querySelector('.hero-cta-row');
    var finalPrompt    = promptLines[2];

    var revealTargets = [lastLogin, heroName, heroSubtitle, heroWelcome, heroStatus, heroNow, heroMission, heroCta, finalPrompt];
    revealTargets.forEach(function (el) { if (el) el.classList.add('hidden'); });

    if (fast) {
      // Snap everything to final state
      if (firstCommand) firstCommand.textContent = firstCommand.dataset.text || '';
      if (secondCommand) secondCommand.textContent = secondCommand.dataset.text || '';
      revealTargets.forEach(function (el) {
        if (el) { el.classList.remove('hidden'); el.classList.add('visible'); }
      });
      return;
    }

    // Standard desktop reveal
    await delay(300);
    if (lastLogin) { lastLogin.classList.remove('hidden'); lastLogin.classList.add('visible'); }

    await delay(300);
    if (firstCommand) await window.typeText(firstCommand, firstCommand.dataset.text, 55);

    await delay(150);
    if (heroName) { heroName.classList.remove('hidden'); heroName.classList.add('visible'); }

    await delay(300);
    if (heroSubtitle) { heroSubtitle.classList.remove('hidden'); heroSubtitle.classList.add('visible'); }

    await delay(200);
    if (heroWelcome) { heroWelcome.classList.remove('hidden'); heroWelcome.classList.add('visible'); }

    await delay(180);
    if (heroStatus) { heroStatus.classList.remove('hidden'); heroStatus.classList.add('visible'); }

    await delay(140);
    if (heroNow) { heroNow.classList.remove('hidden'); heroNow.classList.add('visible'); }

    await delay(400);
    if (secondCommand) await window.typeText(secondCommand, secondCommand.dataset.text, 55);

    await delay(150);
    if (heroMission) { heroMission.classList.remove('hidden'); heroMission.classList.add('visible'); }

    await delay(220);
    if (heroCta) { heroCta.classList.remove('hidden'); heroCta.classList.add('visible'); }

    await delay(240);
    if (finalPrompt) { finalPrompt.classList.remove('hidden'); finalPrompt.classList.add('visible'); }
  }

  // ----------------------------------------------------------
  // Init
  // ----------------------------------------------------------
  function init() {
    if (shouldBoot()) {
      runBoot();
    } else {
      // No boot overlay — ensure it's removed immediately
      var overlay = document.getElementById('boot-overlay');
      if (overlay) overlay.remove();
      runHeroSequence();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
