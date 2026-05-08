/* ============================================================
   ANALYTICS.JS — Tiny shim over Vercel Web Analytics.
                  Forwards window.track() calls to window.va()
                  only when running on a canonical production host.
   ============================================================ */

(function () {
  'use strict';

  // Positive-match against the production canonical host(s).
  // Append entries here when adding a custom domain; old hosts can stay
  // in the list during a transition window.
  var CANONICAL_HOSTS = [
    'portfolio-nu-six-g0nsnyjwbz.vercel.app',
  ];

  function isProductionHost() {
    return CANONICAL_HOSTS.indexOf(location.hostname) !== -1;
  }

  window.track = function (name, props) {
    if (!isProductionHost()) return;
    if (typeof window.va !== 'function') return;  // Script not loaded — silent no-op.
    try {
      window.va('event', Object.assign({ name: name }, props || {}));
    } catch (e) {
      // Never break the page over an analytics error.
    }
  };
})();
