// A whole world generated from a seed, like a Minecraft world, drawn to look like Tiny Glade: smooth rolling
// meadows with soft color gradients, a lake beside the building ground, groves of round trees placed in
// clusters (never sprinkled at random), grass and wildflowers, and a warm low sun with long soft shadows.
// The same seed always makes the same world. The base biome sets the land and plants; the AI's look recolors it.

import { lookOf, prop } from "./biomes.js";
import { CELL } from "./town.js";

const THREE = window.THREE;

// How each base biome shapes the land and what grows on it
const SHAPE = {
  bayou: { hills: 3, rough: 0.3, tree: "willow", lakes: 2, base: -1.1 }, desert: { hills: 5, rough: 0.6, tree: "cactus", lakes: 0, rocks: 2, dunes: 3.2 },
  suburb: { hills: 4, rough: 0.3, tree: "round", lakes: 1 }, spooky: { hills: 7, rough: 0.5, tree: "bare", lakes: 1 },
  harbor: { hills: 6, rough: 0.4, tree: "autumn", lakes: 1, coast: true }, sunset: { hills: 4, rough: 0.3, tree: "palm", lakes: 1, coast: true },
  ember: { hills: 14, rough: 1, tree: "burnt", lakes: 3, lava: true, ridged: true }, snow: { hills: 10, rough: 0.6, tree: "pine", lakes: 1, snowAll: true },
  bloom: { hills: 7, rough: 0.4, tree: "blossom", lakes: 1 }, rain: { hills: 7, rough: 0.4, tree: "round", lakes: 2, base: -0.7 },
  crystal: { hills: 11, rough: 0.7, tree: "crystal", lakes: 1, ridged: true }, candy: { hills: 6, rough: 0.3, tree: "lollipop", lakes: 1 },
  pines: { hills: 30, rough: 0.8, tree: "pine", lakes: 1, snow: 14, ridged: true }, jungle: { hills: 15, rough: 0.9, tree: "jungle", lakes: 1, ridged: true }
};
export const BUILD_RADIUS = 95; // how far from the start you can build

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

const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const mat = (color, rough = 0.9) => new THREE.MeshStandardMaterial({ color, roughness: rough });

// ---------- Plants and rocks: soft, rounded, hand-placed looking ----------

function tree(kind, rng, leaf, leaf2) {
  const g = new THREE.Group();
  const trunk = (h, r = 0.25, c = 0x7a5a42) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 7), mat(c)); m.position.y = h / 2; m.castShadow = true; g.add(m); };
  const blob = (x, y, z, r, c) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat(c, 1)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); };
  const s = 0.8 + rng() * 0.5;
  if (kind === "pine") {
    trunk(1.2 * s, 0.22);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry((1.6 - i * 0.32) * s, 1.7 * s, 9), mat(i % 2 ? leaf : leaf2, 1)); m.position.y = (1.4 + i * 0.95) * s; m.castShadow = true; g.add(m); }
  } else if (kind === "cactus") {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 2.4 * s, 9), mat(leaf)); c.position.y = 1.2 * s; c.castShadow = true; g.add(c);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.35, 9, 6), mat(leaf)); top.position.y = 2.4 * s; g.add(top);
    for (const side of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.9, 8), mat(leaf)); a.position.set(side * 0.55, 1.4 * s + side * 0.2, 0); g.add(a); const t = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(leaf)); t.position.set(side * 0.55, 1.85 * s + side * 0.2, 0); g.add(t); }
  } else if (kind === "palm") {
    let x = 0; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.75, 7), mat(0xb88a5e)); m.position.set(x, 0.37 + i * 0.7, 0); m.castShadow = true; g.add(m); x += 0.06 * i; }
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), mat(i % 2 ? leaf : leaf2, 1)); l.scale.set(1.5, 0.12, 0.42); l.geometry.translate(1, 0, 0); l.position.set(x, 4.3, 0); l.rotation.set(0, i * 0.9, -0.35); l.castShadow = true; g.add(l); }
  } else if (kind === "bare") {
    trunk(2.6 * s, 0.22, 0x4a3a52);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.4, 6), mat(0x4a3a52)); b.position.y = 2 * s + i * 0.2; b.rotation.set(0.9, i * 1.6, 0); b.geometry.translate(0, 0.7, 0); g.add(b); }
    blob(0, 2.9 * s, 0, 0.7, leaf);
  } else if (kind === "willow") {
    trunk(1.8 * s, 0.3);
    blob(0, 2.6 * s, 0, 1.5 * s, leaf); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.15, 2.2 * s, 7), mat(leaf2, 1)); m.position.set(Math.cos(a) * 1.1 * s, 1.7 * s, Math.sin(a) * 1.1 * s); m.castShadow = true; g.add(m); }
  } else {
    // Round deciduous tree (round, autumn, jungle): a cluster of soft spheres
    trunk((kind === "jungle" ? 2.4 : 1.5) * s, 0.28);
    const top = (kind === "jungle" ? 3 : 2.1) * s, n = 3 + Math.floor(rng() * 3);
    blob(0, top + 0.4, 0, 1.25 * s, leaf);
    for (let i = 0; i < n; i++) { const a = rng() * 6.28; blob(Math.cos(a) * 0.9 * s, top + rng() * 0.6, Math.sin(a) * 0.9 * s, (0.7 + rng() * 0.4) * s, rng() < 0.5 ? leaf : leaf2); }
  }
  return g;
}

function rock(rng, color) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + rng() * 0.9, 1), mat(color, 1));
  m.scale.set(1, 0.55 + rng() * 0.3, 1 + rng() * 0.4); m.rotation.y = rng() * 6; m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}

const LEAVES = {
  round: [0x6fb04e, 0x8cc45e], autumn: [0xe8873a, 0xd9562e], pine: [0x3f7a4e, 0x4f8c58], palm: [0x5fae4a, 0x7cc25a],
  willow: [0x7aa65a, 0x93b86c], blossom: [0xffa8d0, 0xffd6e8], burnt: [0x2a2020, 0xc8441a], crystal: [0x5affe0, 0x9a7aff], lollipop: [0xff6ab0, 0x7ad8ff], bare: [0x9a6ad0, 0x7a52b0], jungle: [0x2f9a4a, 0x4cb45a], cactus: [0x5f9a5a, 0x6aa864]
};

export function makeWorld(key, rng, { size = 320, segments = 160, look = null, density = 1 } = {}) {
  const biome = lookOf(key, look), shape = SHAPE[key] || SHAPE.suburb;
  const noise = makeNoise(rng), detail = makeNoise(rng), color = makeNoise(rng);
  const half = size / 2, ox = rng() * 1000, oz = rng() * 1000;
  // A lake beside the building ground (so you can build out over water), plus others further away
  const lakes = [];
  if (shape.lakes) { const a = rng() * 6.28; lakes.push([Math.cos(a) * 30, Math.sin(a) * 30, 12 + rng() * 4]); }
  for (let i = 1; i < shape.lakes + 1; i++) { const a = rng() * 6.28, r = 60 + rng() * 50; lakes.push([Math.cos(a) * r, Math.sin(a) * r, 14 + rng() * 10]); }

  function heightAt(x, z) {
    const d = Math.hypot(x, z);
    // Gentle near the building ground, fuller hills further out
    const hillK = 0.55 + 0.45 * smooth((d - 20) / 60); // a little gentler where you start, real hills everywhere
    let n = noise((x + ox) * 0.009, (z + oz) * 0.009, 4);
    if (shape.ridged) n = Math.pow(1 - Math.abs(n), 3) * 1.25 - 0.12; // sharp mountain ridges
    let h = n * shape.hills * hillK + detail((x + ox) * 0.04, (z + oz) * 0.04, 2) * shape.rough + 1.6 + (shape.base || 0);
    if (shape.dunes) h += (Math.sin((x + z * 0.4) * 0.09 + noise(x * 0.02, z * 0.02, 2) * 3) * 0.5 + 0.5) * shape.dunes * hillK; // rolling dunes
    if (shape.coast) h -= smooth((x - half * 0.3) / (half * 0.5)) * 12;
    for (const [lx, lz, lr] of lakes) h -= smooth(1 - Math.hypot(x - lx, z - lz) / lr) * 4.5;
    // Where you arrive is always dry land: a gentle rise lifts the start above any water
    const lift = smooth(1 - d / 34); h = h * (1 - lift) + Math.max(h, 2) * lift;
    const edge = smooth((Math.max(Math.abs(x), Math.abs(z)) - half * 0.72) / (half * 0.25));
    return h - edge * 16;
  }

  // ----- Ground: smooth shading, soft color gradients -----
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  for (let i = 0; i < n; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  // Ground a touch richer and darker than the buildings so the town always pops against it
  const richer = (hex, dl) => { const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl); return c.offsetHSL(0, 0.1, dl - Math.max(0, hsl.l - 0.5) * 0.7); };
  // PS1 mood: colors pulled darker and a little desaturated
  const g1 = richer(biome.ground[0], -0.12), g2 = richer(biome.ground[1], -0.08);
  const sand = new THREE.Color(0xe8d6a8).lerp(g1, 0.15), rockC = new THREE.Color(0xa49a8c), snow = new THREE.Color(0xf6f4ee), wet = g1.clone().multiplyScalar(0.7);
  const colors = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    c.copy(g1).lerp(g2, smooth(color(x * 0.025, z * 0.025, 3) * 1.6 + 0.5));
    c.lerp(wet, smooth((1.1 - y) / 1.2) * 0.4);
    c.lerp(sand, smooth((0.7 - y) / 0.5));
    c.lerp(rockC, smooth((0.82 - nor.getY(i)) / 0.12) * 0.85);
    if (shape.snow) c.lerp(snow, smooth((y - shape.snow) / 3));
    if (shape.snowAll) c.lerp(snow, 0.85);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const group = new THREE.Group();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true; group.add(ground);

  // Water: clear and bright, with a soft sheen from the low sun
  const waterMat = shape.lava ? new THREE.MeshStandardMaterial({ color: 0xff5a10, emissive: 0xff3a00, emissiveIntensity: 1.4, roughness: 0.6 })
    : shape.snowAll ? new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.1, metalness: 0.2 }) // frozen lakes
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(0x5ec4d6).lerp(new THREE.Color(biome.sky[0]), 0.2), transparent: true, opacity: 0.86, roughness: 0.15, metalness: 0.1 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(size * 3, size * 3), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = 0; water.receiveShadow = true; group.add(water);

  // Everything already growing or standing in the world, indexed by build cell so building can clear it
  const nature = new Map();
  const cellKey = (x, z) => Math.round(x / CELL) + "," + Math.round(z / CELL);
  const addNature = (obj, x, z) => { const k = cellKey(x, z); if (!nature.has(k)) nature.set(k, []); nature.get(k).push(obj); group.add(obj); };
  const flowerAt = new Map();
  const api = {
    group, biome, key, heightAt, size, shape,
    /** Clear trees, rocks and landmarks from a build cell. Returns how many things were removed. */
    clearAt(i, j) {
      const k = i + "," + j, list = nature.get(k) || [];
      for (const o of list) group.remove(o);
      nature.delete(k);
      const fl = flowerAt.get(k) || [];
      for (const n of fl) { flowers.setMatrixAt(n, new THREE.Matrix4().makeScale(0, 0, 0)); }
      if (fl.length) { flowers.instanceMatrix.needsUpdate = true; flowerAt.delete(k); }
      return list.length + (api.clearTrees ? api.clearTrees(i, j) : 0);
    },
    hasNature: (i, j) => (nature.get(i + "," + j) || []).length > 0 || (api.hasTrees ? api.hasTrees(i, j) : false),
    isWater: (x, z) => heightAt(x, z) < 0.15,
    update(dt) { water.position.y = Math.sin(performance.now() / 1400) * 0.03; }
  };

  // ----- Forests: thousands of low-poly trees, packed into dense woods (instanced, so it stays fast) -----
  const grove = makeNoise(rng);
  const leaves = LEAVES[shape.tree] || LEAVES.round;
  const conifer = ["pine", "willow"].includes(shape.tree), spiky = shape.tree === "cactus";
  const crownGeo = conifer ? new THREE.ConeGeometry(1, 2.6, 5) : spiky ? new THREE.CylinderGeometry(0.35, 0.4, 2.2, 5) : shape.tree === "crystal" ? new THREE.ConeGeometry(0.7, 3.4, 4) : shape.tree === "lollipop" ? new THREE.SphereGeometry(0.9, 8, 6) : new THREE.IcosahedronGeometry(1.1, 0);
  const N = Math.round((spiky ? 500 : 2600) * density);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.24, 1, 5), new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 1, flatShading: true }), N);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: shape.tree === "crystal" ? 0.2 : 1, flatShading: true, emissive: shape.tree === "crystal" ? 0x2a6a8a : 0x000000 }), N);
  trunks.castShadow = crowns.castShadow = true; crowns.receiveShadow = true;
  const treeAt = new Map(), tm = new THREE.Matrix4(), tq = new THREE.Quaternion(), tv = new THREE.Vector3(), ts = new THREE.Vector3(), tc = new THREE.Color();
  let ti = 0;
  for (let tries = 0; ti < N && tries < N * 6; tries++) {
    const x = (rng() - 0.5) * size * 0.74, z = (rng() - 0.5) * size * 0.74, d = Math.hypot(x, z);
    if (d < 6) continue; // a small clearing where you arrive
    const h = heightAt(x, z);
    if (h < 0.4 || (shape.snow && h > shape.snow)) continue;
    const dens = grove(x * 0.03, z * 0.03, 3);
    if (dens < -0.15 && rng() > 0.03) continue; // most of the land is woods; a few glades
    const sc = (0.8 + rng() * 0.9) * (spiky ? 1 : 1.25), trunkH = conifer ? 0.9 * sc : spiky ? 0.2 : 1.6 * sc;
    tq.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.12, rng() * 6.28, (rng() - 0.5) * 0.12));
    tv.set(x, h + trunkH / 2 - 0.1, z); ts.set(sc, trunkH, sc); tm.compose(tv, tq, ts); trunks.setMatrixAt(ti, tm);
    tv.set(x, h + trunkH + (conifer ? 1.2 : spiky ? 1 : 0.7) * sc - 0.1, z); ts.set(sc, sc * (conifer ? 1.2 : 1), sc); tm.compose(tv, tq, ts); crowns.setMatrixAt(ti, tm);
    tc.set(leaves[rng() < 0.5 ? 0 : 1]).lerp(new THREE.Color(biome.ground[0]), 0.2).multiplyScalar(0.75 + rng() * 0.3); crowns.setColorAt(ti, tc);
    const k = cellKey(x, z); if (!treeAt.has(k)) treeAt.set(k, []); treeAt.get(k).push(ti);
    ti++;
  }
  trunks.count = crowns.count = ti;
  group.add(trunks, crowns);
  api.clearTrees = (i, j) => { const list = treeAt.get(i + "," + j) || []; const z0 = new THREE.Matrix4().makeScale(0, 0, 0); for (const n of list) { trunks.setMatrixAt(n, z0); crowns.setMatrixAt(n, z0); } if (list.length) { trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; treeAt.delete(i + "," + j); } return list.length; };
  api.hasTrees = (i, j) => (treeAt.get(i + "," + j) || []).length > 0;

  // A few big rocks, and a scatter near the lake shores
  for (let i = 0; i < 30 * density + (shape.rocks || 0) * 20; i++) {
    const a = rng() * 6.28, r = 8 + rng() * half * 0.65, x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z);
    if (h < 0.2) continue;
    const k = rock(rng, 0xb8afa4); k.position.set(x, h - 0.2, z); addNature(k, x, z);
  }

  // ----- Grass tufts and wildflowers (instanced, so there can be thousands) -----
  const tuft = new THREE.IcosahedronGeometry(0.32, 1); tuft.scale(1, 0.5, 1);
  const grass = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 0);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), Math.round(700 * density));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), tint = new THREE.Color();
  const petal = [0xffffff, 0xffe27a, 0xff9fb8, 0xb9a2ff, 0xffb37a];
  let gi = 0, fi = 0;
  for (let tries = 0; tries < 20000 && (gi < grass.count || fi < flowers.count); tries++) {
    const a = rng() * 6.28, r = Math.sqrt(rng()) * half * 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z);
    if (h < 0.45 || (shape.snow && h > shape.snow - 1)) continue;
    if (grove(x * 0.05 + 30, z * 0.05, 2) < 0.25) continue; // flowers grow in patches
    q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.4, rng() * 6, (rng() - 0.5) * 0.4));
    if (gi < grass.count && rng() < 0.85) {
      const s = 0.7 + rng() * 0.8; sc.set(s, s, s); p.set(x, h - 0.05, z); m4.compose(p, q, sc); grass.setMatrixAt(gi, m4);
      tint.copy(g2).lerp(g1, rng()).multiplyScalar(1.05 + rng() * 0.15); grass.setColorAt(gi++, tint);
    } else if (fi < flowers.count) {
      sc.set(1, 1, 1); p.set(x, h + 0.35, z); m4.compose(p, q, sc); flowers.setMatrixAt(fi, m4); { const ck = cellKey(x, z); if (!flowerAt.has(ck)) flowerAt.set(ck, []); flowerAt.get(ck).push(fi); }
      tint.set(petal[Math.floor(rng() * petal.length)]); flowers.setColorAt(fi++, tint);
    }
  }
  grass.count = gi; flowers.count = fi; grass.receiveShadow = true;
  group.add(grass, flowers);

  // ----- Landmarks: the things your evolution put in this world (the AI's prop mix, or the biome's) -----
  const skip = new Set(["flower", "fence", "house", "pinkBuilding", "pond", "pool", "roundTree", "fallTree", "pine", "palm", "rock"]);
  for (const [name, count] of biome.props || []) {
    if (skip.has(name)) continue;
    for (let n = 0, tries = 0; n < Math.round(count * 1.6 * density) && tries < count * 20; tries++) {
      const a = rng() * 6.28, r = 10 + rng() * half * 0.62, x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z);
      if (h < 0.5) continue;
      const o = prop(name, rng);
      o.scale.multiplyScalar(1.5 + rng() * 0.5); o.position.set(x, h - 0.1, z); o.rotation.y = rng() * 6.28;
      o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      addNature(o, x, z); n++;
    }
  }
  return api;
}

/** A Tiny Glade sky: soft gradient, a glowing sun, warm low light and long soft shadows. Returns the lights. */
// Each base world has its own air: fog color and distance, sun angle, color and strength
const AIR = {
  ember: { fog: 0x4a140a, near: 14, far: 120, sun: [-0.5, 0.5, 0.6], sunC: 0xff7a4a, sunI: 1.6, hemi: 0.45 },
  snow: { fog: 0xe4ecf8, near: 8, far: 85, sun: [-0.4, 0.7, 0.6], sunC: 0xf4f8ff, sunI: 1.9, hemi: 0.7 },
  bloom: { fog: 0xffd6ea, near: 35, far: 200, sun: [-0.6, 0.6, 0.55], sunC: 0xffe8f0, sunI: 2.4, hemi: 0.6 },
  rain: { fog: 0x3a3a5e, near: 6, far: 70, sun: [-0.3, 0.8, 0.5], sunC: 0xa8b8e8, sunI: 1.2, hemi: 0.5 },
  crystal: { fog: 0x0a2a3a, near: 14, far: 120, sun: [-0.5, 0.6, 0.6], sunC: 0x8affe8, sunI: 1.8, hemi: 0.45 },
  candy: { fog: 0xffd8ee, near: 50, far: 260, sun: [-0.55, 0.72, 0.6], sunC: 0xffffff, sunI: 2.5, hemi: 0.6 },
  desert: { fog: 0xe8b07a, near: 40, far: 230, sun: [0.3, 0.9, 0.3], sunC: 0xffffff, sunI: 3.0, hemi: 0.55 },
  spooky: { fog: 0x2a1e48, near: 8, far: 75, sun: [-0.4, 0.5, 0.6], sunC: 0x9a8cff, sunI: 1.1, hemi: 0.45 },
  bayou: { fog: 0x7a9a78, near: 6, far: 70, sun: [-0.5, 0.6, 0.6], sunC: 0xfff0c0, sunI: 1.8, hemi: 0.55 },
  pines: { fog: 0xd8e4f0, near: 45, far: 260, sun: [-0.5, 0.75, 0.5], sunC: 0xf4f8ff, sunI: 2.4, hemi: 0.6 },
  sunset: { fog: 0xff9a8a, near: 30, far: 200, sun: [-0.8, 0.22, 0.55], sunC: 0xff8a4a, sunI: 2.6, hemi: 0.5 },
  jungle: { fog: 0x8fbf8a, near: 10, far: 95, sun: [-0.3, 0.85, 0.4], sunC: 0xfff6d0, sunI: 2.2, hemi: 0.6 },
  harbor: { fog: 0xe8c08a, near: 25, far: 160, sun: [-0.7, 0.45, 0.55], sunC: 0xffc070, sunI: 2.5, hemi: 0.5 },
  suburb: { fog: 0xcfe0f0, near: 50, far: 260, sun: [-0.55, 0.72, 0.6], sunC: 0xffe2c0, sunI: 2.4, hemi: 0.55 }
};

export function gladeSky(scene, biome, { key = null, sunDir = new THREE.Vector3(-0.55, 0.72, 0.6).normalize() } = {}) {
  const air = AIR[key];
  if (air) sunDir = new THREE.Vector3(...air.sun).normalize();
  const top = new THREE.Color(biome.sky[0]), hor = new THREE.Color(biome.sky[1]);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: top }, hor: { value: hor }, sun: { value: sunDir }, night: { value: biome.night ? 1 : 0 } },
    vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sun; uniform float night; varying vec3 vp;
      void main(){ float h = clamp(vp.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.55));
        float s = max(dot(vp, sun), 0.0); c += vec3(1.0, 0.85, 0.6) * (pow(s, 600.0) * 1.5 + pow(s, 12.0) * 0.25) * (1.0 - night * 0.6);
        gl_FragColor = vec4(c, 1.0); }`
  }));
  scene.add(dome);
  const hemi = new THREE.HemisphereLight(biome.night ? 0xb8a8ff : 0xdfeeff, new THREE.Color(biome.ground[0]).multiplyScalar(0.6), air ? air.hemi : biome.night ? 0.55 : 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(air ? air.sunC : biome.night ? 0xc8c0ff : 0xffe2c0, air ? air.sunI : biome.night ? 1.2 : 2.4);
  sun.position.copy(sunDir).multiplyScalar(80); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 220 });
  scene.add(sun, sun.target);
  // Silent Hill fog: thick, close, and the color of the sky near the ground
  scene.fog = air ? new THREE.Fog(new THREE.Color(air.fog), air.near, air.far) : new THREE.Fog(hor.clone().lerp(top, 0.25).lerp(new THREE.Color(0x8a8a90), 0.35), 18, 110);
  return { hemi, sun, dome };
}

/** Weather around the camera: snow, rain, petals, embers or sparkles, depending on the world. */
export function weather(scene, key) {
  const W = { snow: [0xffffff, -3, 0.35, 1600], rain: [0xb8d0ff, -26, 0.22, 2200], bloom: [0xffb0d8, -1.8, 0.4, 900], ember: [0xff8a3a, 2.5, 0.3, 900], crystal: [0x8affff, 1, 0.3, 700], candy: [0xffffff, 0.8, 0.3, 400], bayou: [0xfff27a, 0.4, 0.3, 300] }[key];
  if (!W) return { update() {} };
  const [color, vy, size, n] = W, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([(Math.random() - 0.5) * 90, Math.random() * 40, (Math.random() - 0.5) * 90], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, fog: false }));
  scene.add(pts);
  return {
    update(dt, cx, cz) {
      pts.position.set(cx, 0, cz);
      const p = geo.attributes.position;
      for (let i = 0; i < n; i++) { let y = p.getY(i) + vy * dt; if (y < 0) y += 40; if (y > 40) y -= 40; p.setY(i, y); if (key !== "rain") p.setX(i, p.getX(i) + Math.sin(y + i) * dt * 0.6); }
      p.needsUpdate = true;
    }
  };
}
