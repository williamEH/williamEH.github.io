/*
 * PrintGuard browser inference engine.
 *
 * A JavaScript port of the `legacy_geometry` feature profile from
 * printguard/parsers.py, printguard/features.py and printguard/geometry.py,
 * plus a reader for the exported HistGradientBoosting bundle.
 *
 * The Python pipeline samples the mesh surface with numpy's PCG64. Replicating
 * that bit stream in the browser is not practical, so this engine uses its own
 * deterministic PRNG. Measured on the held-out test set, re-seeding the sampler
 * moves the score by a median of 0.0004 (mean 0.011) and leaves AUC unchanged,
 * so the substitution is well inside the sampler's own variance. Scores are
 * reproducible run to run because the seed is fixed.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PrintGuardEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const POINT_SAMPLE_COUNT = 2048;
  const VOXEL_GRID = 8;
  const VIEW_GRID = 10;
  const RADIAL_BINS = 16;
  const PAIRWISE_BINS = 16;
  const MAX_SURFACE_SAMPLE_FACES = 200000;
  const MAX_MESH_STAT_FACES = 200000;
  const SQRT3 = Math.sqrt(3);

  class MeshParseError extends Error {}

  /* ---------------------------------------------------------------- random */

  // sfc32: small, fast, well-distributed, and deterministic across engines.
  function makeRng(seed) {
    let a = 0x9e3779b9, b = seed >>> 0, c = 0x243f6a88, d = 0x0b7285a1;
    for (let i = 0; i < 12; i += 1) {
      const t = (a + b) | 0;
      a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0; c = (c + t) | 0; d = (d + t) | 0;
    }
    return function next() {
      const t = (a + b + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  /* --------------------------------------------------------------- parsing */

  function extensionOf(filename) {
    const match = /\.([a-z0-9]+)$/i.exec(filename || "");
    return match ? match[1].toLowerCase() : "";
  }

  function finishMesh(vertices, faces, metadata, sourceFormat, objectCount) {
    if (!vertices.length || !faces.length) {
      throw new MeshParseError("Mesh has no parseable vertices or faces");
    }
    const vertexCount = vertices.length / 3;
    for (let i = 0; i < faces.length; i += 1) {
      if (faces[i] < 0 || faces[i] >= vertexCount) {
        throw new MeshParseError("Mesh contains face indices outside the vertex array");
      }
    }
    return {
      vertices: vertices instanceof Float64Array ? vertices : Float64Array.from(vertices),
      faces: faces instanceof Int32Array ? faces : Int32Array.from(faces),
      vertexCount,
      faceCount: faces.length / 3,
      metadata: metadata || {},
      sourceFormat,
      objectCount: Math.max(objectCount || 1, 1),
    };
  }

  function looksLikeBinaryStl(buffer) {
    if (buffer.byteLength < 84) return false;
    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    return buffer.byteLength === 84 + triangleCount * 50;
  }

  function parseBinaryStl(buffer) {
    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    const vertices = new Float64Array(triangleCount * 9);
    const faces = new Int32Array(triangleCount * 3);
    let offset = 84;
    let v = 0;
    for (let t = 0; t < triangleCount; t += 1) {
      offset += 12; // facet normal
      for (let corner = 0; corner < 3; corner += 1) {
        faces[t * 3 + corner] = v / 3;
        vertices[v] = view.getFloat32(offset, true);
        vertices[v + 1] = view.getFloat32(offset + 4, true);
        vertices[v + 2] = view.getFloat32(offset + 8, true);
        v += 3;
        offset += 12;
      }
      offset += 2; // attribute byte count
    }
    return { vertices, faces };
  }

  function parseAsciiStl(text) {
    const vertices = [];
    const faces = [];
    let pending = 0;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length === 4 && parts[0].toLowerCase() === "vertex") {
        const x = Number(parts[1]), y = Number(parts[2]), z = Number(parts[3]);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          throw new MeshParseError("Invalid STL vertex line: " + lines[i]);
        }
        vertices.push(x, y, z);
        pending += 1;
        if (pending === 3) {
          const base = vertices.length / 3;
          faces.push(base - 3, base - 2, base - 1);
          pending = 0;
        }
      }
    }
    return { vertices, faces };
  }

  function objIndex(token, vertexCount) {
    const head = token.split("/", 1)[0];
    const value = parseInt(head, 10);
    if (Number.isNaN(value)) return NaN;
    return value < 0 ? vertexCount + value : value - 1;
  }

  function triangulateInto(faces, indices) {
    for (let i = 1; i < indices.length - 1; i += 1) {
      faces.push(indices[0], indices[i], indices[i + 1]);
    }
  }

  function parseObj(text, filename) {
    const vertices = [];
    const faces = [];
    const materials = [];
    let objectCount = 0;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line || line.charCodeAt(0) === 35 /* # */) continue;
      const parts = line.split(/\s+/);
      if (parts[0] === "o") {
        objectCount += 1;
      } else if (parts[0] === "usemtl" && parts.length > 1) {
        materials.push(parts.slice(1).join(" "));
      } else if (parts[0] === "v" && parts.length >= 4) {
        vertices.push(Number(parts[1]), Number(parts[2]), Number(parts[3]));
      } else if (parts[0] === "f" && parts.length >= 4) {
        const vertexCount = vertices.length / 3;
        const indices = [];
        for (let p = 1; p < parts.length; p += 1) indices.push(objIndex(parts[p], vertexCount));
        if (indices.some(Number.isNaN)) continue;
        triangulateInto(faces, indices);
      }
    }
    const metadata = { filename };
    if (materials.length) metadata.materials = materials.join(" ");
    return finishMesh(vertices, faces, metadata, "obj", Math.max(objectCount, 1));
  }

  function parseOff(text, filename) {
    const lines = [];
    const rawLines = text.split(/\r?\n/);
    for (let i = 0; i < rawLines.length; i += 1) {
      const trimmed = rawLines[i].trim();
      if (trimmed && !rawLines[i].replace(/^\s+/, "").startsWith("#")) lines.push(trimmed);
    }
    if (!lines.length) throw new MeshParseError("Empty OFF file");
    if (lines[0] !== "OFF") throw new MeshParseError("OFF file is missing OFF header");
    if (lines.length < 2) throw new MeshParseError("OFF file is missing counts line");

    const counts = lines[1].split(/\s+/);
    if (counts.length < 2) throw new MeshParseError("OFF counts line must include vertex and face counts");
    const vertexCount = parseInt(counts[0], 10);
    const faceCount = parseInt(counts[1], 10);

    const vertices = [];
    const faces = [];
    let cursor = 2;
    for (let i = cursor; i < Math.min(cursor + vertexCount, lines.length); i += 1) {
      const parts = lines[i].split(/\s+/);
      if (parts.length < 3) throw new MeshParseError("Invalid OFF vertex line: " + lines[i]);
      vertices.push(Number(parts[0]), Number(parts[1]), Number(parts[2]));
    }
    cursor += vertexCount;
    for (let i = cursor; i < Math.min(cursor + faceCount, lines.length); i += 1) {
      const parts = lines[i].split(/\s+/);
      if (parts.length < 4) continue;
      const n = parseInt(parts[0], 10);
      const indices = [];
      for (let k = 1; k <= n && k < parts.length; k += 1) indices.push(parseInt(parts[k], 10));
      triangulateInto(faces, indices);
    }
    return finishMesh(vertices, faces, { filename }, "off");
  }

  function parseXmlMesh(text, filename, format) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) throw new MeshParseError("Malformed " + format.toUpperCase() + " XML");
    const local = (node, name) =>
      Array.prototype.filter.call(node.children, (child) => child.localName === name);

    const vertices = [];
    const faces = [];
    let objectCount = 0;

    // AMF: <mesh><vertices><vertex><coordinates><x/><y/><z/>, <volume><triangle><v1/>
    // 3MF: <mesh><vertices><vertex x= y= z=/>, <triangles><triangle v1= v2= v3=/>
    const meshes = doc.getElementsByTagName("*");
    for (let i = 0; i < meshes.length; i += 1) {
      const node = meshes[i];
      if (node.localName !== "mesh") continue;
      objectCount += 1;
      const base = vertices.length / 3;
      const vertexBlocks = local(node, "vertices");
      for (let b = 0; b < vertexBlocks.length; b += 1) {
        const vertexNodes = local(vertexBlocks[b], "vertex");
        for (let v = 0; v < vertexNodes.length; v += 1) {
          const vertex = vertexNodes[v];
          const coords = local(vertex, "coordinates")[0];
          if (coords) {
            const read = (axis) => {
              const found = local(coords, axis)[0];
              return found ? Number(found.textContent) : 0;
            };
            vertices.push(read("x"), read("y"), read("z"));
          } else {
            vertices.push(
              Number(vertex.getAttribute("x")),
              Number(vertex.getAttribute("y")),
              Number(vertex.getAttribute("z"))
            );
          }
        }
      }
      const triangleNodes = [];
      const volumes = local(node, "volume");
      for (let v = 0; v < volumes.length; v += 1) {
        Array.prototype.push.apply(triangleNodes, local(volumes[v], "triangle"));
      }
      const triangleBlocks = local(node, "triangles");
      for (let t = 0; t < triangleBlocks.length; t += 1) {
        Array.prototype.push.apply(triangleNodes, local(triangleBlocks[t], "triangle"));
      }
      for (let t = 0; t < triangleNodes.length; t += 1) {
        const triangle = triangleNodes[t];
        const read = (name) => {
          const attr = triangle.getAttribute(name);
          if (attr !== null) return parseInt(attr, 10);
          const child = local(triangle, name)[0];
          return child ? parseInt(child.textContent, 10) : NaN;
        };
        const a = read("v1"), b = read("v2"), c = read("v3");
        if ([a, b, c].some(Number.isNaN)) continue;
        faces.push(base + a, base + b, base + c);
      }
    }
    return finishMesh(vertices, faces, { filename }, format, Math.max(objectCount, 1));
  }

  // 3MF is a zip container. Modern browsers can inflate with DecompressionStream,
  // which avoids shipping a zip library for the one packaged format.
  async function extractFrom3mf(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    // Walk local file headers looking for the 3D model part.
    for (let i = 0; i + 30 <= bytes.length; i += 1) {
      if (view.getUint32(i, true) !== 0x04034b50) continue;
      const method = view.getUint16(i + 8, true);
      const compressedSize = view.getUint32(i + 18, true);
      const nameLength = view.getUint16(i + 26, true);
      const extraLength = view.getUint16(i + 28, true);
      const nameStart = i + 30;
      const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength));
      if (!/\.model$/i.test(name)) continue;
      const dataStart = nameStart + nameLength + extraLength;
      const slice = bytes.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return new TextDecoder().decode(slice);
      if (method !== 8) continue;
      if (typeof DecompressionStream === "undefined") {
        throw new MeshParseError("This browser cannot read compressed 3MF files");
      }
      const stream = new Blob([slice]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    }
    throw new MeshParseError("No 3D model part found inside the 3MF container");
  }

  async function parseMesh(filename, buffer) {
    const extension = extensionOf(filename);
    if (extension === "stp" || extension === "step") {
      throw new MeshParseError(
        "STEP/STP files need CAD-kernel conversion to STL or OBJ before geometry extraction"
      );
    }
    if (extension === "stl") {
      if (looksLikeBinaryStl(buffer)) {
        const parsed = parseBinaryStl(buffer);
        return finishMesh(parsed.vertices, parsed.faces, { filename }, "stl");
      }
      const parsed = parseAsciiStl(new TextDecoder().decode(buffer));
      return finishMesh(parsed.vertices, parsed.faces, { filename }, "stl");
    }
    if (extension === "obj") return parseObj(new TextDecoder().decode(buffer), filename);
    if (extension === "off") return parseOff(new TextDecoder().decode(buffer), filename);
    if (extension === "amf") return parseXmlMesh(new TextDecoder().decode(buffer), filename, "amf");
    if (extension === "3mf") return parseXmlMesh(await extractFrom3mf(buffer), filename, "3mf");
    throw new MeshParseError("Unsupported file extension: ." + (extension || "?"));
  }

  /* -------------------------------------------------------------- features */

  function limitedFaceIndices(faceCount, maxFaces, seed) {
    if (faceCount <= maxFaces) return null; // identity
    // Deterministic ordered subsample, mirroring np.sort(rng.choice(..., replace=False)).
    const rng = makeRng(seed);
    const picked = new Set();
    while (picked.size < maxFaces) picked.add(Math.floor(rng() * faceCount));
    return Int32Array.from(picked).sort();
  }

  function meanOf(values) {
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) sum += values[i];
    return values.length ? sum / values.length : 0;
  }

  function stdOf(values, mean) {
    if (!values.length) return 0;
    let acc = 0;
    for (let i = 0; i < values.length; i += 1) {
      const d = values[i] - mean;
      acc += d * d;
    }
    return Math.sqrt(acc / values.length); // population std, matching numpy default
  }

  function histogram(values, bins, low, high) {
    const counts = new Float64Array(bins);
    const width = (high - low) / bins;
    let total = 0;
    for (let i = 0; i < values.length; i += 1) {
      const value = values[i];
      if (!(value >= low) || value > high) continue;
      let index = Math.floor((value - low) / width);
      if (index >= bins) index = bins - 1; // np.histogram puts the top edge in the last bin
      if (index < 0) index = 0;
      counts[index] += 1;
      total += 1;
    }
    if (total === 0) return counts;
    for (let i = 0; i < bins; i += 1) counts[i] /= total;
    return counts;
  }

  function triangleAreaAt(vertices, faces, face) {
    const ia = faces[face * 3] * 3, ib = faces[face * 3 + 1] * 3, ic = faces[face * 3 + 2] * 3;
    const ax = vertices[ia], ay = vertices[ia + 1], az = vertices[ia + 2];
    const e1x = vertices[ib] - ax, e1y = vertices[ib + 1] - ay, e1z = vertices[ib + 2] - az;
    const e2x = vertices[ic] - ax, e2y = vertices[ic + 1] - ay, e2z = vertices[ic + 2] - az;
    const cx = e1y * e2z - e1z * e2y;
    const cy = e1z * e2x - e1x * e2z;
    const cz = e1x * e2y - e1y * e2x;
    return Math.sqrt(cx * cx + cy * cy + cz * cz) * 0.5;
  }

  function sampleSurfacePoints(mesh, count, seed) {
    const { vertices, faces, faceCount } = mesh;
    const subset = limitedFaceIndices(faceCount, MAX_SURFACE_SAMPLE_FACES, seed + 104729);
    const usable = subset ? subset.length : faceCount;
    const cumulative = new Float64Array(usable);
    let total = 0;
    for (let i = 0; i < usable; i += 1) {
      total += triangleAreaAt(vertices, faces, subset ? subset[i] : i);
      cumulative[i] = total;
    }

    const points = new Float64Array(count * 3);
    const rng = makeRng(seed);
    if (total <= 0) {
      const vertexCount = mesh.vertexCount;
      for (let i = 0; i < count; i += 1) {
        const v = Math.floor(rng() * vertexCount) * 3;
        points[i * 3] = vertices[v];
        points[i * 3 + 1] = vertices[v + 1];
        points[i * 3 + 2] = vertices[v + 2];
      }
      return points;
    }

    for (let i = 0; i < count; i += 1) {
      // Area-weighted face pick via binary search on the cumulative distribution.
      const target = rng() * total;
      let lo = 0, hi = usable - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumulative[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      const face = subset ? subset[lo] : lo;
      const ia = faces[face * 3] * 3, ib = faces[face * 3 + 1] * 3, ic = faces[face * 3 + 2] * 3;
      let u = rng(), v = rng();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      for (let axis = 0; axis < 3; axis += 1) {
        const a = vertices[ia + axis];
        points[i * 3 + axis] = a + u * (vertices[ib + axis] - a) + v * (vertices[ic + axis] - a);
      }
    }
    return points;
  }

  function normalizePoints(points) {
    const count = points.length / 3;
    if (!count) return points;
    const mins = [Infinity, Infinity, Infinity];
    const maxs = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < count; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = points[i * 3 + axis];
        if (value < mins[axis]) mins[axis] = value;
        if (value > maxs[axis]) maxs[axis] = value;
      }
    }
    const scale = Math.max(Math.max(maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2]), 1e-9);
    const out = new Float64Array(points.length);
    for (let i = 0; i < count; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const center = (mins[axis] + maxs[axis]) / 2;
        let value = (points[i * 3 + axis] - center) / scale;
        if (value < -0.5) value = -0.5;
        else if (value > 0.5) value = 0.5;
        out[i * 3 + axis] = value;
      }
    }
    return out;
  }

  function gridIndices(points, grid) {
    const count = points.length / 3;
    const out = new Int32Array(count * 3);
    for (let i = 0; i < count * 3; i += 1) {
      let index = Math.floor((points[i] + 0.5) * grid);
      if (index < 0) index = 0;
      else if (index > grid - 1) index = grid - 1;
      out[i] = index;
    }
    return out;
  }

  function shapeSignature(mesh, seed) {
    const points = normalizePoints(sampleSurfacePoints(mesh, POINT_SAMPLE_COUNT, seed));
    const count = points.length / 3;

    const radii = new Float64Array(count);
    for (let i = 0; i < count; i += 1) {
      const x = points[i * 3], y = points[i * 3 + 1], z = points[i * 3 + 2];
      radii[i] = Math.sqrt(x * x + y * y + z * z);
    }
    const radial = histogram(radii, RADIAL_BINS, 0, SQRT3 / 2);

    let pairwise = new Float64Array(PAIRWISE_BINS);
    if (count >= 2) {
      const rng = makeRng(seed + 7919);
      const pairCount = Math.min(4096, count * 2);
      const distances = new Float64Array(pairCount);
      for (let i = 0; i < pairCount; i += 1) {
        const a = Math.floor(rng() * count) * 3;
        const b = Math.floor(rng() * count) * 3;
        const dx = points[a] - points[b];
        const dy = points[a + 1] - points[b + 1];
        const dz = points[a + 2] - points[b + 2];
        distances[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      pairwise = histogram(distances, PAIRWISE_BINS, 0, SQRT3);
    }

    const voxelIndices = gridIndices(points, VOXEL_GRID);
    const voxel = new Float64Array(VOXEL_GRID ** 3);
    for (let i = 0; i < count; i += 1) {
      voxel[
        voxelIndices[i * 3] * VOXEL_GRID * VOXEL_GRID +
          voxelIndices[i * 3 + 1] * VOXEL_GRID +
          voxelIndices[i * 3 + 2]
      ] = 1;
    }

    const viewIndices = gridIndices(points, VIEW_GRID);
    const views = new Float64Array(3 * VIEW_GRID * VIEW_GRID);
    const planes = [[0, 1], [0, 2], [1, 2]];
    for (let p = 0; p < planes.length; p += 1) {
      const offset = p * VIEW_GRID * VIEW_GRID;
      for (let i = 0; i < count; i += 1) {
        views[offset + viewIndices[i * 3 + planes[p][0]] * VIEW_GRID + viewIndices[i * 3 + planes[p][1]]] = 1;
      }
    }

    return { radial, pairwise, voxel, views, points };
  }

  function basicFeatures(mesh) {
    const { vertices, faces, vertexCount, faceCount } = mesh;
    const subset = limitedFaceIndices(faceCount, MAX_MESH_STAT_FACES, 0);
    const statCount = subset ? subset.length : faceCount;

    const mins = [Infinity, Infinity, Infinity];
    const maxs = [-Infinity, -Infinity, -Infinity];
    const sums = [0, 0, 0];
    for (let i = 0; i < vertexCount; i += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = vertices[i * 3 + axis];
        if (value < mins[axis]) mins[axis] = value;
        if (value > maxs[axis]) maxs[axis] = value;
        sums[axis] += value;
      }
    }
    const rawDims = [maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2]];
    const bboxScale = Math.max(Math.max(rawDims[0], rawDims[1], rawDims[2]), 1e-9);
    const bboxDims = rawDims.map((d) => Math.max(d / bboxScale, 1e-6));
    const bboxSorted = bboxDims.slice().sort((a, b) => b - a);
    const bboxVolume = bboxDims[0] * bboxDims[1] * bboxDims[2];
    const centroid = [0, 1, 2].map(
      (axis) => (sums[axis] / vertexCount - mins[axis]) / (rawDims[axis] + bboxScale * 1e-6) - 0.5
    );

    const edgeLengths = new Float64Array(statCount * 3);
    let areaSum = 0;
    for (let i = 0; i < statCount; i += 1) {
      const face = subset ? subset[i] : i;
      const ia = faces[face * 3] * 3, ib = faces[face * 3 + 1] * 3, ic = faces[face * 3 + 2] * 3;
      const dist = (p, q) => {
        const dx = vertices[p] - vertices[q];
        const dy = vertices[p + 1] - vertices[q + 1];
        const dz = vertices[p + 2] - vertices[q + 2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };
      edgeLengths[i] = dist(ia, ib) / bboxScale;
      edgeLengths[statCount + i] = dist(ib, ic) / bboxScale;
      edgeLengths[statCount * 2 + i] = dist(ic, ia) / bboxScale;
      areaSum += triangleAreaAt(vertices, faces, face);
    }
    const rawSurfaceArea = subset ? (areaSum / statCount) * faceCount : areaSum;
    const surfaceArea = rawSurfaceArea / (bboxScale * bboxScale);

    const edgeMean = meanOf(edgeLengths);
    const edgeStd = stdOf(edgeLengths, edgeMean);
    let edgeMax = 0;
    for (let i = 0; i < edgeLengths.length; i += 1) if (edgeLengths[i] > edgeMax) edgeMax = edgeLengths[i];

    const format = mesh.sourceFormat.toLowerCase();
    return [
      Math.log1p(vertexCount),
      Math.log1p(faceCount),
      Math.log1p(mesh.objectCount),
      bboxDims[0], bboxDims[1], bboxDims[2],
      Math.log1p(bboxVolume),
      Math.log1p(bboxSorted[0] / Math.max(bboxSorted[2], 1e-9)),
      Math.log1p(bboxSorted[1] / Math.max(bboxSorted[2], 1e-9)),
      Math.log1p(surfaceArea),
      Math.log1p(surfaceArea / Math.max(bboxVolume, 1e-6)),
      edgeMean,
      edgeStd,
      edgeMax,
      edgeStd / Math.max(edgeMean, 1e-9),
      centroid[0], centroid[1], centroid[2],
      format === "stl" ? 1 : 0,
      format === "obj" ? 1 : 0,
      format === "amf" ? 1 : 0,
      format === "3mf" ? 1 : 0,
      format === "off" ? 1 : 0,
    ];
  }

  /**
   * Build the 869-value `legacy_geometry` feature vector.
   * Order matches printguard.features.FEATURE_NAMES with the text/hash
   * features removed, which is the order the exported model expects.
   */
  function featureVector(mesh, seed) {
    const signature = shapeSignature(mesh, seed === undefined ? 0 : seed);
    const values = basicFeatures(mesh);
    const out = new Float64Array(869);
    let cursor = 0;
    for (let i = 0; i < values.length; i += 1) out[cursor++] = values[i];
    for (let i = 0; i < signature.radial.length; i += 1) out[cursor++] = signature.radial[i];
    for (let i = 0; i < signature.pairwise.length; i += 1) out[cursor++] = signature.pairwise[i];
    for (let i = 0; i < signature.voxel.length; i += 1) out[cursor++] = signature.voxel[i];
    for (let i = 0; i < signature.views.length; i += 1) out[cursor++] = signature.views[i];
    out[cursor++] = meanOf(signature.voxel);
    out[cursor++] = meanOf(signature.views);
    if (cursor !== 869) throw new Error("Feature vector length mismatch: " + cursor);
    return { features: out, signature };
  }

  /* ------------------------------------------------------------- inference */

  function rawScore(bundle, features) {
    let total = bundle.baseline;
    const trees = bundle.trees;
    for (let t = 0; t < trees.length; t += 1) {
      const nodes = trees[t];
      let node = nodes[0];
      while (node[0] === 0) {
        const value = features[node[1]];
        const goLeft = Number.isNaN(value) ? node[3] === 1 : value <= node[2];
        node = nodes[goLeft ? node[4] : node[5]];
      }
      total += node[1];
    }
    return total;
  }

  function score(bundle, features) {
    return 1 / (1 + Math.exp(-rawScore(bundle, features)));
  }

  function decide(bundle, probability) {
    const policy = bundle.policy || { allowBelow: 0.25, holdAtOrAbove: 0.75 };
    if (probability >= policy.holdAtOrAbove) return "hold";
    if (probability < policy.allowBelow) return "allow";
    return "review";
  }

  return {
    MeshParseError,
    parseMesh,
    featureVector,
    shapeSignature,
    basicFeatures,
    score,
    rawScore,
    decide,
    constants: { POINT_SAMPLE_COUNT, VOXEL_GRID, VIEW_GRID, RADIAL_BINS, PAIRWISE_BINS },
  };
});
