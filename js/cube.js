/* CSS 3D glass cube — drives #hero-cube-3d rotation.
   Uses Motion if loaded, falls back to rAF. Pauses when
   off-screen, when tab is hidden, or on reduced-motion. */
(function () {
  'use strict';

  var el = document.getElementById('hero-cube-3d');
  if (!el) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function setAngle(rx, ry) {
    el.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
  }

  setAngle(-18, 32);
  if (reduced.matches) return;

  var controls = null;
  var raf = 0;
  var running = false;

  function startMotion() {
    if (!window.Motion || typeof window.Motion.animate !== 'function') return false;
    controls = window.Motion.animate(0, 1, {
      duration: 16,
      repeat: Infinity,
      ease: 'linear',
      onUpdate: function (p) {
        var ry = p * 360;
        var rx = -18 + Math.sin(p * Math.PI * 6) * 7;
        setAngle(rx, ry);
      }
    });
    return true;
  }
  function startRaf() {
    var t0 = 0;
    function loop(t) {
      if (!t0) t0 = t;
      var dt = (t - t0) / 1000;
      var p = (dt / 16) % 1;
      var ry = p * 360;
      var rx = -18 + Math.sin(p * Math.PI * 6) * 7;
      setAngle(rx, ry);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }
  function play() {
    if (running || reduced.matches) return;
    running = true;
    if (!startMotion()) startRaf();
  }
  function pause() {
    if (!running) return;
    running = false;
    if (controls) { try { controls.cancel(); } catch (_) {} controls = null; }
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  var io = new IntersectionObserver(function (entries) {
    entries[0].isIntersecting ? play() : pause();
  }, { threshold: 0 });
  io.observe(el);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else if (!reduced.matches) play();
  });
  reduced.addEventListener('change', function (e) {
    if (e.matches) pause();
  });
})();
