// Low-poly models built from code: no outside art. Flat shading gives a faceted, handmade look.
// Everything alive is red; everything else is white or stone.

import { PAL } from "../core/palette.js";

const THREE = window.THREE;
const matCache = {};

/** Shared flat-shaded material by color (and optional glow). */
export function mat(color, emissive = 0, ei = 0) {
  const k = color + ":" + emissive + ":" + ei;
  if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, emissive, emissiveIntensity: ei });
  return matCache[k];
}

function mesh(geo, material, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

// ---------- Pond life ----------

/** A small fish. `tailless` drops the tail fin (lost to the heron). */
export function fish({ color = PAL.red, scale = 1, tailless = false } = {}) {
  const g = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(1, 0), mat(color));
  body.scale.set(1.6, 0.8, 0.7);
  g.add(body);
  const tail = mesh(new THREE.ConeGeometry(0.7, 1.2, 4), mat(color));
  tail.rotation.z = Math.PI / 2; tail.position.x = -1.9; tail.scale.set(1, 1, 0.3);
  tail.visible = !tailless;
  g.add(tail);
  const stump = mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(PAL.redDark));
  stump.position.x = -1.55; stump.visible = tailless;
  g.add(stump);
  const eye = mesh(new THREE.SphereGeometry(0.16, 6, 4), mat(PAL.ink), false);
  eye.position.set(1.05, 0.25, 0.42); g.add(eye);
  const eye2 = eye.clone(); eye2.position.z = -0.42; g.add(eye2);
  g.userData.tail = tail; g.userData.stump = stump;
  g.scale.setScalar(scale);
  return g;
}

export function setTailless(f, on) { f.userData.tail.visible = !on; f.userData.stump.visible = on; }

export function frog() {
  const g = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(1.2, 0), mat(PAL.red)); body.scale.set(1.2, 0.7, 1.1); g.add(body);
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.35, 6, 4), mat(PAL.redLight)); eye.position.set(0.7, 0.75, s * 0.5); g.add(eye);
    const leg = mesh(new THREE.BoxGeometry(1.4, 0.3, 0.4), mat(PAL.redDark)); leg.position.set(-0.8, -0.3, s * 1); g.add(leg);
  }
  return g;
}

export function turtle() {
  const g = new THREE.Group();
  const shell = mesh(new THREE.SphereGeometry(2.6, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(PAL.redDark)); shell.scale.y = 0.6; g.add(shell);
  const head = mesh(new THREE.IcosahedronGeometry(0.7, 0), mat(PAL.red)); head.position.set(3, 0.3, 0); g.add(head);
  for (const [x, z] of [[1.6, 1.7], [1.6, -1.7], [-1.6, 1.7], [-1.6, -1.7]]) { const f = mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), mat(PAL.red)); f.position.set(x, -0.1, z); g.add(f); }
  return g;
}

export function crayfish() {
  const g = new THREE.Group();
  const body = mesh(new THREE.IcosahedronGeometry(0.8, 0), mat(PAL.red)); body.scale.set(1.6, 0.6, 0.8); g.add(body);
  for (const s of [-1, 1]) { const c = mesh(new THREE.ConeGeometry(0.4, 1.3, 4), mat(PAL.redDark)); c.rotation.z = -Math.PI / 2; c.position.set(1.7, 0, s * 0.7); g.add(c); }
  return g;
}

export function bug() {
  const g = new THREE.Group();
  const b = mesh(new THREE.IcosahedronGeometry(0.35, 0), mat(PAL.red)); b.scale.set(1.4, 0.7, 1); g.add(b);
  const wing = mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }), false);
  wing.rotation.x = -Math.PI / 2; wing.position.y = 0.25; g.add(wing);
  g.userData.wing = wing;
  return g;
}

export function eggs() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const e = mesh(new THREE.SphereGeometry(0.32, 6, 4), new THREE.MeshStandardMaterial({ color: PAL.redLight, transparent: true, opacity: 0.85, roughness: 0.3 }), false);
    e.position.set((i % 3 - 1) * 0.6, 0, (Math.floor(i / 3) - 1) * 0.6);
    g.add(e);
  }
  return g;
}

/** Pondweed: pale, swaying blades (not red: plants aren't creatures). */
export function weed() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = mesh(new THREE.ConeGeometry(0.25, 3 + i * 0.4, 3), mat(0x5fcf6a));
    b.position.set((i - 1.5) * 0.4, 1.5, (i % 2) * 0.3);
    b.rotation.z = (i - 1.5) * 0.12;
    g.add(b);
  }
  return g;
}

export function reeds() {
  const g = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, r = 1 + (i % 4) * 1.1;
    const b = mesh(new THREE.CylinderGeometry(0.08, 0.12, 6 + (i % 3), 4), mat(0x9a8a4a));
    b.position.set(Math.cos(a) * r, 3, Math.sin(a) * r);
    b.rotation.z = Math.sin(i) * 0.1;
    g.add(b);
  }
  return g;
}

export function lilypad(r = 1.6) {
  const p = mesh(new THREE.CylinderGeometry(r, r, 0.12, 9, 1, false, 0.4, Math.PI * 2 - 0.5), mat(0x7ad35a));
  return p;
}

export function rock(s = 1) {
  const r = mesh(new THREE.DodecahedronGeometry(s, 0), mat(0xa89cb8));
  r.scale.y = 0.6;
  return r;
}

export function item(kind) {
  const g = new THREE.Group();
  if (kind === "stick") { const s = mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 5), mat(0xc9b9a0)); s.rotation.z = Math.PI / 2; g.add(s); }
  else if (kind === "shell") { const s = mesh(new THREE.ConeGeometry(0.6, 0.9, 6), mat(0xeee6d6)); g.add(s); }
  else if (kind === "bottle cap") { const s = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 10), mat(0xc9ced6)); g.add(s); }
  else { const s = mesh(new THREE.OctahedronGeometry(0.6, 0), mat(0xffffff, 0x9ff0ff, 1.2)); g.add(s); } // glowing stone
  return g;
}

/** A hook on a fishing line, coming down from above. */
export function hook() {
  const g = new THREE.Group();
  const line = mesh(new THREE.CylinderGeometry(0.03, 0.03, 30, 3), mat(0xffffff), false); line.position.y = 15; g.add(line);
  const bait = mesh(new THREE.IcosahedronGeometry(0.45, 0), mat(PAL.redLight)); g.add(bait);
  const h = mesh(new THREE.TorusGeometry(0.4, 0.07, 4, 8, Math.PI * 1.3), mat(0xcfd3d8)); h.position.y = -0.5; g.add(h);
  return g;
}

/** A kid's net sweeping in from the shore. */
export function net() {
  const g = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.12, 0.12, 22, 5), mat(0xe8e2d6)); pole.rotation.z = Math.PI / 2.6; pole.position.set(-9, 6, 0); g.add(pole);
  const ring = mesh(new THREE.TorusGeometry(2.4, 0.12, 4, 12), mat(0xe8e2d6)); ring.rotation.x = Math.PI / 2; g.add(ring);
  const bag = mesh(new THREE.ConeGeometry(2.4, 3, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.6 }), false);
  bag.rotation.x = Math.PI; bag.position.y = -1.5; g.add(bag);
  return g;
}

// ---------- Evolved creatures (built from the AI's body description) ----------

export function creature(body, { scale = 1, color = PAL.red, accent = PAL.redDark } = {}) {
  const g = new THREE.Group();
  const f = new Set(body.features || []);
  let geo;
  if (body.shape === "blob") geo = new THREE.DodecahedronGeometry(1, 0);
  else if (body.shape === "spiky") geo = new THREE.IcosahedronGeometry(1, 0);
  else geo = new THREE.IcosahedronGeometry(1, 1);
  const b = mesh(geo, mat(color));
  const sx = body.shape === "long" ? 1.5 : 1, sy = body.shape === "tall" ? 1.45 : body.shape === "long" ? 0.75 : 0.95;
  b.scale.set(sx, sy, 1);
  b.position.y = 1.4 * sy + 0.4;
  g.add(b);
  const top = b.position.y + sy, front = sx;
  g.userData.anchor = { top, mid: b.position.y, front, sy };

  // Limbs
  const n = body.limbs || 0;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), rows = Math.ceil(n / 2);
    const x = rows === 1 ? 0 : (row / (rows - 1) - 0.5) * sx * 1.2;
    let limb;
    if (body.limbType === "legs") { limb = mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.2, 5), mat(accent)); limb.position.set(x, 0.6, side * 0.55); }
    else if (body.limbType === "fins") { limb = mesh(new THREE.ConeGeometry(0.4, 1, 3), mat(accent)); limb.position.set(x, b.position.y - 0.4, side * 1); limb.rotation.x = side * 1.2; }
    else if (body.limbType === "tentacles") { limb = mesh(new THREE.ConeGeometry(0.2, 1.6, 4), mat(accent)); limb.position.set(x, 0.7, side * 0.5); limb.rotation.x = Math.PI + side * 0.3; }
    else if (body.limbType === "wings") { limb = mesh(new THREE.BoxGeometry(0.9, 0.06, 1.4), mat(0xffffff)); limb.position.set(x, b.position.y + 0.6, side * 1.2); limb.rotation.x = side * 0.5; limb.userData.flap = side; }
    if (limb) { limb.userData.limb = true; g.add(limb); }
  }
  if (!n || body.limbType === "none" || body.limbType === "wings" || body.limbType === "fins") b.position.y = Math.max(b.position.y, sy + 0.2);

  // Eyes
  const eyes = body.eyes || 2;
  for (let i = 0; i < eyes; i++) {
    const e = mesh(new THREE.SphereGeometry(0.22, 6, 4), mat(0xffffff), false);
    const z = eyes === 1 ? 0 : (i / (eyes - 1) - 0.5) * 0.9;
    e.position.set(front * 0.85, b.position.y + 0.35 + (i % 2) * 0.12, z);
    const p = mesh(new THREE.SphereGeometry(0.1, 5, 3), mat(PAL.ink), false); p.position.x = 0.15; e.add(p);
    g.add(e);
  }
  // Features
  const add = (geo, material, x, y, z, rx = 0, rz = 0) => { const m = mesh(geo, material); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; };
  if (f.has("spikes") || body.shape === "spiky") for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.22, 0.8, 4), mat(accent), (i - 2) * 0.35 * sx, top - 0.05, 0, 0, (i - 2) * 0.25);
  if (f.has("shell")) { const s = add(new THREE.SphereGeometry(1.1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff), -0.2, b.position.y + 0.1, 0); s.scale.set(sx, 0.9, 1); }
  if (f.has("horns")) for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.16, 0.9, 4), mat(0xffffff), front * 0.4, top, s * 0.35, s * 0.4, -0.3);
  if (f.has("antennae")) for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.04, 0.04, 1, 3), mat(PAL.ink), front * 0.5, top + 0.4, s * 0.25, s * 0.3, -0.3); add(new THREE.SphereGeometry(0.12, 5, 3), mat(PAL.redLight), front * 0.65, top + 0.9, s * 0.4); }
  if (f.has("stumpTail")) add(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(accent), -sx - 0.15, b.position.y - 0.1, 0);
  if (f.has("gears")) { const t = add(new THREE.TorusGeometry(0.45, 0.12, 4, 8), mat(0xffffff), -0.2, b.position.y, 1.0); t.userData.spin = 1; }
  if (f.has("armor")) for (let i = -1; i <= 1; i++) add(new THREE.BoxGeometry(0.5, 0.15, 1.9), mat(0xffffff), i * 0.55 * sx, top - 0.15, 0);
  if (f.has("frills")) for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.2, 0.7, 3), mat(PAL.redLight), -0.3 + i * 0.2, top + 0.15, 0, 0, -0.6 + i * 0.3);
  if (f.has("glow")) { b.material = mat(color, 0xff5a5a, 0.45); }

  g.scale.setScalar(scale);
  g.userData.body = b;
  return g;
}

/** Gentle idle animation for a creature (bob, flapping wings, spinning gears). */
export function animateCreature(g, t, moving) {
  const b = g.userData.body;
  if (b) b.position.y += Math.sin(t * (moving ? 12 : 3)) * (moving ? 0.012 : 0.004);
  g.children.forEach(c => {
    if (c.userData.flap) c.rotation.x = c.userData.flap * (0.5 + Math.sin(t * 14) * 0.5);
    if (c.userData.spin) c.rotation.z = t * 2;
    if (c.userData.limb && moving && !c.userData.flap) c.rotation.z = Math.sin(t * 12 + c.position.z) * 0.4;
  });
}

// ---------- Summer countryside props (all white) ----------

export function house(rng) {
  const g = new THREE.Group();
  const w = 7 + rng() * 3, d = 6 + rng() * 2, h = 4 + rng() * 1.5;
  const base = mesh(new THREE.BoxGeometry(w, h, d), mat(PAL.white)); base.position.y = h / 2; g.add(base);
  const roof = mesh(new THREE.CylinderGeometry(0.01, d * 0.78, 2.8, 4, 1), mat(PAL.stone));
  roof.rotation.y = Math.PI / 4; roof.scale.set(w / d * 1.15, 1, 1.15); roof.position.y = h + 1.4; g.add(roof);
  const door = mesh(new THREE.BoxGeometry(0.2, 2.6, 1.6), mat(PAL.shade)); door.position.set(w / 2, 1.3, 0); g.add(door);
  return g;
}

export function pole() {
  const g = new THREE.Group();
  const p = mesh(new THREE.CylinderGeometry(0.18, 0.24, 12, 5), mat(PAL.stone)); p.position.y = 6; g.add(p);
  const bar = mesh(new THREE.BoxGeometry(0.2, 0.2, 3), mat(PAL.stone)); bar.position.y = 11; g.add(bar);
  return g;
}

/** Overhead wire between two poles (the classic summer-sky detail). */
export function wire(a, b) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    pts.push(new THREE.Vector3(a.x + (b.x - a.x) * k, 11 - Math.sin(k * Math.PI) * 1.4, a.z + (b.z - a.z) * k));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2a2e }));
}

export function tree(rng) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.3, 0.45, 3, 5), mat(PAL.stone)); trunk.position.y = 1.5; g.add(trunk);
  const n = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const c = mesh(new THREE.IcosahedronGeometry(2.2 - i * 0.4, 0), mat(PAL.white)); c.position.set(rng() - 0.5, 3.8 + i * 1.6, rng() - 0.5); g.add(c);
  }
  return g;
}

export function vending() {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(1.4, 3.2, 1.2), mat(PAL.white)); b.position.y = 1.6; g.add(b);
  const panel = mesh(new THREE.BoxGeometry(0.05, 1.6, 1), mat(0xffffff, 0xbfe8ff, 0.9), false); panel.position.set(0.71, 2.1, 0); g.add(panel);
  return g;
}

export function paddy() {
  const p = mesh(new THREE.BoxGeometry(14, 0.1, 9), new THREE.MeshStandardMaterial({ color: 0xd9ecf2, roughness: 0.2, metalness: 0.1 }), false);
  p.position.y = 0.05;
  return p;
}

/** Theme sculptures chosen by the AI's world type, rendered white like the rest of the world. */
export function themeProp(type, rng) {
  const g = new THREE.Group();
  const w = mat(PAL.white), s = mat(PAL.stone);
  if (type === "gears") { const t = mesh(new THREE.TorusGeometry(1.6, 0.45, 4, 10), w); t.position.y = 2.4; t.userData.spin = 1; g.add(t); const p = mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.4, 5), s); p.position.y = 1.2; g.add(p); }
  else if (type === "crystals") for (let i = 0; i < 3; i++) { const c = mesh(new THREE.OctahedronGeometry(0.8 + rng(), 0), mat(0xffffff, 0xcfe8ff, 0.4)); c.scale.y = 2; c.position.set(i - 1, 1.6, rng() - 0.5); g.add(c); }
  else if (type === "mushrooms") for (let i = 0; i < 3; i++) { const st = mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.5 + i, 5), s); st.position.set(i - 1, 0.75 + i / 2, 0); g.add(st); const cap = mesh(new THREE.SphereGeometry(0.9 + i * 0.2, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), w); cap.position.set(i - 1, 1.5 + i, 0); g.add(cap); }
  else if (type === "coral") for (let i = 0; i < 4; i++) { const c = mesh(new THREE.CylinderGeometry(0.15, 0.3, 2 + rng() * 2, 4), w); c.position.set(rng() * 2 - 1, 1.2, rng() * 2 - 1); c.rotation.z = rng() - 0.5; g.add(c); }
  else if (type === "bones") { const r = mesh(new THREE.TorusGeometry(2, 0.25, 4, 10, Math.PI), w); r.position.y = 0.2; g.add(r); }
  else if (type === "lanterns") { const p = mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 4), s); p.position.y = 1.5; g.add(p); const l = mesh(new THREE.IcosahedronGeometry(0.5, 0), mat(0xffffff, 0xffe0a0, 1)); l.position.y = 3.2; g.add(l); }
  else if (type === "pipes") { const p = mesh(new THREE.TorusGeometry(1.5, 0.3, 5, 8, Math.PI), w); p.position.y = 0.1; p.rotation.y = rng() * 3; g.add(p); }
  else return tree(rng);
  return g;
}

/** The odd talking objects (Doki Doki style). Each kind is a simple white model with one red detail. */
export const QUIZ_KINDS = ["watermelon", "vending machine", "mailbox", "scarecrow", "radio", "bell", "statue", "umbrella"];
export function quizObject(kind) {
  const g = new THREE.Group();
  const w = mat(PAL.white), r = mat(PAL.red);
  switch (kind) {
    case "watermelon": { const m = mesh(new THREE.IcosahedronGeometry(1.2, 1), w); m.scale.set(1.3, 1, 1); m.position.y = 1; g.add(m); const s = mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), r); s.position.y = 2; g.add(s); break; }
    case "vending machine": return vending();
    case "mailbox": { const p = mesh(new THREE.CylinderGeometry(0.15, 0.15, 2, 5), mat(PAL.stone)); p.position.y = 1; g.add(p); const b = mesh(new THREE.BoxGeometry(1.4, 1, 0.9), r); b.position.y = 2.4; g.add(b); break; }
    case "scarecrow": { const p = mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 5), mat(PAL.stone)); p.position.y = 2; g.add(p); const a = mesh(new THREE.BoxGeometry(0.2, 0.2, 3), mat(PAL.stone)); a.position.y = 3; g.add(a); const h = mesh(new THREE.ConeGeometry(1, 0.6, 8), w); h.position.y = 4.4; g.add(h); const sh = mesh(new THREE.BoxGeometry(0.8, 1.4, 1.4), r); sh.position.y = 2.8; g.add(sh); break; }
    case "radio": { const b = mesh(new THREE.BoxGeometry(1.6, 1, 0.8), w); b.position.y = 0.5; g.add(b); const d = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8), r); d.rotation.x = Math.PI / 2; d.position.set(0.3, 0.55, 0.42); g.add(d); break; }
    case "bell": { const f = mesh(new THREE.BoxGeometry(0.2, 4, 3), mat(PAL.stone)); f.position.y = 2; g.add(f); const b = mesh(new THREE.ConeGeometry(0.8, 1.4, 8), w); b.position.y = 3; g.add(b); const c = mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), r); c.position.set(0.3, 2.2, 0); g.add(c); break; }
    case "umbrella": { const p = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 4), mat(PAL.stone)); p.position.y = 1.5; g.add(p); const c = mesh(new THREE.ConeGeometry(1.8, 0.8, 8), r); c.position.y = 3.2; g.add(c); break; }
    default: { const p = mesh(new THREE.BoxGeometry(1.4, 1, 1.4), mat(PAL.stone)); p.position.y = 0.5; g.add(p); const s = mesh(new THREE.IcosahedronGeometry(0.8, 0), w); s.position.y = 1.8; g.add(s); const e = mesh(new THREE.SphereGeometry(0.15, 5, 3), r); e.position.set(0.7, 2, 0); g.add(e); }
  }
  return g;
}

/** Flat grass floor. */
export function ground(size = 220, color = PAL.grass) {
  const g = mesh(new THREE.CircleGeometry(size, 48), new THREE.MeshStandardMaterial({ color, roughness: 1 }), false);
  g.rotation.x = -Math.PI / 2;
  return g;
}

/** A soft glowing ring that marks things you can interact with. */
export function ring(color = PAL.red) {
  const r = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.7, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  r.rotation.x = -Math.PI / 2; r.position.y = 0.06;
  return r;
}
