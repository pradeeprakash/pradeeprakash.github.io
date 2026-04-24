/* ============================================================
   EFFECTS.JS — Resume download micro-animation + ASCII cube
   ============================================================ */

(function () {
  'use strict';

  // ---- Rotating ASCII wireframe cube (desktop only) ---------------
  // Renders an 8-vertex / 12-edge cube by rotating on X and Y, projecting
  // with perspective, and rasterising edges via Bresenham into a char
  // grid. Updated via setInterval (~18 fps) since the browser throttles
  // hidden tabs to 1 Hz automatically — so no extra visibility plumbing.
  function initCube() {
    var el = document.getElementById('hero-cube');
    if (!el) return;
    // CSS already hides the wrapper below 768 px; skip the work too.
    if (window.innerWidth <= 768) return;

    var W = 32, H = 16, ASPECT = 2, DIST = 5, SCALE = 12;

    var verts = [
      [-1,-1,-1],[ 1,-1,-1],[ 1, 1,-1],[-1, 1,-1],
      [-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1]
    ];
    var edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7]
    ];

    function project(v, ax, ay) {
      var x = v[0], y = v[1], z = v[2];
      var cy = Math.cos(ay), sy = Math.sin(ay);
      var x1 = x * cy - z * sy;
      var z1 = x * sy + z * cy;
      var cx = Math.cos(ax), sx = Math.sin(ax);
      var y1 = y * cx - z1 * sx;
      var z2 = y * sx + z1 * cx;
      var f = SCALE / (z2 + DIST);
      return [
        Math.round(x1 * f * ASPECT + W / 2),
        Math.round(y1 * f + H / 2)
      ];
    }

    function line(g, x0, y0, x1, y1, ch) {
      var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      var err = dx - dy;
      while (true) {
        if (y0 >= 0 && y0 < H && x0 >= 0 && x0 < W && g[y0][x0] === ' ') {
          g[y0][x0] = ch;
        }
        if (x0 === x1 && y0 === y1) break;
        var e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 <  dx) { err += dx; y0 += sy; }
      }
    }

    function render(ax, ay) {
      var g = [];
      for (var y = 0; y < H; y++) {
        var row = [];
        for (var x = 0; x < W; x++) row.push(' ');
        g.push(row);
      }
      var pts = [];
      for (var i = 0; i < verts.length; i++) pts.push(project(verts[i], ax, ay));
      for (var j = 0; j < edges.length; j++) {
        var a = pts[edges[j][0]], b = pts[edges[j][1]];
        line(g, a[0], a[1], b[0], b[1], '·');
      }
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        if (p[1] >= 0 && p[1] < H && p[0] >= 0 && p[0] < W) g[p[1]][p[0]] = '+';
      }
      var out = '';
      for (var r = 0; r < H; r++) out += g[r].join('') + '\n';
      el.textContent = out;
    }

    var prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      // Static frame — visible but not animated (parity requirement).
      render(0.55, 0.7);
      return;
    }

    var ax = 0, ay = 0;
    render(ax, ay);
    setInterval(function () {
      if (document.hidden) return;
      ax += 0.022;
      ay += 0.030;
      render(ax, ay);
    }, 55);
  }

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

  function boot() {
    initResumeAnimation();
    initCube();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
