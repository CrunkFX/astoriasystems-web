// ============================================================
// Astoria Systems – Trianglify-Hintergrund für Frappe
// ------------------------------------------------------------
// Portiert vom Website-Effekt (TrianglifyBackground): ein
// animierter Low-Poly-Mesh-Hintergrund im Markenverlauf.
//
// Einbinden (Frappe 16):
//   Website Theme -> Feld "JavaScript" -> diesen Inhalt einfügen.
//   (Läuft auf den Website-Seiten inkl. /login.)
//   Alternativ via app_include_js global einbinden.
//
// Standard: nur auf der Login-Seite (/login). Für alle
// Website-Seiten unten RUN_EVERYWHERE = true setzen.
// Respektiert prefers-reduced-motion (zeichnet dann statisch).
// ============================================================
(function () {
  var RUN_EVERYWHERE = false;
  var path = window.location.pathname || "";
  if (!RUN_EVERYWHERE && path.indexOf("/login") === -1) return;
  if (document.getElementById("astoria-trianglify")) return;

  function init() {
    var canvas = document.createElement("canvas");
    canvas.id = "astoria-trianglify";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;";
    document.body.insertBefore(canvas, document.body.firstChild);
    document.body.classList.add("has-trianglify");

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function isDark() {
      return document.documentElement.classList.contains("dark");
    }

    function getPalette() {
      if (isDark()) {
        return {
          colors: [
            [3, 7, 18], [5, 12, 28], [8, 20, 40], [12, 40, 55],
            [20, 70, 80], [30, 110, 120], [46, 154, 160],
            [30, 180, 185], [30, 214, 214], [50, 225, 215],
            [63, 224, 208], [0, 229, 255],
          ],
          lineColor: "255,255,255",
          lineAlpha: 0.07,
        };
      }
      return {
        colors: [
          [250, 254, 255], [244, 252, 254], [236, 250, 253],
          [226, 246, 250], [212, 241, 246], [196, 235, 241],
          [176, 229, 236], [150, 220, 230], [120, 210, 222],
          [90, 200, 215], [63, 224, 208], [0, 229, 255],
        ],
        lineColor: "255,255,255",
        lineAlpha: 0.45,
      };
    }

    function inCircumcircle(p, a, b, c) {
      var ax = a[0] - p[0], ay = a[1] - p[1];
      var bx = b[0] - p[0], by = b[1] - p[1];
      var cx = c[0] - p[0], cy = c[1] - p[1];
      return (ax * ax + ay * ay) * (bx * cy - cx * by) -
        (bx * bx + by * by) * (ax * cy - cx * ay) +
        (cx * cx + cy * cy) * (ax * by - bx * ay) > 0;
    }

    function triangulate(points) {
      var n = points.length;
      if (n < 3) return [];
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (var i = 0; i < n; i++) {
        if (points[i][0] < minX) minX = points[i][0];
        if (points[i][1] < minY) minY = points[i][1];
        if (points[i][0] > maxX) maxX = points[i][0];
        if (points[i][1] > maxY) maxY = points[i][1];
      }
      var dMax = Math.max(maxX - minX, maxY - minY);
      var midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
      points.push([midX - 20 * dMax, midY - dMax]);
      points.push([midX + 20 * dMax, midY - dMax]);
      points.push([midX, midY + 20 * dMax]);
      var triangles = [[n, n + 1, n + 2]];
      for (var i = 0; i < n; i++) {
        var edges = [], toRemove = [];
        for (var j = 0; j < triangles.length; j++) {
          var t = triangles[j];
          if (inCircumcircle(points[i], points[t[0]], points[t[1]], points[t[2]])) {
            toRemove.push(j);
            edges.push([t[0], t[1]]); edges.push([t[1], t[2]]); edges.push([t[2], t[0]]);
          }
        }
        for (var j = toRemove.length - 1; j >= 0; j--) triangles.splice(toRemove[j], 1);
        var uniqueEdges = [];
        for (var j = 0; j < edges.length; j++) {
          var dup = false;
          for (var k = 0; k < edges.length; k++) {
            if (j !== k && edges[j][0] === edges[k][1] && edges[j][1] === edges[k][0]) { dup = true; break; }
          }
          if (!dup) uniqueEdges.push(edges[j]);
        }
        for (var j = 0; j < uniqueEdges.length; j++) triangles.push([uniqueEdges[j][0], uniqueEdges[j][1], i]);
      }
      var result = [];
      for (var i = 0; i < triangles.length; i++) {
        if (triangles[i][0] < n && triangles[i][1] < n && triangles[i][2] < n) result.push(triangles[i]);
      }
      points.splice(n, 3);
      return result;
    }

    function lerp(a, b, t) {
      return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
    }
    function pickColor(arr, t) {
      t = Math.max(0, Math.min(1, t));
      var idx = t * (arr.length - 1);
      var lo = Math.floor(idx);
      return lerp(arr[lo], arr[Math.min(lo + 1, arr.length - 1)], idx - lo);
    }

    var basePoints = [], tris = [], triColors = [], pointSeeds = [];
    var w = 0, h = 0, needsRegen = true, time = 0;
    var animDrift = 7, animSpeed = 0.0004;

    new MutationObserver(function () { needsRegen = true; })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    function setupMesh() {
      w = window.innerWidth; h = window.innerHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      var palette = getPalette();
      var cellSize = 70, jitter = cellSize * 0.75;
      basePoints = []; pointSeeds = [];
      var cols = Math.ceil(w / cellSize) + 2, rows = Math.ceil(h / cellSize) + 2;
      for (var row = -1; row <= rows; row++) {
        for (var col = -1; col <= cols; col++) {
          basePoints.push([col * cellSize + (Math.random() - 0.5) * jitter, row * cellSize + (Math.random() - 0.5) * jitter]);
          pointSeeds.push([Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0.7 + Math.random() * 0.6]);
        }
      }
      var pts = [];
      for (var i = 0; i < basePoints.length; i++) pts.push([basePoints[i][0], basePoints[i][1]]);
      tris = triangulate(pts);
      triColors = [];
      for (var i = 0; i < tris.length; i++) {
        var t = tris[i];
        var cx = (basePoints[t[0]][0] + basePoints[t[1]][0] + basePoints[t[2]][0]) / 3;
        var cy = (basePoints[t[0]][1] + basePoints[t[1]][1] + basePoints[t[2]][1]) / 3;
        var gradPos = (cx / w * 0.6 + cy / h * 0.4) + (Math.random() - 0.5) * 0.15;
        triColors.push(pickColor(palette.colors, gradPos));
      }
      needsRegen = false;
    }

    function paint(animated) {
      var palette = getPalette();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < tris.length; i++) {
        var t = tris[i];
        var x0 = basePoints[t[0]][0], y0 = basePoints[t[0]][1];
        var x1 = basePoints[t[1]][0], y1 = basePoints[t[1]][1];
        var x2 = basePoints[t[2]][0], y2 = basePoints[t[2]][1];
        if (animated) {
          var s0 = pointSeeds[t[0]], s1 = pointSeeds[t[1]], s2 = pointSeeds[t[2]];
          x0 += Math.sin(time * s0[2] + s0[0]) * animDrift; y0 += Math.cos(time * s0[2] + s0[1]) * animDrift;
          x1 += Math.sin(time * s1[2] + s1[0]) * animDrift; y1 += Math.cos(time * s1[2] + s1[1]) * animDrift;
          x2 += Math.sin(time * s2[2] + s2[0]) * animDrift; y2 += Math.cos(time * s2[2] + s2[1]) * animDrift;
        }
        var c = triColors[i];
        ctx.beginPath();
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath();
        ctx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
        ctx.fill();
        ctx.strokeStyle = "rgba(" + palette.lineColor + "," + palette.lineAlpha + ")";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    function draw() {
      if (needsRegen) setupMesh();
      if (basePoints.length) { time += animSpeed; paint(true); }
      requestAnimationFrame(draw);
    }

    setupMesh();
    if (prefersReduced) paint(false);
    else requestAnimationFrame(draw);

    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { needsRegen = true; }, 200); });
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
