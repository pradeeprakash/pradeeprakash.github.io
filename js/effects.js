/* ============================================================
   EFFECTS.JS — Resume download animation
   ============================================================ */

(function () {
  'use strict';

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

  document.addEventListener('DOMContentLoaded', initResumeAnimation);

})();
