/* ============================================================
   EFFECTS.JS — Glitch hover, screen flicker, resume animation
   ============================================================ */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     1. GLITCH HOVER — hero name (.glitch elements)
     mouseenter adds .glitch-active; mouseleave removes it.
     CSS ::before / ::after pseudo-elements do the RGB split.
  ---------------------------------------------------------- */
  function initGlitchHover() {
    var glitchEls = document.querySelectorAll('.glitch');
    glitchEls.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        el.classList.add('glitch-active');
      });
      el.addEventListener('mouseleave', function () {
        el.classList.remove('glitch-active');
      });
    });
  }

  /* ----------------------------------------------------------
     2. RANDOM SCREEN FLICKER
     Fires every 15–30 s (randomised each time). Skipped on
     mobile (< 768 px wide) and when prefers-reduced-motion.
  ---------------------------------------------------------- */
  function scheduleFlicker() {
    if (reducedMotion) return;
    if (window.innerWidth < 768) return;

    var delay = 15000 + Math.random() * 15000; // 15 000–30 000 ms

    setTimeout(function () {
      // Only flicker if still on a wide-enough viewport
      if (window.innerWidth >= 768) {
        document.body.classList.add('flicker');
        setTimeout(function () {
          document.body.classList.remove('flicker');
        }, 50);
      }
      // Re-schedule regardless — viewport may widen later
      scheduleFlicker();
    }, delay);
  }

  /* ----------------------------------------------------------
     3. RESUME DOWNLOAD ANIMATION
     Cycles "downloading." → ".." → "..." every 200 ms for 1 s,
     then restores original text. Actual download still fires via
     the <a download> attribute (default not prevented).
  ---------------------------------------------------------- */
  function initResumeAnimation() {
    var resumeLink = document.querySelector('.contact-resume');
    if (!resumeLink) return;

    var activeIntervalId = null;
    var activeTimeoutId  = null;
    var originalText     = resumeLink.textContent;

    resumeLink.addEventListener('click', function () {
      if (activeIntervalId !== null) {
        clearInterval(activeIntervalId);
        clearTimeout(activeTimeoutId);
      }

      var dotCount = 0;
      activeIntervalId = setInterval(function () {
        dotCount = (dotCount % 3) + 1;
        resumeLink.textContent = 'downloading' + '.'.repeat(dotCount);
      }, 200);

      activeTimeoutId = setTimeout(function () {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
        activeTimeoutId  = null;
        resumeLink.textContent = originalText;
      }, 1000);
    });
  }

  /* ----------------------------------------------------------
     INIT on DOMContentLoaded
  ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initGlitchHover();
    scheduleFlicker();
    initResumeAnimation();
  });

})();
