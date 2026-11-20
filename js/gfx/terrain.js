// A whole open world generated from a seed, like a Minecraft world: rolling hills, valleys, lakes,
// forests and clearings, ringed by ocean. The same seed always makes the same world.
// The base biome sets the terrain style (flat bayou with lots of water, tall pine mountains, mesa desert);
// the AI's "look" repaints it. You spawn in a flat clearing where the residents live.

import { lookOf, prop } from "./biomes.js";
import { felt } from "./planet.js";

const THREE = window.THREE;

// How each base biome shapes the land
const SHAPE = {
  bayou: { hills: 4, water: 1.4, rough: 0.5 }, desert: { hills: 12, water: -3, rough: 1.2, terrace: 3 }, suburb: { hills: 6, water: 0.2, rough: 0.4 },
  spooky: { hills: 10, water: 0.3, rough: 0.9 }, harbor: { hills: 9, water: 0.8, rough: 0.7, coast: true }, sunset: { hills: 6, water: 0.4, rough: 0.5, coast: true },
  pines: { hills: 22, water: 0.3, rough: 1, snow: 15 }, jungle: { hills: 13, water: 0.6, rough: 1.1 }
};

/** Seeded 2D value noise with smooth interpolation, summed over octaves. */
function makeNoise(rng) {
  const P = new Uint8Array(512), V = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; V[i] = rng() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const sm = t => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const a = V[P[X + P[Y]]], b = V[P[X + 1 + P[Y]]], c = V[P[X + P[Y + 1]]], d = V[P[X + 1 + P[Y + 1]]];
    const u = sm(xf), v = sm(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, y, oct = 4) => { let s = 0, amp = 1, f = 1, norm = 0; for (let o = 0; o < oct; o++) { s += n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; } return s / norm; };
}

export function makeWorld(key, rng, { size = 360, segments = 120, look = null, density = 1, propScale = 1.4, spawnClear = 26 } = {}) {
  const biome = lookOf(key, look), shape = SHAPE[key] || SHAPE.suburb;
  const noise = makeNoise(rng), detail = makeNoise(rng);
  const half = size / 2;
  const ox = rng() * 1000, oz = rng() * 1000;

  /** Ground height anywhere in the world. Below 0 is water. */
  function heightAt(x, z) {
    let h = noise((x + ox) * 0.011, (z + oz) * 0.011, 4) * shape.hills + detail((x + ox) * 0.05, (z + oz) * 0.05, 2) * shape.rough + 2 + shape.water * -1;
    if (shape.terrace) h = Math.round(h / shape.terrace) * shape.terrace * 0.7 + h * 0.3;
    if (shape.coast) h -= Math.max(0, (x - half * 0.35) / (half * 0.6)) * 14; // one side slopes into the sea
    // The spawn clearing is flat and dry
    const d = Math.hypot(x, z), k = Math.min(1, Math.max(0, (d - spawnClear) / 22));
    h = 2.2 * (1 - k) + h * k;
    // The world ends in ocean
    const edge = Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - half * 0.78) / (half * 0.22));
    return h - edge * edge * 18;
  }

  // ----- Ground mesh: flat-shaded felt patchwork, colored by height -----
  const geo = new THREE.PlaneGeometry(size, size, segments, segments).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 40, uv.getY(i) * 40);
  const c1 = new THREE.Color(biome.ground[0]), c2 = new THREE.Color(biome.ground[1]);
  const sand = c1.clone().lerp(new THREE.Color(0xf6e2a8), 0.65), rock = c1.clone().multiplyScalar(0.62).lerp(new THREE.Color(0x8a8098), 0.4), snow = new THREE.Color(0xffffff);
  const colors = new Float32Array(pos.count * 3), col = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    if (y < 0.7) col.copy(sand);
    else if (shape.snow && y > shape.snow) col.copy(snow);
    else if (y > shape.hills * 0.75 + 2) col.copy(rock);
    else col.copy(c1).lerp(c2, noise(x * 0.04 + 50, z * 0.04, 2) > 0 ? 1 : 0);
    col.offsetHSL(0, 0, (rng() - 0.5) * 0.035);
    for (let j = 0; j < 3; j++) colors.set([col.r, col.g, col.b], (i + j) * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const group = new THREE.Group();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, map: felt() }));
  ground.receiveShadow = true; group.add(ground);

  // Water: one sheet at sea level, tinted toward the world's sky
  const waterColor = new THREE.Color(0x3fb8d0).lerp(new THREE.Color(biome.sky[0]), 0.25);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(size * 3, size * 3), new THREE.MeshStandardMaterial({ color: waterColor, transparent: true, opacity: 0.82, roughness: 0.3, flatShading: true }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.05; group.add(water);

  const taken = [];
  const api = {
    group, biome, key, heightAt, size,
    isWater: (x, z) => heightAt(x, z) < 0.25,
    /** Stand an object on the ground at (x, z). */
    place(obj, x, z, heading = 0, lift = 0) {
      obj.position.set(x, heightAt(x, z) + lift, z); obj.rotation.y = heading;
      if (obj.parent !== group) group.add(obj);
      return obj;
    },
    /** A dry, open spot: away from water, cliffs and other things. */
    freeSpot(minR = 0, maxR = half * 0.75, gap = 4, tries = 60) {
      for (let i = 0; i < tries; i++) {
        const a = rng() * Math.PI * 2, r = minR + rng() * (maxR - minR), x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = heightAt(x, z);
        if (h < 0.6 || Math.abs(heightAt(x + 2, z) - h) > 2.2) continue;
        if (taken.some(([tx, tz, tg]) => Math.hypot(tx - x, tz - z) < Math.max(gap, tg))) continue;
        return [x, z];
      }
      return null;
    },
    reserve(x, z, gap = 4) { taken.push([x, z, gap]); },
    update(dt, focus) { if (parts && focus) { parts.position.set(focus.x, 0, focus.z); parts.rotation.y += dt * 0.05; } water.position.y = -0.05 + Math.sin(performance.now() / 900) * 0.04; }
  };

  // ----- Props: clustered like forests and neighborhoods, sparse in the clearing -----
  const cluster = makeNoise(rng);
  for (const [name, count] of biome.props) {
    const n = Math.round(count * density * (name === "flower" ? 1.5 : 1));
    const big = !["flower", "mushroom", "pumpkin", "fence", "lantern", "rock"].includes(name);
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 8) {
      const spot = api.freeSpot(big ? 20 : 8, half * 0.74, big ? 3.5 : 1.2, 4);
      if (!spot) continue;
      const [x, z] = spot;
      if (big && cluster(x * 0.02, z * 0.02, 2) < -0.1 && rng() < 0.75) continue; // leave meadows open
      const p = prop(name, rng);
      p.scale.multiplyScalar(propScale * (0.8 + rng() * 0.5));
      p.traverse(m => { if (m.isMesh) { m.castShadow = big; } });
      api.place(p, x, z, rng() * 6.28, name === "pond" || name === "pool" ? 0.05 : -0.1);
      api.reserve(x, z, big ? 3.5 : 1.2);
      placed++;
    }
  }

  // Floating particles around wherever you are (fireflies, leaves, dust)
  let parts = null;
  if (biome.particles) {
    const N = 260, arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) arr.set([(rng() - 0.5) * 90, 1 + rng() * 14, (rng() - 0.5) * 90], i * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    parts = new THREE.Points(pg, new THREE.PointsMaterial({ color: biome.particles.color, size: 0.3, transparent: true, opacity: 0.85 }));
    group.add(parts);
  }
  return api;
}
