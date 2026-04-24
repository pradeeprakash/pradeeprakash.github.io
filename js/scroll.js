/* ============================================================
   SCROLL.JS — Section reveal observer, nav tracking, smooth
               scroll, hamburger, cd-breadcrumb transitions,
               js-ready gating.
   ============================================================ */

(function () {
  'use strict';

  // Progressive-enhancement flag — CSS uses html.js-ready to gate
  // animation start-states. Must run before any reveal logic.
  document.documentElement.classList.add('js-ready');

  var isMobile  = function () { return window.matchMedia('(max-width: 768px)').matches; };
  var isReduced = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  var delay = window.delay || function (ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  };

  // ----------------------------------------------------------
  // Motion-driven reveal helpers
  //
  // revealStagger — fades + lifts a list of elements with a
  // Motion.stagger delay. Falls back to class toggles + manual
  // delays if Motion isn't loaded or reduced-motion is active.
  // ----------------------------------------------------------
  function motionReady() {
    return window.Motion && typeof window.Motion.animate === 'function';
  }

  async function revealStagger(els, opts) {
    if (!els || !els.length) return;
    var o = opts || {};
    var dx = o.x || 0;
    var dy = o.y !== undefined ? o.y : 12;
    var dur = o.duration || 0.6;
    var stagger = o.stagger || 0.08;
    var startScale = o.scale;

    if (isReduced() || !motionReady()) {
      for (var i = 0; i < els.length; i++) {
        els[i].classList.remove('hidden');
        els[i].classList.add('visible');
        if (!isReduced()) await delay(Math.round(stagger * 1000));
      }
      return;
    }

    // Strip the pre-hide class so Motion owns the starting state.
    for (var j = 0; j < els.length; j++) els[j].classList.remove('hidden');

    var keyframes = { opacity: [0, 1], y: [dy, 0] };
    if (dx) keyframes.x = [dx, 0];
    if (startScale !== undefined) keyframes.scale = [startScale, 1];

    var controls = window.Motion.animate(els, keyframes, {
      duration: dur,
      delay: window.Motion.stagger(stagger),
      ease: [0.19, 1, 0.22, 1]
    });
    try { await controls.finished; } catch (_) {}
    for (var k = 0; k < els.length; k++) els[k].classList.add('visible');
  }

  // ----------------------------------------------------------
  // ABOUT — line-by-line JSON reveal
  // ----------------------------------------------------------
  function prepareAboutLines(sectionContent) {
    var pre = sectionContent.querySelector('.json-block');
    if (!pre) return [];
    var lines = pre.innerHTML.split('\n');
    pre.innerHTML = '';
    return lines.map(function (lineHTML) {
      var div = document.createElement('div');
      div.className = 'json-line hidden';
      div.innerHTML = lineHTML;
      pre.appendChild(div);
      return div;
    });
  }

  async function revealAboutLines(lineEls) {
    await revealStagger(lineEls, { y: 6, duration: 0.35, stagger: 0.035 });
  }

  // ----------------------------------------------------------
  // Section animations (dispatch by id)
  // ----------------------------------------------------------
  async function animateAbout(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var lineEls = Array.from(sectionContent.querySelectorAll('.json-line'));
    if (lineEls.length) await revealAboutLines(lineEls);

    var section = sectionContent.parentElement;
    if (!section) return;
    var summaryPrompt = section.querySelector('.about-summary-prompt');
    var summaryCmd    = summaryPrompt ? summaryPrompt.querySelector('.typed-command') : null;
    var summaryEl     = section.querySelector('.about-summary');

    if (summaryPrompt) { summaryPrompt.classList.remove('hidden'); summaryPrompt.classList.add('visible'); }
    if (summaryCmd && summaryCmd.dataset.text) {
      await delay(240);
      await window.typeText(summaryCmd, summaryCmd.dataset.text, 45);
    }
    if (summaryEl) {
      await delay(120);
      summaryEl.classList.remove('hidden');
      summaryEl.classList.add('visible');
    }
  }

  async function animateExperience(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var cards = Array.from(sectionContent.querySelectorAll('.exp-card'));
    var timelineDot = sectionContent.querySelector('.exp-dot');
    await revealStagger(cards, { x: -28, y: 8, scale: 0.98, duration: 0.7, stagger: 0.1 });
    var current = cards.find(function (c) { return c.classList.contains('exp-card-current'); });
    if (current && !isReduced()) {
      current.classList.add('pulse');
      if (timelineDot) timelineDot.classList.add('pulse');
    }
  }

  async function animateProjects(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var cards = Array.from(sectionContent.querySelectorAll('.project-card'));
    await revealStagger(cards, { y: 20, scale: 0.97, duration: 0.6, stagger: 0.09 });
  }

  async function animateSkills(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var cats = Array.from(sectionContent.querySelectorAll('.skill-category'));
    await revealStagger(cats, { y: 10, duration: 0.5, stagger: 0.07 });
  }

  async function animateContact(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var lines = Array.from(sectionContent.querySelectorAll('.contact-line'));
    await revealStagger(lines, { y: 10, duration: 0.5, stagger: 0.09 });
    await delay(120);
    var farewell = sectionContent.parentElement
      ? sectionContent.parentElement.querySelector('.contact-farewell')
      : null;
    if (farewell) {
      farewell.classList.remove('hidden');
      farewell.classList.add('visible');
    }
  }

  async function revealSection(section) {
    var id = section.id;
    var sectionContent = section.querySelector('.section-content');
    if (!sectionContent) return;

    switch (id) {
      case 'about':      return animateAbout(sectionContent);
      case 'experience': return animateExperience(sectionContent);
      case 'projects':   return animateProjects(sectionContent);
      case 'skills':     return animateSkills(sectionContent);
      case 'contact':    return animateContact(sectionContent);
    }
  }

  // ----------------------------------------------------------
  // `cd ~/<section>` breadcrumb above each section-trigger
  // ----------------------------------------------------------
  async function showCdBreadcrumb(section) {
    if (isMobile() || isReduced()) return;
    var crumb = section.querySelector('.cd-breadcrumb');
    if (!crumb || !crumb.dataset.cd) return;
    var target = '> cd ~/' + crumb.dataset.cd;
    await window.typeText(crumb, target, 26);
    await delay(900);
    // Fade out
    crumb.style.transition = 'opacity 300ms linear';
    crumb.style.opacity = '0';
    setTimeout(function () {
      crumb.textContent = '';
      crumb.style.opacity = '';
      crumb.style.transition = '';
    }, 320);
  }

  // ----------------------------------------------------------
  // Section trigger observer
  // ----------------------------------------------------------
  function initSectionObserver() {
    var triggers = document.querySelectorAll('.section-trigger');
    if (!triggers.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);

        var trigger = entry.target;
        var section = trigger.closest('section');
        var cmdEl   = trigger.querySelector('.typed-command');
        var text    = cmdEl ? (cmdEl.dataset.text || '') : '';
        var speed   = isMobile() ? 22 : 45;

        (async function () {
          if (section) await showCdBreadcrumb(section);
          if (cmdEl && text) await window.typeText(cmdEl, text, speed);
          if (section) await revealSection(section);
        })();
      });
    }, { threshold: 0.2 });

    triggers.forEach(function (t) { observer.observe(t); });
  }

  // ----------------------------------------------------------
  // Active nav link tracking
  // ----------------------------------------------------------
  function initNavObserver() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-link');
    if (!sections.length || !navLinks.length) return;

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { threshold: 0.3 });

    sections.forEach(function (s) { navObserver.observe(s); });
  }

  // ----------------------------------------------------------
  // Smooth scroll
  // ----------------------------------------------------------
  function initSmoothScroll() {
    var navLinks   = document.querySelectorAll('.nav-link');
    var navLinksEl = document.getElementById('nav-links');
    var hamburger  = document.getElementById('nav-hamburger');

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var href = link.getAttribute('href');
        var target = href ? document.querySelector(href) : null;
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        if (navLinksEl) navLinksEl.classList.remove('open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ----------------------------------------------------------
  // Experience timeline dot — slides down the line with scroll
  // ----------------------------------------------------------
  function initTimelineDot() {
    if (isReduced()) return;
    var timeline = document.querySelector('.experience-timeline');
    var dot = timeline ? timeline.querySelector('.exp-dot') : null;
    if (!timeline || !dot) return;

    var ticking = false;
    function update() {
      ticking = false;
      var rect = timeline.getBoundingClientRect();
      var anchor = window.innerHeight * 0.4;
      var y = Math.max(0, Math.min(rect.height - 32, (anchor - rect.top) - 20));
      dot.style.transform = 'translateY(' + y + 'px)';
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  // ----------------------------------------------------------
  // Mobile hamburger
  // ----------------------------------------------------------
  function initHamburger() {
    var hamburger  = document.getElementById('nav-hamburger');
    var navLinksEl = document.getElementById('nav-links');
    if (!hamburger || !navLinksEl) return;

    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      navLinksEl.classList.toggle('open');
      var isOpen = navLinksEl.classList.contains('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function (e) {
      var nav = document.getElementById('nav');
      if (nav && !nav.contains(e.target)) {
        navLinksEl.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ----------------------------------------------------------
  // Init
  // ----------------------------------------------------------
  function init() {
    // Pre-hide reveal targets
    document.querySelectorAll('.section-content').forEach(function (el) {
      el.classList.add('hidden');
    });
    var aboutSummaryPrompt = document.querySelector('.about-summary-prompt');
    var aboutSummary       = document.querySelector('.about-summary');
    if (aboutSummaryPrompt) aboutSummaryPrompt.classList.add('hidden');
    if (aboutSummary)       aboutSummary.classList.add('hidden');

    document.querySelectorAll('.exp-card').forEach(function (c) {
      c.classList.add('hidden', 'slide-in-left');
    });
    document.querySelectorAll('.contact-line').forEach(function (l) { l.classList.add('hidden'); });
    var farewell = document.querySelector('.contact-farewell');
    if (farewell) farewell.classList.add('hidden');
    document.querySelectorAll('.skill-category').forEach(function (c) { c.classList.add('hidden'); });
    document.querySelectorAll('.project-card').forEach(function (c) { c.classList.add('hidden'); });

    // Prep about lines
    var aboutContent = document.querySelector('#about .section-content');
    if (aboutContent) prepareAboutLines(aboutContent);

    initSectionObserver();
    initNavObserver();
    initSmoothScroll();
    initHamburger();
    initTimelineDot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
