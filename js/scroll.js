/* ============================================================
   SCROLL.JS — Scroll triggers, nav tracking, smooth scroll,
               hamburger toggle
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */
  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* ----------------------------------------------------------
     SKILL BAR BUILDER
     Renders ASCII-style progress bar into a .skill-bar element
     before animation starts (bars start at 0 fill).
  ---------------------------------------------------------- */
  var BAR_TOTAL = 20; // total block characters in each bar

  function buildSkillBar(bar) {
    var skill   = bar.dataset.skill   || '';
    var level   = parseInt(bar.dataset.level, 10) || 0;
    var filled  = Math.round((level / 100) * BAR_TOTAL);
    var empty   = BAR_TOTAL - filled;

    // Build DOM structure: name | bar chars | percent
    var nameSpan    = document.createElement('span');
    nameSpan.className = 'skill-name';
    nameSpan.textContent = skill;

    var filledSpan  = document.createElement('span');
    filledSpan.className = 'bar-filled';
    filledSpan.dataset.filled = filled;
    filledSpan.textContent = '';          // starts empty; filled on .fill

    var emptySpan   = document.createElement('span');
    emptySpan.className = 'bar-empty';
    emptySpan.dataset.empty = empty;
    emptySpan.textContent = '░'.repeat(BAR_TOTAL); // shows full empty bar

    var percentSpan = document.createElement('span');
    percentSpan.className = 'bar-percent';
    percentSpan.textContent = level + '%';

    bar.innerHTML = '';
    bar.appendChild(nameSpan);
    bar.appendChild(filledSpan);
    bar.appendChild(emptySpan);
    bar.appendChild(percentSpan);
  }

  function animateSkillBar(bar) {
    var filledSpan = bar.querySelector('.bar-filled');
    var emptySpan  = bar.querySelector('.bar-empty');
    if (!filledSpan || !emptySpan) return;

    var total  = BAR_TOTAL;
    var target = parseInt(filledSpan.dataset.filled, 10) || 0;
    var current = 0;

    function tick() {
      if (current >= target) return;
      current++;
      filledSpan.textContent = '█'.repeat(current);
      emptySpan.textContent  = '░'.repeat(total - current);
      setTimeout(tick, 30);
    }
    tick();
  }

  /* ----------------------------------------------------------
     ABOUT — line-by-line JSON reveal
     Splits the pre's innerHTML by newlines, wraps each line in
     a <div class="json-line hidden">, then staggers .visible.
  ---------------------------------------------------------- */
  function prepareAboutLines(sectionContent) {
    var pre = sectionContent.querySelector('.json-block');
    if (!pre) return [];

    var rawHTML = pre.innerHTML;
    var lines   = rawHTML.split('\n');

    pre.innerHTML = '';
    var lineEls = lines.map(function (lineHTML) {
      var div = document.createElement('div');
      div.className = 'json-line hidden';
      div.innerHTML = lineHTML;
      pre.appendChild(div);
      return div;
    });

    return lineEls;
  }

  async function revealAboutLines(lineEls) {
    for (var i = 0; i < lineEls.length; i++) {
      lineEls[i].classList.remove('hidden');
      lineEls[i].classList.add('visible');
      await delay(50);
    }
  }

  /* ----------------------------------------------------------
     SECTION ANIMATIONS
  ---------------------------------------------------------- */

  // About
  async function animateAbout(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    // Line-by-line reveal (lines prepared at init)
    var lineEls = Array.from(sectionContent.querySelectorAll('.json-line'));
    if (lineEls.length) {
      await revealAboutLines(lineEls);
    }
  }

  // Experience — stagger cards with slide-in-left
  async function animateExperience(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var cards = sectionContent.querySelectorAll('.exp-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        card.classList.remove('hidden');
        card.classList.add('visible');
      })(cards[i]);
      await delay(100);
    }
  }

  // Skills — reveal monitor, then fill bars
  async function animateSkills(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var bars = sectionContent.querySelectorAll('.skill-bar');
    for (var i = 0; i < bars.length; i++) {
      bars[i].classList.remove('hidden');
      bars[i].classList.add('visible');
      animateSkillBar(bars[i]);
      await delay(80);
    }
  }

  // Contact — stagger lines, then reveal farewell
  async function animateContact(sectionContent) {
    sectionContent.classList.remove('hidden');
    sectionContent.classList.add('visible');
    var lines = sectionContent.querySelectorAll('.contact-line');
    for (var i = 0; i < lines.length; i++) {
      (function (line) {
        line.classList.remove('hidden');
        line.classList.add('visible');
      })(lines[i]);
      await delay(150);
    }
    // Reveal farewell (sibling of section-content)
    await delay(150);
    var farewell = sectionContent.parentElement
      ? sectionContent.parentElement.querySelector('.contact-farewell')
      : null;
    if (farewell) {
      farewell.classList.remove('hidden');
      farewell.classList.add('visible');
    }
  }

  /* ----------------------------------------------------------
     DISPATCH animation by section id
  ---------------------------------------------------------- */
  async function revealSection(section) {
    var id             = section.id;
    var sectionContent = section.querySelector('.section-content');
    if (!sectionContent) return;

    switch (id) {
      case 'about':
        await animateAbout(sectionContent);
        break;
      case 'experience':
        await animateExperience(sectionContent);
        break;
      case 'skills':
        await animateSkills(sectionContent);
        break;
      case 'contact':
        await animateContact(sectionContent);
        break;
    }
  }

  /* ----------------------------------------------------------
     SECTION TRIGGER OBSERVER
     Watches .section-trigger divs; when visible, types the
     command then reveals content.
  ---------------------------------------------------------- */
  function initSectionObserver() {
    var triggers = document.querySelectorAll('.section-trigger');
    if (!triggers.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);

        var trigger   = entry.target;
        var section   = trigger.closest('section');
        var cmdEl     = trigger.querySelector('.typed-command');
        var text      = cmdEl ? (cmdEl.dataset.text || '') : '';

        // Type command, then reveal section content
        (async function () {
          if (cmdEl && text) {
            await window.typeText(cmdEl, text, 55);
          }
          if (section) {
            await revealSection(section);
          }
        })();
      });
    }, { threshold: 0.2 });

    triggers.forEach(function (trigger) {
      observer.observe(trigger);
    });
  }

  /* ----------------------------------------------------------
     ACTIVE NAV LINK TRACKING
     Watches each <section>; updates .active on matching nav link.
  ---------------------------------------------------------- */
  function initNavObserver() {
    var sections  = document.querySelectorAll('section[id]');
    var navLinks  = document.querySelectorAll('.nav-link');
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

    sections.forEach(function (section) {
      navObserver.observe(section);
    });
  }

  /* ----------------------------------------------------------
     SMOOTH SCROLL on nav link clicks
  ---------------------------------------------------------- */
  function initSmoothScroll() {
    var navLinks  = document.querySelectorAll('.nav-link');
    var navLinksEl = document.getElementById('nav-links');

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var href   = link.getAttribute('href');
        var target = href ? document.querySelector(href) : null;
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        // Close mobile menu if open
        if (navLinksEl) {
          navLinksEl.classList.remove('open');
        }
      });
    });
  }

  /* ----------------------------------------------------------
     MOBILE HAMBURGER TOGGLE
  ---------------------------------------------------------- */
  function initHamburger() {
    var hamburger  = document.getElementById('nav-hamburger');
    var navLinksEl = document.getElementById('nav-links');
    var navLinks   = document.querySelectorAll('.nav-link');

    if (!hamburger || !navLinksEl) return;

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      navLinksEl.classList.toggle('open');
      var isOpen = navLinksEl.classList.contains('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close on any nav-link click (smooth scroll handler also does this,
    // but guard here in case a link is tapped without smooth scroll)
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        navLinksEl.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on click outside nav
    document.addEventListener('click', function (e) {
      var nav = document.getElementById('nav');
      if (nav && !nav.contains(e.target)) {
        navLinksEl.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ----------------------------------------------------------
     INITIALISE on DOMContentLoaded
  ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {

    // 1. Hide all section-content elements (hero is handled by typing.js)
    document.querySelectorAll('.section-content').forEach(function (el) {
      el.classList.add('hidden');
    });

    // 2. Hide individual staggered items
    document.querySelectorAll('.exp-card').forEach(function (card) {
      card.classList.add('hidden', 'slide-in-left');
    });
    document.querySelectorAll('.contact-line').forEach(function (line) {
      line.classList.add('hidden');
    });
    var farewell = document.querySelector('.contact-farewell');
    if (farewell) farewell.classList.add('hidden');

    // 3. Hide individual skill bars (revealed with stagger)
    document.querySelectorAll('.skill-bar').forEach(function (bar) {
      // Build inner bar markup now (before hiding) so layout is stable
      buildSkillBar(bar);
      bar.classList.add('hidden');
    });

    // 4. Prepare about JSON lines
    var aboutContent = document.querySelector('#about .section-content');
    if (aboutContent) {
      prepareAboutLines(aboutContent);
    }

    // 5. Boot observers and interactions
    initSectionObserver();
    initNavObserver();
    initSmoothScroll();
    initHamburger();
  });

})();
