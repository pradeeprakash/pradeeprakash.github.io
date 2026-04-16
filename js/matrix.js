(function () {
  'use strict';

  // --- Accessibility / capability checks ---
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d', { willReadFrequently: false });

  // --- State ---
  var columns = [];
  var animFrameId = null;
  var resizeTimer = null;

  // Scroll-boost state (0 = normal, 1 = fully boosted; decays each frame)
  var scrollBoost = 0;
  var lastScrollTime = 0;
  var SCROLL_THROTTLE = 100;    // ms — max one boost per 100ms

  // --- Character sets ---
  // Katakana U+30A0 – U+30FF
  var KATAKANA_START = 0x30A0;
  var KATAKANA_END   = 0x30FF;
  var KATAKANA_LEN   = KATAKANA_END - KATAKANA_START + 1;

  var LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function randomChar() {
    // 60% katakana, 40% latin
    if (Math.random() < 0.6) {
      return String.fromCharCode(KATAKANA_START + Math.floor(Math.random() * KATAKANA_LEN));
    }
    return LATIN[Math.floor(Math.random() * LATIN.length)];
  }

  // --- Column factory ---
  var FONT_SIZE = 14;

  function makeColumn(x, height) {
    return {
      x: x,
      y: Math.random() * height,   // random starting position
      speed: 0.5 + Math.random() * 0.5  // per-frame advance in "cells" (fractional)
    };
  }

  // --- Setup / resize ---
  function isMobile() {
    return window.innerWidth < 768;
  }

  function setup() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    canvas.width  = w;
    canvas.height = h;

    if (isMobile()) {
      canvas.classList.add('mobile');
      stopLoop();
      return;
    }

    canvas.classList.remove('mobile');

    ctx.font = FONT_SIZE + 'px monospace';

    var colCount = Math.floor(w / FONT_SIZE);
    columns = [];
    for (var i = 0; i < colCount; i++) {
      columns.push(makeColumn(i * FONT_SIZE, h));
    }

    startLoop();
  }

  // --- Animation loop ---
  function draw() {
    var h = canvas.height;

    // Fade previous frame
    ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
    ctx.fillRect(0, 0, canvas.width, h);

    // Scroll boost: extra opacity and speed boost (0 = none, 1 = full boost)
    var opacityBoost = scrollBoost * 0.15;   // max +0.15 added to lead
    var speedBoost   = 1 + scrollBoost * 1.5; // up to 2.5x speed

    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];

      // --- Trail character (faint) ---
      var baseOpacity = 0.03 + Math.random() * 0.02; // 0.03-0.05
      ctx.fillStyle = 'rgba(0, 255, 136, ' + baseOpacity + ')';
      ctx.fillText(randomChar(), col.x, col.y);

      // --- Lead character (brighter) ---
      var leadY = col.y + FONT_SIZE;
      if (leadY <= h) {
        var leadOpacity = 0.2 + Math.random() * 0.2 + opacityBoost; // 0.2-0.4 + boost
        leadOpacity = Math.min(leadOpacity, 0.85); // cap it
        ctx.fillStyle = 'rgba(0, 255, 136, ' + leadOpacity + ')';
        ctx.fillText(randomChar(), col.x, leadY);
      }

      // Advance column
      col.y += FONT_SIZE * col.speed * speedBoost;

      // Reset when past canvas bottom, with ~2% probability per frame
      if (col.y > h || Math.random() < 0.02) {
        // Only reset if past bottom OR random early reset
        if (col.y > h) {
          col.y = -FONT_SIZE;
        } else {
          // Early reset: skip back to a random position near top
          col.y = Math.random() * -h * 0.5;
        }
      }
    }

    // Decay scroll boost
    if (scrollBoost > 0) {
      scrollBoost = Math.max(0, scrollBoost - 0.02);
    }

    animFrameId = requestAnimationFrame(draw);
  }

  function startLoop() {
    if (animFrameId !== null) return; // already running
    animFrameId = requestAnimationFrame(draw);
  }

  function stopLoop() {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // --- Resize handler (debounced 200ms) ---
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      stopLoop();
      setup();
    }, 200);
  }

  // --- Scroll handler (throttled 100ms) ---
  // On scroll: immediately set scrollBoost = 1 (faster fall + brighter lead).
  // draw() decrements scrollBoost by 0.02 per frame (~833ms to fully decay at 60fps).
  // The effect is "active" for ~500ms then visibly decaying, satisfying the spec.

  function onScroll() {
    var now = Date.now();
    if (now - lastScrollTime < SCROLL_THROTTLE) return;
    lastScrollTime = now;

    scrollBoost = 1; // full boost on scroll — decays naturally in draw()
  }

  // --- Bootstrap ---
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });

  setup();

})();
