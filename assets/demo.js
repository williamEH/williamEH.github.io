/*
 * PrintGuard v1 mini — demo controller.
 *
 * Runs the exported classifier entirely in the visitor's browser: parse the
 * mesh, build the 869-value geometry feature vector, walk 198 gradient-boosted
 * trees, apply the policy thresholds. Nothing is uploaded.
 */
(function () {
  "use strict";

  const dialog = document.querySelector("[data-pg]");
  if (!dialog) return;

  const engine = window.PrintGuardEngine;
  const model = window.PRINTGUARD_MODEL;
  const catalogue = window.PRINTGUARD_FIXTURES;
  const HASH = "#demo";
  const PASSPHRASE = "beingandtime";
  const STORAGE_KEY = "printguard-demo-unlocked";
  const MAX_BYTES = 64 * 1024 * 1024;
  const SCENE_ASPECT = 0.72;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (selector, scope) => (scope || dialog).querySelector(selector);
  const $$ = (selector, scope) => [...(scope || dialog).querySelectorAll(selector)];

  /* ------------------------------------------------------------ feature map */

  // Index layout of the 869-value legacy_geometry vector.
  const LAYOUT = {
    basic: [0, 23],
    radial: [23, 39],
    pairwise: [39, 55],
    voxel: [55, 567],
    views: [567, 867],
    fill: [867, 869],
  };

  const GROUPS = [
    { name: "Voxel occupancy", hint: "8×8×8 solid grid", from: 55, to: 567 },
    { name: "Orthographic silhouettes", hint: "3 × 10×10 views", from: 567, to: 867 },
    { name: "Pairwise distances", hint: "shape spread", from: 39, to: 55 },
    { name: "Radial profile", hint: "mass vs. centre", from: 23, to: 39 },
    { name: "Dimensions & volume", hint: "bbox, area", from: 0, to: 11 },
    { name: "Edge statistics", hint: "mesh resolution", from: 11, to: 15 },
    { name: "Centroid & format", hint: "balance, file type", from: 15, to: 23 },
    { name: "Occupancy totals", hint: "overall fill", from: 867, to: 869 },
  ];

  const slice = (features, key) => features.slice(LAYOUT[key][0], LAYOUT[key][1]);

  /**
   * Attribute each tree's output to the features tested on the path it took,
   * then roll those up into feature groups. This is a decision-path summary,
   * not a Shapley value: it reports where the model looked, weighted by how
   * much that tree moved the score.
   */
  function attribution(features) {
    const weights = new Float64Array(869);
    for (const nodes of model.trees) {
      let node = nodes[0];
      const path = [];
      while (node[0] === 0) {
        path.push(node[1]);
        const value = features[node[1]];
        const goLeft = Number.isNaN(value) ? node[3] === 1 : value <= node[2];
        node = nodes[goLeft ? node[4] : node[5]];
      }
      if (!path.length) continue;
      const share = Math.abs(node[1]) / path.length;
      for (const index of path) weights[index] += share;
    }
    let total = 0;
    const rows = GROUPS.map((group) => {
      let sum = 0;
      for (let i = group.from; i < group.to; i += 1) sum += weights[i];
      total += sum;
      return { name: group.name, hint: group.hint, value: sum };
    });
    if (total > 0) rows.forEach((row) => { row.share = row.value / total; });
    else rows.forEach((row) => { row.share = 0; });
    return rows.sort((a, b) => b.share - a.share);
  }

  /* -------------------------------------------------------------- rendering */

  // Writing canvas.width/height reallocates and clears the backing store, so
  // only touch it when the box has actually changed size. Doing this every
  // animation frame costs more than everything drawn on top of it.
  function fitCanvas(canvas, aspect) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || canvas.parentElement.clientWidth || 320;
    const height = Math.round(width * aspect);
    const context = canvas.getContext("2d");
    if (canvas._pgW !== width || canvas._pgH !== height || canvas._pgR !== ratio) {
      canvas.style.height = height + "px";
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas._pgW = width;
      canvas._pgH = height;
      canvas._pgR = ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    return { context, width, height };
  }

  function project(x, y, z, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y1 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    return [x1, y1, z2];
  }

  // Shared rotating 3D viewport for mesh / point-cloud / voxel modes.
  const scene = {
    canvas: null,
    mode: "mesh",
    yaw: 0.38,
    pitch: -0.22,
    data: null,
  };

  function centreAndScale(vertices, count) {
    const mins = [Infinity, Infinity, Infinity];
    const maxs = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < count; i += 1) {
      for (let a = 0; a < 3; a += 1) {
        const v = vertices[i * 3 + a];
        if (v < mins[a]) mins[a] = v;
        if (v > maxs[a]) maxs[a] = v;
      }
    }
    const scale = Math.max(maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2], 1e-9);
    return {
      centre: [(mins[0] + maxs[0]) / 2, (mins[1] + maxs[1]) / 2, (mins[2] + maxs[2]) / 2],
      scale,
    };
  }

  /**
   * Choose a display frame: longest axis across the screen, middle axis up,
   * thinnest axis toward the viewer. Looking down the thinnest axis shows the
   * largest silhouette, which is the view that makes a part recognisable.
   * An odd axis permutation mirrors the model, so the depth axis is negated to
   * keep the winding right-handed and back-face culling correct.
   */
  function chooseAxes(extent) {
    const order = [0, 1, 2].sort((a, b) => extent[b] - extent[a]);
    const even =
      (order[0] === 0 && order[1] === 1) ||
      (order[0] === 1 && order[1] === 2) ||
      (order[0] === 2 && order[1] === 0);
    return { order, flip: even ? 1 : -1 };
  }

  function mapPoint(x, y, z, axes) {
    const v = [x, y, z];
    return [v[axes.order[0]], v[axes.order[1]], v[axes.order[2]] * axes.flip];
  }

  function buildSceneData(result) {
    const data = { points: null, triangles: null, voxels: null };

    // The feature vector's voxel grid is present for every result, so derive the
    // display roll from it rather than from geometry we may not have.
    const extent = [0, 0, 0];
    const voxelSlice = slice(result.features, "voxel");
    const seen = [[1, 0], [1, 0], [1, 0]];
    for (let i = 0; i < voxelSlice.length; i += 1) {
      if (voxelSlice[i] <= 0) continue;
      const coord = [Math.floor(i / 64), Math.floor((i % 64) / 8), i % 8];
      for (let a = 0; a < 3; a += 1) {
        if (coord[a] < seen[a][0]) seen[a][0] = coord[a];
        if (coord[a] > seen[a][1]) seen[a][1] = coord[a];
      }
    }
    for (let a = 0; a < 3; a += 1) extent[a] = seen[a][1] - seen[a][0];
    const axes = chooseAxes(extent);
    data.axes = axes;

    const rawPoints = result.signature
      ? result.signature.points
      : result.pointsQ
        ? Float64Array.from(result.pointsQ, (v) => v / 1000)
        : null;

    if (rawPoints) {
      const points = rawPoints; // normalised to [-0.5, 0.5]
      const mapped = new Float64Array(points.length);
      for (let i = 0; i < points.length / 3; i += 1) {
        const m = mapPoint(points[i * 3], points[i * 3 + 1], points[i * 3 + 2], axes);
        mapped[i * 3] = m[0];
        mapped[i * 3 + 1] = m[1];
        mapped[i * 3 + 2] = m[2];
      }
      data.points = mapped;
    }

    if (result.mesh) {
      const { vertices, faces, faceCount } = result.mesh;
      const { centre, scale } = centreAndScale(vertices, result.mesh.vertexCount);
      const cap = 300000;
      const step = faceCount > cap ? Math.ceil(faceCount / cap) : 1;
      const kept = Math.ceil(faceCount / step);
      const tri = new Float32Array(kept * 9);
      let t = 0;
      for (let f = 0; f < faceCount; f += step) {
        for (let corner = 0; corner < 3; corner += 1) {
          const vi = faces[f * 3 + corner] * 3;
          const m = mapPoint(
            (vertices[vi] - centre[0]) / scale,
            (vertices[vi + 1] - centre[1]) / scale,
            (vertices[vi + 2] - centre[2]) / scale,
            axes
          );
          tri[t++] = m[0];
          tri[t++] = m[1];
          tri[t++] = m[2];
        }
      }
      data.triangles = tri.subarray(0, t);
      const triCount = t / 9;
      scene.buffer = {
        sx: new Float32Array(triCount * 3),
        sy: new Float32Array(triCount * 3),
        depth: new Float32Array(triCount),
      };
    }

    const voxels = slice(result.features, "voxel");
    const filled = [];
    for (let i = 0; i < voxels.length; i += 1) {
      if (voxels[i] <= 0) continue;
      const x = Math.floor(i / 64), y = Math.floor((i % 64) / 8), z = i % 8;
      filled.push(mapPoint((x + 0.5) / 8 - 0.5, (y + 0.5) / 8 - 0.5, (z + 0.5) / 8 - 0.5, axes));
    }
    data.voxels = filled;

    // Twelve triangles per occupied cell, inset slightly so the grid reads as
    // separate cells rather than one fused block.
    const cell = 1 / 8;
    const half = cell * 0.4;
    const cube = new Float32Array(filled.length * 36 * 3);
    let vi = 0;
    const quad = (a, b, c, d) => {
      for (const v of [a, b, c, a, c, d]) {
        cube[vi++] = v[0];
        cube[vi++] = v[1];
        cube[vi++] = v[2];
      }
    };
    for (const [cxv, cyv, czv] of filled) {
      const x0 = cxv - half, x1 = cxv + half;
      const y0 = cyv - half, y1 = cyv + half;
      const z0 = czv - half, z1 = czv + half;
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
      quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
      quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    }
    data.voxelTriangles = cube;
    const vlo = [Infinity, Infinity, Infinity];
    const vhi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < cube.length; i += 3) {
      for (let a = 0; a < 3; a += 1) {
        if (cube[i + a] < vlo[a]) vlo[a] = cube[i + a];
        if (cube[i + a] > vhi[a]) vhi[a] = cube[i + a];
      }
    }
    data.voxelBounds = { lo: vlo, hi: vhi };

    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    const track = (x, y, z) => {
      const v = [x, y, z];
      for (let a = 0; a < 3; a += 1) {
        if (v[a] < lo[a]) lo[a] = v[a];
        if (v[a] > hi[a]) hi[a] = v[a];
      }
    };
    if (data.triangles) {
      for (let i = 0; i < data.triangles.length; i += 3) {
        track(data.triangles[i], data.triangles[i + 1], data.triangles[i + 2]);
      }
    } else if (data.points) {
      for (let i = 0; i < data.points.length; i += 3) {
        track(data.points[i], data.points[i + 1], data.points[i + 2]);
      }
    } else {
      for (const v of filled) track(v[0], v[1], v[2]);
    }
    data.bounds = { lo, hi };
    return data;
  }

  // Solid shaded render via a small software z-buffer. Painter's algorithm over
  // a stride-sampled subset cannot tile a surface, so it reads as debris; a
  // depth-buffered rasteriser draws every triangle correctly and only has to
  // run when the orientation actually changes.
  function renderSolid(tri, bounds, quality) {
    const canvas = scene.canvas;
    const total = tri.length / 9;
    const { context } = fitCanvas(canvas, SCENE_ASPECT);
    const W = canvas.width;
    const H = canvas.height;
    const step = quality === "fast" ? Math.max(1, Math.ceil(total / 24000)) : 1;

    const image = context.createImageData(W, H);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 22; pixels[i + 1] = 21; pixels[i + 2] = 18; pixels[i + 3] = 255;
    }
    const zbuf = new Float32Array(W * H).fill(-Infinity);

    const cosY = Math.cos(scene.yaw), sinY = Math.sin(scene.yaw);
    const cosP = Math.cos(scene.pitch), sinP = Math.sin(scene.pitch);
    const scale = fitScale(bounds, scene.yaw, scene.pitch, W, H, 0.92);
    const ox = W / 2;
    const oy = H / 2;

    // Screen coords for rasterising; unscaled view coords for the normal. The
    // two must be kept apart: mixing pixel-space x/y with model-space z makes
    // the cross product wildly anisotropic, nz swamps the normal once it is
    // normalised, and every face ends up with the same shade.
    const ax = new Float64Array(3), ay = new Float64Array(3), az = new Float64Array(3);
    const vx = new Float64Array(3), vy = new Float64Array(3);
    for (let t = 0; t < total; t += step) {
      for (let c = 0; c < 3; c += 1) {
        const o = t * 9 + c * 3;
        const x = tri[o], y = tri[o + 1], z = tri[o + 2];
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y1 = y * cosP - z1 * sinP;
        vx[c] = x1;
        vy[c] = y1;
        ax[c] = ox + x1 * scale;
        ay[c] = oy - y1 * scale;
        az[c] = y * sinP + z1 * cosP;
      }
      const e1x = ax[1] - ax[0], e1y = ay[1] - ay[0], e1z = az[1] - az[0];
      const e2x = ax[2] - ax[0], e2y = ay[2] - ay[0], e2z = az[2] - az[0];
      const area = e1x * e2y - e1y * e2x;
      if (area <= 0) continue; // back face (screen y is already flipped)

      // View-space normal, negated so it faces the viewer: the screen y-flip
      // reverses handedness, so a visible face's raw cross product points away.
      const g1x = vx[1] - vx[0], g1y = vy[1] - vy[0], g1z = e1z;
      const g2x = vx[2] - vx[0], g2y = vy[2] - vy[0], g2z = e2z;
      let nx = -(g1y * g2z - g1z * g2y);
      let ny = -(g1z * g2x - g1x * g2z);
      let nz = -(g1x * g2y - g1y * g2x);
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      // Key light high and to the viewer's left.
      let lambert = nx * -0.4 + ny * 0.6 + nz * 0.69;
      // STL winding is often inconsistent, so treat an inward normal as lit
      // rather than black, just a little dimmer.
      if (lambert < 0) lambert = -lambert * 0.55;
      const shade = 0.18 + Math.min(1, lambert) * 0.82;

      let minX = Math.max(0, Math.floor(Math.min(ax[0], ax[1], ax[2])));
      let maxX = Math.min(W - 1, Math.ceil(Math.max(ax[0], ax[1], ax[2])));
      let minY = Math.max(0, Math.floor(Math.min(ay[0], ay[1], ay[2])));
      let maxY = Math.min(H - 1, Math.ceil(Math.max(ay[0], ay[1], ay[2])));
      if (minX > maxX || minY > maxY) continue;

      const inv = 1 / area;
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          const rx = px + 0.5 - ax[0];
          const ry = py + 0.5 - ay[0];
          const w1 = (rx * e2y - ry * e2x) * inv;
          if (w1 < 0) continue;
          const w2 = (e1x * ry - e1y * rx) * inv;
          if (w2 < 0 || w1 + w2 > 1) continue;
          const depth = az[0] + e1z * w1 + e2z * w2;
          const index = py * W + px;
          if (depth <= zbuf[index]) continue;
          zbuf[index] = depth;
          // Cool-to-warm depth cue on top of the lambert term.
          const cue = 0.72 + Math.min(1, Math.max(0, depth + 0.5)) * 0.28;
          const v = shade * cue;
          const o4 = index * 4;
          pixels[o4] = Math.min(255, 34 + v * 214);
          pixels[o4 + 1] = Math.min(255, 30 + v * 202);
          pixels[o4 + 2] = Math.min(255, 27 + v * 188);
        }
      }
    }
    context.putImageData(image, 0, 0);
  }

  function fitScale(bounds, yaw, pitch, width, height, pad) {
    if (!bounds) return Math.min(width, height) * 0.78;
    let maxX = 0;
    let maxY = 0;
    for (let corner = 0; corner < 8; corner += 1) {
      const x = corner & 1 ? bounds.hi[0] : bounds.lo[0];
      const y = corner & 2 ? bounds.hi[1] : bounds.lo[1];
      const z = corner & 4 ? bounds.hi[2] : bounds.lo[2];
      const p = project(x, y, z, yaw, pitch);
      maxX = Math.max(maxX, Math.abs(p[0]));
      maxY = Math.max(maxY, Math.abs(p[1]));
    }
    const limit = Math.min(width / (maxX * 2 || 1), height / (maxY * 2 || 1));
    return limit * pad;
  }

  function drawScene(quality) {
    const canvas = scene.canvas;
    if (!canvas || !scene.data) return;

    if (scene.mode === "mesh" && scene.data.triangles) {
      renderSolid(scene.data.triangles, scene.data.bounds, quality);
      return;
    }

    if (scene.mode === "voxels" && scene.data.voxelTriangles) {
      renderSolid(scene.data.voxelTriangles, scene.data.voxelBounds, quality);
      return;
    }

    const { context, width, height } = fitCanvas(canvas, SCENE_ASPECT);
    context.clearRect(0, 0, width, height);
    const radius = fitScale(scene.data.bounds, scene.yaw, scene.pitch, width, height, 0.9) / 2;
    const cx = width / 2;
    const cy = height / 2;
    const { yaw, pitch } = scene;
    const toScreen = (x, y, z) => {
      const p = project(x, y, z, yaw, pitch);
      return [cx + p[0] * radius * 2, cy - p[1] * radius * 2, p[2]];
    };

    if (scene.mode === "points" && scene.data.points) {
      const points = scene.data.points;
      const count = points.length / 3;
      const projected = [];
      for (let i = 0; i < count; i += 1) {
        projected.push(toScreen(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]));
      }
      projected.sort((a, b) => a[2] - b[2]);
      for (const p of projected) {
        const depth = Math.min(1, Math.max(0, p[2] + 0.5));
        context.fillStyle = `rgba(255,104,77,${0.25 + depth * 0.6})`;
        context.beginPath();
        context.arc(p[0], p[1], 1.5 + depth * 1.1, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

  }

  // Drag to orbit. Rendering on demand keeps a demo page from pinning a core.
  function bindOrbit(canvas) {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", (event) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      scene.yaw += (event.clientX - lastX) * 0.01;
      scene.pitch = Math.max(-1.2, Math.min(1.2, scene.pitch + (event.clientY - lastY) * 0.01));
      lastX = event.clientX;
      lastY = event.clientY;
      drawScene("fast");
    });
    const release = (event) => {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = "grab";
      if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      drawScene();
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
  }

  function renderAttribution(features) {
    const rows = attribution(features).slice(0, 6);
    const host = $("[data-pg-attrib]");
    host.innerHTML = "";
    for (const row of rows) {
      const el = document.createElement("div");
      el.className = "pg-attrib-row";
      el.innerHTML =
        `<span>${row.name}<br><small style="opacity:.5">${row.hint}</small></span>` +
        `<div class="pg-attrib-bar"><i style="width:0"></i></div>` +
        `<b>${(row.share * 100).toFixed(1)}%</b>`;
      host.appendChild(el);
      requestAnimationFrame(() => {
        el.querySelector("i").style.width = (row.share * 100).toFixed(1) + "%";
      });
    }
  }

  /* -------------------------------------------------------------- pipeline */

  const steps = $$("[data-pg-step]");
  function setStep(index, state, detail) {
    const el = steps[index];
    if (!el) return;
    el.classList.toggle("is-active", state === "active");
    el.classList.toggle("is-done", state === "done");
    if (detail !== undefined) el.querySelector("em").textContent = detail;
  }
  function resetSteps() {
    steps.forEach((el) => {
      el.classList.remove("is-active", "is-done");
      el.querySelector("em").textContent = "—";
    });
  }

  const beat = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms));
  const fmt = (ms) => (ms < 1 ? "<1 ms" : Math.round(ms) + " ms");

  function describe(probability) {
    const decision = engine.decide(model, probability);
    if (decision === "hold") {
      return {
        decision,
        label: "Flagged — hold for review",
        copy: "The score is at or above the upper policy line. In a deployment this is where a job is held and routed to a human reviewer.",
      };
    }
    if (decision === "review") {
      return {
        decision,
        label: "Uncertain — send to review",
        copy: "The score falls between the two policy lines. PrintGuard does not decide these on its own; they queue for a person.",
      };
    }
    return {
      decision,
      label: "Not flagged",
      copy: "The score is below the lower policy line, so the job continues without interruption.",
    };
  }

  let runToken = 0;

  async function run(source) {
    const token = ++runToken;
    const stage = $("[data-pg-stage]");
    const errorBox = $("[data-pg-error]");
    stage.hidden = false;
    errorBox.hidden = true;
    resetSteps();
    dialog.classList.add("pg-scanning");
    $("[data-pg-result]").hidden = true;

    try {
      let features;
      let mesh = null;
      let signature = null;
      let parseMs = 0;
      let featureMs = 0;

      $("[data-pg-filename]").textContent = source.name;
      $("[data-pg-filemeta]").textContent = source.meta || "";

      if (source.kind === "fixture") {
        features = Float64Array.from(source.features);
        setStep(0, "done", "pre-extracted");
        setStep(1, "done", "pre-extracted");
        await beat(180);
      } else {
        setStep(0, "active", "reading…");
        await beat(120);
        const started = performance.now();
        mesh = await engine.parseMesh(source.name, source.buffer);
        parseMs = performance.now() - started;
        if (token !== runToken) return;
        setStep(0, "done", `${mesh.faceCount.toLocaleString()} faces · ${fmt(parseMs)}`);

        setStep(1, "active", "sampling…");
        await beat(140);
        const featureStart = performance.now();
        const built = engine.featureVector(mesh, 0);
        featureMs = performance.now() - featureStart;
        features = built.features;
        signature = built.signature;
        if (token !== runToken) return;
        setStep(1, "done", `869 features · ${fmt(featureMs)}`);
        $("[data-pg-filemeta]").textContent =
          `${mesh.sourceFormat.toUpperCase()} · ${mesh.vertexCount.toLocaleString()} vertices · ${mesh.faceCount.toLocaleString()} faces`;
      }

      setStep(2, "active", "scoring…");
      await beat(150);
      const inferStart = performance.now();
      const probability = engine.score(model, features);
      const inferMs = performance.now() - inferStart;
      if (token !== runToken) return;
      setStep(2, "done", `198 trees · ${fmt(inferMs)}`);

      setStep(3, "active", "applying policy…");
      await beat(130);
      const verdict = describe(probability);
      setStep(3, "done", verdict.decision.toUpperCase());

      // ---- results
      const percent = probability * 100;
      $("[data-pg-result]").hidden = false;
      $("[data-pg-result]").dataset.state = verdict.decision;
      $("[data-pg-score]").textContent = percent.toFixed(percent < 10 ? 2 : 1);
      $("[data-pg-decision-label]").textContent = verdict.label;
      $("[data-pg-decision-copy]").textContent = verdict.copy;
      $("[data-pg-marker]").style.left = Math.min(99.6, Math.max(0.4, percent)) + "%";
      $("[data-pg-live]").textContent = `${verdict.label}. Score ${percent.toFixed(1)} percent.`;

      const total = parseMs + featureMs + inferMs;
      $("[data-pg-total]").textContent =
        source.kind === "fixture" ? `${fmt(inferMs)} inference` : `${fmt(total)} end to end`;

      // ---- visuals
      scene.data = buildSceneData({ mesh, signature, features, pointsQ: source.pointsQ });
      scene.yaw = 0.38;
      scene.pitch = -0.22;
      scene.lastFeatures = features;
      const meshModes = $$("[data-pg-mode]");
      meshModes.forEach((button) => {
        const mode = button.dataset.pgMode;
        const available =
          mode === "voxels" || (mode === "mesh" && scene.data.triangles) || (mode === "points" && scene.data.points);
        button.disabled = !available;
        button.style.display = available ? "" : "none";
      });
      setMode(scene.data.triangles ? "mesh" : scene.data.points ? "points" : "voxels");
      renderAttribution(features);
      $("[data-pg-voxel-fill]").textContent =
        `${(features[867] * 100).toFixed(1)}% of 512 voxels occupied`;
    } catch (error) {
      if (token !== runToken) return;
      resetSteps();
      $("[data-pg-result]").hidden = true;
      errorBox.hidden = false;
      errorBox.textContent = error && error.message ? error.message : "Could not read that file.";
    } finally {
      if (token === runToken) dialog.classList.remove("pg-scanning");
    }
  }

  function setMode(mode) {
    scene.mode = mode;
    $$("[data-pg-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.pgMode === mode));
    });
    drawScene();
  }

  /* ----------------------------------------------------------------- input */

  async function handleFile(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      const errorBox = $("[data-pg-error]");
      $("[data-pg-stage]").hidden = false;
      $("[data-pg-result]").hidden = true;
      errorBox.hidden = false;
      errorBox.textContent = `That file is ${(file.size / 1048576).toFixed(0)} MB. This browser demo accepts files up to 64 MB.`;
      return;
    }
    $$("[data-pg-sample]").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
    const buffer = await file.arrayBuffer();
    run({ kind: "file", name: file.name, buffer, meta: `${(file.size / 1024).toFixed(0)} KB` });
  }

  const input = $("[data-pg-file]");
  const drop = $("[data-pg-drop]");

  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); input.click(); }
  });
  input.addEventListener("change", () => handleFile(input.files[0]));
  ["dragenter", "dragover"].forEach((type) =>
    drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add("is-over"); })
  );
  ["dragleave", "drop"].forEach((type) =>
    drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.remove("is-over"); })
  );
  drop.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files[0];
    handleFile(file);
  });

  /* --------------------------------------------------------------- samples */

  function buildSamples() {
    const row = $("[data-pg-samples]");
    const items = [];
    (catalogue.bundled || []).forEach((item) =>
      items.push({ ...item, kind: "bundled", truth: "benign" })
    );
    (catalogue.fixtures || []).forEach((item) =>
      items.push({ ...item, kind: "fixture", truth: "regulated" })
    );

    for (const item of items) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "pg-chip";
      chip.dataset.pgSample = item.id;
      chip.dataset.truth = item.truth;
      chip.setAttribute("aria-pressed", "false");
      chip.innerHTML = `<i></i>${item.title}<small>${item.kind === "fixture" ? "features only" : "mesh"}</small>`;
      chip.addEventListener("click", async () => {
        $$("[data-pg-sample]").forEach((other) => other.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
        if (item.kind === "fixture") {
          run({
            kind: "fixture",
            name: item.title,
            features: item.features,
            pointsQ: item.pointsQ,
            meta: `${item.source} · ${item.format.toUpperCase()} · ${item.vertices.toLocaleString()} vertices · ${item.faces.toLocaleString()} faces`,
          });
        } else {
          const response = await fetch(item.file);
          const buffer = await response.arrayBuffer();
          run({ kind: "file", name: item.name, buffer, meta: `${(buffer.byteLength / 1024).toFixed(0)} KB` });
        }
      });
      row.appendChild(chip);
    }
  }

  /* ------------------------------------------------------------------ gate */

  function unlock() {
    $("[data-pg-gate]").hidden = true;
    $("[data-pg-app]").hidden = false;
    if (!scene.canvas) {
      scene.canvas = $("[data-pg-scene]");
      bindOrbit(scene.canvas);
    }
  }

  const gateForm = $("[data-pg-gate-form]");
  gateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = $("[data-pg-pass]").value.trim().toLowerCase();
    if (value === PASSPHRASE) {
      try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
      $("[data-pg-gate-error]").textContent = "";
      unlock();
    } else {
      $("[data-pg-gate-error]").textContent = "That phrase is not recognised.";
      $("[data-pg-pass]").select();
    }
  });

  function isUnlocked() {
    try { return sessionStorage.getItem(STORAGE_KEY) === "1"; } catch (_) { return false; }
  }

  /* ---------------------------------------------------------------- routing */

  let returnHash = "";
  let returnScroll = 0;

  function openDemo() {
    if (dialog.open) return;
    document.documentElement.classList.add("demo-route-pending");
    document.body.classList.add("pg-open");
    dialog.showModal();
    if (isUnlocked()) unlock();
    else setTimeout(() => $("[data-pg-pass]").focus(), 60);
  }

  function closeDemo() {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove("pg-open");
    document.documentElement.classList.remove("demo-route-pending");
  }

  function syncRoute() {
    if (window.location.hash === HASH) openDemo();
    else closeDemo();
  }

  $("[data-pg-exit]").addEventListener("click", () => {
    if (returnHash) window.location.hash = returnHash;
    else {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      closeDemo();
      window.scrollTo(0, returnScroll);
    }
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    $("[data-pg-exit]").click();
  });

  window.addEventListener("hashchange", (event) => {
    const oldHash = new URL(event.oldURL).hash;
    if (window.location.hash === HASH && oldHash !== HASH) {
      returnHash = oldHash;
      returnScroll = window.scrollY;
    }
    syncRoute();
  });

  window.addEventListener("resize", () => {
    if (!dialog.open || $("[data-pg-app]").hidden) return;
    drawScene();
  });

  $$("[data-pg-mode]").forEach((button) =>
    button.addEventListener("click", () => setMode(button.dataset.pgMode))
  );

  /* ------------------------------------------------------------------ boot */

  buildSamples();

  // Model facts, taken from the exported bundle rather than hard-coded copy.
  const setAll = (selector, text) => $$(selector).forEach((el) => { el.textContent = text; });
  setAll("[data-pg-treecount]", model.trees.length.toLocaleString());
  setAll("[data-pg-featcount]", model.featureCount.toLocaleString());
  setAll("[data-pg-fingerprint]", model.modelSha256.slice(0, 12));
  setAll("[data-pg-rows]", (model.trainingReport && model.trainingReport.rows
    ? model.trainingReport.rows
    : 0).toLocaleString());

  syncRoute();
})();
