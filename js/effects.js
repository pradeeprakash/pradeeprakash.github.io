/* ============================================================
   EFFECTS.JS — Resume download micro-animation
   ============================================================ */

(function () {
  'use strict';

  function initResumeAnimation() {
    var links = document.querySelectorAll('[data-command="resume"]');
    if (!links.length) return;

    links.forEach(function (link) {
      // Apply the "downloading..." animation only to text-content links
      // (skip buttons like [get] / [pdf] that have child glyphs).
      var textSpan = link.querySelector('span:not(.arrow):not(.fab-glyph)') || null;
      var target   = textSpan || link;
      var original = target.textContent;

      var intervalId = null;
      var timeoutId  = null;

      link.addEventListener('click', function () {
        // Only run the animation on the hero CTA or contact-resume link —
        // skip the compact [get] button to keep it crisp.
        var animate = link.classList.contains('hero-cta') || link.classList.contains('contact-resume');
        if (!animate) return;

        if (intervalId !== null) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }

        var dotCount = 0;
        intervalId = setInterval(function () {
          dotCount = (dotCount % 3) + 1;
          target.textContent = 'downloading' + '.'.repeat(dotCount);
        }, 200);

        timeoutId = setTimeout(function () {
          clearInterval(intervalId);
          intervalId = null;
          timeoutId  = null;
          target.textContent = '[ OK ]';
          setTimeout(function () {
            target.textContent = original;
          }, 900);
        }, 900);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResumeAnimation);
  } else {
    initResumeAnimation();
  }
})();
