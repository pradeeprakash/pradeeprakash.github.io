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

  var delay = window.delay;

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
    for (var i = 0; i < lineEls.length; i++) {
      lineEls[i].classList.remove('hidden');
      lineEls[i].classList.add('visible');
      await delay(40);
    }
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
    var cards = sectionContent.querySelectorAll('.exp-card');
    var timelineDot = sectionContent.querySelector('.exp-dot');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      card.classList.remove('hidden');
      card.classList.add('visible');
      // Pulse on the current-role card + the timeline dot exactly once
      if (card.classList.contains('exp-card-current') && !isReduced()) {
        card.classList.add('pulse');
        if (timelineDot) timelineDot.classList.add('pulse');
      }
      await delay(80);
    }
  }

  async function animateSkills(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var cats = sectionContent.querySelectorAll('.skill-category');
    for (var i = 0; i < cats.length; i++) {
      cats[i].classList.remove('hidden');
      cats[i].classList.add('visible');
      await delay(60);
    }
  }

  async function animateContact(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var lines = sectionContent.querySelectorAll('.contact-line');
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.remove('hidden');
      lines[i].classList.add('visible');
      await delay(100);
    }
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
