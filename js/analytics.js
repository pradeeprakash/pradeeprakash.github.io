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
  // Current entry is the auto-generated Vercel host — kept as-is by
  // explicit decision (no project rename). Update when adding a custom
  // domain or renaming the Vercel project.
  var CANONICAL_HOSTS = [
    'pradeeprakash.github.io',
    'portfolio-pvmsppd3m-pradeeprakashs-projects.vercel.app',
  ];

  function isProductionHost() {
    return CANONICAL_HOSTS.indexOf(location.hostname) !== -1;
  }

  window.track = function (name, props) {
    if (!isProductionHost()) return;
    if (typeof window.va !== 'function') return;  // Script not loaded — silent no-op.
    try {
      window.va('event', Object.assign({}, props || {}, { name: name }));
    } catch (e) {
      // Never break the page over an analytics error.
    }
  };
})();
