// A whole world generated from a seed, like a Minecraft world, drawn to look like Tiny Glade: smooth rolling
// meadows with soft color gradients, a lake beside the building ground, groves of round trees placed in
// clusters (never sprinkled at random), grass and wildflowers, and a warm low sun with long soft shadows.
// The same seed always makes the same world. The base biome sets the land and plants; the AI's look recolors it.

import { lookOf } from "./biomes.js";

const THREE = window.THREE;

// How each base biome shapes the land and what grows on it
const SHAPE = {
  bayou: { hills: 3, rough: 0.3, tree: "willow", lakes: 2 }, desert: { hills: 7, rough: 0.6, tree: "cactus", lakes: 0, rocks: 2 },
  suburb: { hills: 4, rough: 0.3, tree: "round", lakes: 1 }, spooky: { hills: 7, rough: 0.5, tree: "bare", lakes: 1 },
  harbor: { hills: 6, rough: 0.4, tree: "autumn", lakes: 1, coast: true }, sunset: { hills: 4, rough: 0.3, tree: "palm", lakes: 1, coast: true },
  pines: { hills: 16, rough: 0.6, tree: "pine", lakes: 1, snow: 13 }, jungle: { hills: 9, rough: 0.6, tree: "jungle", lakes: 1 }
};
export const BUILD_RADIUS = 30;

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
  willow: [0x7aa65a, 0x93b86c], bare: [0x9a6ad0, 0x7a52b0], jungle: [0x2f9a4a, 0x4cb45a], cactus: [0x5f9a5a, 0x6aa864]
};

export function makeWorld(key, rng, { size = 320, segments = 160, look = null, density = 1 } = {}) {
  const biome = lookOf(key, look), shape = SHAPE[key] || SHAPE.suburb;
  const noise = makeNoise(rng), detail = makeNoise(rng), color = makeNoise(rng);
  const half = size / 2, ox = rng() * 1000, oz = rng() * 1000;
  // A lake beside the building ground (so you can build out over water), plus others further away
  const lakes = [];
  if (shape.lakes) { const a = rng() * 6.28; lakes.push([Math.cos(a) * 24, Math.sin(a) * 24, 13 + rng() * 4]); }
  for (let i = 1; i < shape.lakes + 1; i++) { const a = rng() * 6.28, r = 60 + rng() * 50; lakes.push([Math.cos(a) * r, Math.sin(a) * r, 14 + rng() * 10]); }

  function heightAt(x, z) {
    const d = Math.hypot(x, z);
    // Gentle near the building ground, fuller hills further out
    const hillK = 0.25 + 0.75 * smooth((d - BUILD_RADIUS) / 40);
    let h = noise((x + ox) * 0.009, (z + oz) * 0.009, 4) * shape.hills * hillK + detail((x + ox) * 0.04, (z + oz) * 0.04, 2) * shape.rough + 1.6;
    if (shape.coast) h -= smooth((x - half * 0.3) / (half * 0.5)) * 12;
    for (const [lx, lz, lr] of lakes) h -= smooth(1 - Math.hypot(x - lx, z - lz) / lr) * 4.5;
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
  const g1 = richer(biome.ground[0], -0.1), g2 = richer(biome.ground[1], -0.06);
  const sand = new THREE.Color(0xe8d6a8).lerp(g1, 0.15), rockC = new THREE.Color(0xa49a8c), snow = new THREE.Color(0xf6f4ee), wet = g1.clone().multiplyScalar(0.7);
  const colors = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    c.copy(g1).lerp(g2, smooth(color(x * 0.025, z * 0.025, 3) * 1.6 + 0.5));
    c.lerp(wet, smooth((1.1 - y) / 1.2) * 0.4);
    c.lerp(sand, smooth((0.7 - y) / 0.5));
    c.lerp(rockC, smooth((0.82 - nor.getY(i)) / 0.12) * 0.85);
    if (shape.snow) c.lerp(snow, smooth((y - shape.snow) / 3));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const group = new THREE.Group();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
  ground.receiveShadow = true; group.add(ground);

  // Water: clear and bright, with a soft sheen from the low sun
  const water = new THREE.Mesh(new THREE.PlaneGeometry(size * 3, size * 3), new THREE.MeshStandardMaterial({ color: new THREE.Color(0x5ec4d6).lerp(new THREE.Color(biome.sky[0]), 0.2), transparent: true, opacity: 0.86, roughness: 0.15, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0; water.receiveShadow = true; group.add(water);

  const api = {
    group, biome, key, heightAt, size, shape,
    isWater: (x, z) => heightAt(x, z) < 0.15,
    update(dt) { water.position.y = Math.sin(performance.now() / 1400) * 0.03; }
  };

  // ----- Groves: trees grow in clusters outside the building ground, with open meadows between -----
  const grove = makeNoise(rng);
  const leaves = LEAVES[shape.tree] || LEAVES.round, leaf = new THREE.Color(leaves[0]).lerp(new THREE.Color(biome.ground[1]), 0.15).getHex();
  const target = Math.round(170 * density);
  let placed = 0;
  for (let tries = 0; placed < target && tries < target * 12; tries++) {
    const x = (rng() - 0.5) * size * 0.72, z = (rng() - 0.5) * size * 0.72, d = Math.hypot(x, z);
    if (d < BUILD_RADIUS + 4) continue;
    const h = heightAt(x, z);
    if (h < 0.5 || (shape.snow && h > shape.snow)) continue;
    if (grove(x * 0.018, z * 0.018, 2) < 0.12 && rng() > 0.04) continue; // meadows stay open
    const t = tree(shape.tree, rng, leaf, leaves[1]);
    t.position.set(x, h - 0.1, z); t.rotation.y = rng() * 6.28;
    group.add(t); placed++;
  }
  // A few big rocks, and a scatter near the lake shores
  for (let i = 0; i < 30 * density + (shape.rocks || 0) * 20; i++) {
    const a = rng() * 6.28, r = BUILD_RADIUS + 6 + rng() * half * 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z);
    if (h < 0.2) continue;
    const k = rock(rng, 0xb8afa4); k.position.set(x, h - 0.2, z); group.add(k);
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
    if (grove(x * 0.05 + 30, z * 0.05, 2) < 0.25 || r < BUILD_RADIUS + 8) continue; // flowers grow in patches, away from town
    q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.4, rng() * 6, (rng() - 0.5) * 0.4));
    if (gi < grass.count && rng() < 0.85) {
      const s = 0.7 + rng() * 0.8; sc.set(s, s, s); p.set(x, h - 0.05, z); m4.compose(p, q, sc); grass.setMatrixAt(gi, m4);
      tint.copy(g2).lerp(g1, rng()).multiplyScalar(1.05 + rng() * 0.15); grass.setColorAt(gi++, tint);
    } else if (fi < flowers.count) {
      sc.set(1, 1, 1); p.set(x, h + 0.35, z); m4.compose(p, q, sc); flowers.setMatrixAt(fi, m4);
      tint.set(petal[Math.floor(rng() * petal.length)]); flowers.setColorAt(fi++, tint);
    }
  }
  grass.count = gi; flowers.count = fi; grass.receiveShadow = true;
  group.add(grass, flowers);
  return api;
}

/** A Tiny Glade sky: soft gradient, a glowing sun, warm low light and long soft shadows. Returns the lights. */
export function gladeSky(scene, biome, { sunDir = new THREE.Vector3(-0.55, 0.72, 0.6).normalize() } = {}) {
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
  const hemi = new THREE.HemisphereLight(biome.night ? 0xb8a8ff : 0xdfeeff, new THREE.Color(biome.ground[0]).multiplyScalar(0.6), biome.night ? 0.55 : 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(biome.night ? 0xc8c0ff : 0xffe2c0, biome.night ? 1.2 : 2.4);
  sun.position.copy(sunDir).multiplyScalar(80); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 220 });
  scene.add(sun, sun.target);
  scene.fog = new THREE.Fog(hor.clone().lerp(top, 0.25), 120, 340);
  return { hemi, sun, dome };
}
