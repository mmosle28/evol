// Your evolved alien. Evolution changes the whole body plan, not just the color:
//   legs (2)          -> upright humanoid builder with arms and a wrench
//   legs (4+)         -> four-legged beast (6 legs: insect with a segmented body)
//   wings             -> upright flier with big wings
//   tentacles         -> floating jellyfish with a dome and dangling tentacles
//   fins / none       -> serpent: a long segmented body that rears up
// On top of that: head shape from the body shape, eye count, horns, crests, antennae, shell, glow,
// a tail (unless the fish lost it), and skin texture (scales, spots or stripes). Faces +x like models.creature.

const THREE = window.THREE;
const skins = new Map();

/** A small procedural skin texture: scales, spots or stripes, tinted to the body color. */
function skin(kind, color) {
  const k = kind + color;
  if (skins.has(k)) return skins.get(k);
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), base = new THREE.Color(color), dark = base.clone().multiplyScalar(0.6), light = base.clone().lerp(new THREE.Color(0xffffff), 0.25);
  g.fillStyle = "#" + base.getHexString(); g.fillRect(0, 0, 64, 64);
  if (kind === "scales") { g.strokeStyle = "#" + dark.getHexString(); g.lineWidth = 2; for (let y = 0; y < 72; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 72; x += 8) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI); g.stroke(); } }
  else if (kind === "spots") { g.fillStyle = "#" + dark.getHexString(); for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 37) % 64, (i * 23) % 64, 3 + (i % 3) * 2, 0, 7); g.fill(); } }
  else { g.fillStyle = "#" + dark.getHexString(); for (let x = 0; x < 64; x += 12) g.fillRect(x, 0, 5, 64); g.fillStyle = "#" + light.getHexString(); g.fillRect(0, 0, 64, 6); }
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 2);
  skins.set(k, tex); return tex;
}

export function alien(body, { scale = 1, color = 0xff9a3d } = {}) {
  const g = new THREE.Group(), feats = new Set(body.features || []);
  const accent = new THREE.Color(color).multiplyScalar(0.62).getHex();
  const kind = body.limbType === "tentacles" ? "jelly" : body.limbType === "wings" ? "flier" : body.limbType === "fins" || body.limbType === "none" ? "serpent" : (body.limbs || 2) >= 6 ? "insect" : (body.limbs || 2) >= 4 ? "beast" : "humanoid";
  const skinKind = feats.has("armor") || feats.has("shell") ? "scales" : body.shape === "spiky" || feats.has("spikes") ? "stripes" : "spots";
  const M = new THREE.MeshStandardMaterial({ color: 0xffffff, map: skin(skinKind, color), roughness: 0.8, flatShading: true });
  const A = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7, flatShading: true });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; parent.add(o); return o; };
  const tall = body.shape === "tall" ? 1.3 : body.shape === "round" || body.shape === "blob" ? 0.85 : 1, wide = body.shape === "round" || body.shape === "blob" ? 1.25 : body.shape === "long" ? 0.9 : 1;
  let headY = 0, headX = 0, torsoY = 0, limbs = [];

  if (kind === "humanoid" || kind === "flier") {
    // Legs, a torso, a neck and arms; the right hand holds a wrench (it's a builder)
    for (const s of [-1, 1]) { const l = add(new THREE.CylinderGeometry(0.16, 0.12, 1.3 * tall, 6), A, 0, 0.65 * tall, s * 0.32); l.userData.limb = true; limbs.push(l); add(new THREE.BoxGeometry(0.42, 0.16, 0.26), A, 0.12, 0.08, s * 0.32); }
    torsoY = 1.3 * tall + 0.7 * tall;
    add(body.shape === "spiky" ? new THREE.OctahedronGeometry(0.75, 0) : new THREE.CylinderGeometry(0.55 * wide, 0.42 * wide, 1.45 * tall, 7), M, 0, torsoY, 0).scale.set(0.8, body.shape === "spiky" ? 1.3 : 1, 1);
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(0, torsoY + 0.5 * tall, s * 0.62 * wide); g.add(arm);
      add(new THREE.CylinderGeometry(0.1, 0.09, 1.1, 6), A, 0.15, -0.5, 0, 0, 0, s * 0.2 - 0.25, arm);
      add(new THREE.SphereGeometry(0.14, 6, 4), M, 0.3, -1.05, 0, 0, 0, 0, arm);
      if (s > 0) { add(new THREE.BoxGeometry(0.1, 0.75, 0.1), new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.6, roughness: 0.4 }), 0.42, -1.2, 0, 0, 0, 0.4, arm); add(new THREE.TorusGeometry(0.12, 0.05, 4, 8, 4.5), new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.6, roughness: 0.4 }), 0.6, -0.82, 0, 0, 0, 0.4, arm); }
      arm.userData.swing = s; limbs.push(arm);
    }
    headY = torsoY + 0.75 * tall + 0.55; headX = 0.05;
    if (kind === "flier") for (const s of [-1, 1]) { const w = add(new THREE.ConeGeometry(1.1, 2.4, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, flatShading: true }), -0.35, torsoY + 0.4, s * 1.3, s * 1.2, 0, 0.3); w.scale.z = 0.1; w.userData.flap = s; }
  } else if (kind === "beast" || kind === "insect") {
    // Horizontal body on four (or six) legs
    const n = kind === "insect" ? 3 : 2, len = kind === "insect" ? 0.75 : 1.1;
    torsoY = 1.25 * tall;
    for (let i = 0; i < (kind === "insect" ? 3 : 1); i++) add(kind === "insect" ? new THREE.SphereGeometry(0.55 - i * 0.05, 8, 6) : new THREE.CylinderGeometry(0.7 * wide, 0.6 * wide, 2.4, 8), M, -i * 0.9 + (kind === "insect" ? 0.4 : 0), torsoY, 0, 0, 0, kind === "insect" ? 0 : Math.PI / 2);
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const x = (n === 2 ? (i ? -0.8 : 0.8) : 0.6 - i * 0.7);
      const l = add(new THREE.CylinderGeometry(0.11, 0.08, torsoY * 1.05 * len + 0.4, 5), A, x, torsoY / 2, s * (kind === "insect" ? 0.75 : 0.55), s * (kind === "insect" ? 0.6 : 0.08));
      l.userData.limb = true; limbs.push(l);
    }
    headY = torsoY + 0.45; headX = kind === "insect" ? 1.3 : 1.55;
  } else if (kind === "jelly") {
    // A floating dome with dangling tentacles
    torsoY = 2.3 * tall;
    add(new THREE.SphereGeometry(1.05 * wide, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M, 0, torsoY - 0.2, 0);
    add(new THREE.CylinderGeometry(1.05 * wide, 0.9 * wide, 0.25, 10), A, 0, torsoY - 0.25, 0);
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28, t = add(new THREE.ConeGeometry(0.1, 1.8, 4), A, Math.cos(a) * 0.7, torsoY - 1.25, Math.sin(a) * 0.7, Math.PI); t.userData.limb = true; limbs.push(t); }
    headY = torsoY + 0.4; headX = 0.5;
  } else {
    // Serpent: segments trailing back, the front rearing up into a head
    torsoY = 0.5;
    for (let i = 0; i < 6; i++) { const s = add(new THREE.SphereGeometry(0.55 - i * 0.05, 8, 6), M, -i * 0.75 + 0.3, 0.5 + (i === 0 ? 0.5 : 0) + Math.max(0, 1 - i) * 0.4, Math.sin(i * 1.1) * 0.4); s.scale.set(1.2, 0.9, 1); s.userData.limb = true; limbs.push(s); }
    headY = 2.0 * tall; headX = 0.8;
    add(new THREE.CylinderGeometry(0.4, 0.5, 1.2 * tall, 7), M, 0.55, 1.4 * tall, 0, 0, 0, -0.3);
  }

  // ----- Head: shape from the body shape, eyes from the count, extras from features -----
  const hg = new THREE.Group(); hg.position.set(headX, headY, 0); g.add(hg);
  const hs = body.shape === "long" ? [0.85, 0.48, 0.5] : body.shape === "tall" ? [0.5, 0.75, 0.5] : body.shape === "spiky" ? [0.55, 0.6, 0.55] : [0.58, 0.55, 0.58];
  const head = add(body.shape === "spiky" ? new THREE.IcosahedronGeometry(1, 0) : new THREE.SphereGeometry(1, 9, 7), M, 0, 0, 0, 0, 0, 0, hg); head.scale.set(...hs);
  add(new THREE.BoxGeometry(0.1, 0.06, 0.34), new THREE.MeshStandardMaterial({ color: 0x2b1a20 }), hs[0] * 0.95, -hs[1] * 0.35, 0, 0, 0, 0, hg); // mouth
  const eyes = Math.max(1, Math.min(4, body.eyes || 2));
  for (let e = 0; e < eyes; e++) {
    const z = eyes === 1 ? 0 : (e / (eyes - 1) - 0.5) * hs[2] * 1.2, y = hs[1] * 0.2 + (eyes > 2 && e % 2 ? 0.14 : 0);
    add(new THREE.SphereGeometry(eyes === 1 ? 0.22 : 0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }), hs[0] * 0.85, y, z, 0, 0, 0, hg);
    add(new THREE.SphereGeometry(eyes === 1 ? 0.11 : 0.07, 6, 4), new THREE.MeshStandardMaterial({ color: 0x140a10 }), hs[0] * 0.85 + 0.1, y, z, 0, 0, 0, hg);
  }
  const top = hs[1];
  if (feats.has("horns")) for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.12, 0.65, 5), A, -0.05, top + 0.15, s * 0.3, s * 0.4, 0, -0.3, hg);
  if (feats.has("antennae")) for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 4), A, 0.05, top + 0.3, s * 0.18, s * 0.3, 0, 0, hg); add(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffe07a, emissive: 0xffc040, emissiveIntensity: 0.6 }), 0.05, top + 0.68, s * 0.29, 0, 0, 0, hg); }
  if (feats.has("frills")) for (const s of [-1, 1]) { const f = add(new THREE.CircleGeometry(0.45, 5), new THREE.MeshStandardMaterial({ color: accent, side: THREE.DoubleSide, flatShading: true }), -0.15, 0.05, s * hs[2] * 0.95, 0, s * 0.6, 0, hg); }
  if (feats.has("spikes")) for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.1, 0.4, 4), A, -0.2 - i * 0.18, top - 0.05 - i * 0.12, 0, 0, 0, 0.6 + i * 0.2, hg);
  if (feats.has("glow")) add(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshStandardMaterial({ color: 0x9fffe0, emissive: 0x6affc8, emissiveIntensity: 1 }), hs[0] * 0.6, top * 0.75, 0, 0, 0, 0, hg);
  if (feats.has("gears")) add(new THREE.TorusGeometry(0.22, 0.07, 4, 8), new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.6, roughness: 0.4 }), -0.4, torsoY - headY + 0.3, 0, 0, Math.PI / 2, 0, hg).userData.spin = true;
  if (feats.has("shell") && kind !== "jelly") add(new THREE.SphereGeometry(0.85, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, flatShading: true }), kind === "humanoid" || kind === "flier" ? -0.35 : -0.2, torsoY + (kind === "humanoid" || kind === "flier" ? 0.1 : 0.25), 0, 0, 0, kind === "humanoid" || kind === "flier" ? Math.PI / 2 : 0);
  // A tail, unless the fish lost its tail in the pond
  if (!feats.has("stumpTail") && kind !== "jelly" && kind !== "serpent") { const t = add(new THREE.ConeGeometry(0.16, 1.4, 5), A, kind === "beast" || kind === "insect" ? -1.9 : -0.55, torsoY - 0.5, 0, 0, 0, Math.PI / 2 + 0.5); t.userData.tail = true; }
  else if (feats.has("stumpTail") && kind !== "jelly") add(new THREE.SphereGeometry(0.18, 6, 4), A, kind === "beast" || kind === "insect" ? -1.4 : -0.5, torsoY - 0.6, 0);

  g.scale.setScalar(scale);
  g.userData.anchor = { top: headY + top, mid: kind === "jelly" ? torsoY - 0.1 : torsoY, front: kind === "humanoid" || kind === "flier" ? 0.5 : 0.8, sy: 0.8, headX };
  g.userData.limbs = limbs; g.userData.kind = kind;
  return g;
}

/** Walk cycle and idle bob for an alien. */
export function animateAlien(g, t, moving) {
  const k = g.userData.kind, sp = moving ? 10 : 2.5;
  (g.userData.limbs || []).forEach((l, i) => {
    if (l.userData.swing) l.rotation.z = Math.sin(t * sp + (l.userData.swing > 0 ? 0 : Math.PI)) * (moving ? 0.5 : 0.08);
    else if (k === "jelly") l.rotation.x = Math.PI + Math.sin(t * 3 + i) * 0.25;
    else if (k === "serpent") l.position.z = Math.sin(t * (moving ? 8 : 2) - i * 0.9) * 0.45;
    else if (l.userData.limb && moving) l.rotation.z = Math.sin(t * sp + i * 1.7) * 0.45;
  });
  g.children.forEach(c => { if (c.userData.flap) c.rotation.x = c.userData.flap * (1.2 + Math.sin(t * (moving ? 14 : 4)) * 0.35); });
  if (k === "jelly") g.position.y += Math.sin(t * 2) * 0.004;
}
