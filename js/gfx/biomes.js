// Eight base worlds, inspired by the Sims world-select circles and TikTok "choose a planet" art:
// every evolution should land on a world of its own.
// Each biome is just data: sky, ground, props, particles, music. The AI picks a base biome for your life
// (from how you lived as a fish) and repaints it with its own colors and props, so no two lives match.

import { mat } from "./models.js";

const THREE = window.THREE;

// ---------- Handmade props (felt and cardboard colors, flat shaded, base at y = 0) ----------

const M = (geo, color, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
const G = (geo, color, y) => { const m = new THREE.Mesh(geo, mat(color, color, 0.9)); m.position.y = y; return m; };
const grp = (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; };

const P = {
  roundTree: (rng, c) => grp(M(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 5), 0x7a4e2d, 0, 0.8), M(new THREE.IcosahedronGeometry(1.2 + rng() * 0.4, 0), c || rng.pick([0x5fbf4a, 0x7cd05a, 0x4aa84a]), 0, 2.4)),
  fallTree: rng => P.roundTree(rng, rng.pick([0xff7a2f, 0xe8452f, 0xffc43d, 0xd9662a])),
  pine: rng => { const c = rng.pick([0x2f8a4a, 0x3f9a5a, 0x2a7a46]); return grp(M(new THREE.CylinderGeometry(0.2, 0.25, 1, 5), 0x6a4426, 0, 0.5), M(new THREE.ConeGeometry(1.3, 1.8, 6), c, 0, 1.6), M(new THREE.ConeGeometry(1.0, 1.5, 6), c, 0, 2.5), M(new THREE.ConeGeometry(0.7, 1.2, 6), c, 0, 3.3)); },
  palm: rng => {
    const g = new THREE.Group(); let y = 0, x = 0;
    for (let i = 0; i < 5; i++) { const s = M(new THREE.CylinderGeometry(0.18, 0.24, 0.9, 5), 0xb07a4a, x, y + 0.45, 0); s.rotation.z = -0.08 * i; g.add(s); y += 0.86; x += 0.08 * i; }
    for (let i = 0; i < 6; i++) { const l = M(new THREE.BoxGeometry(2.2, 0.08, 0.55), rng.pick([0x3fae4a, 0x58c05a]), x, y, 0); l.geometry.translate(1.1, 0, 0); l.rotation.set(0, i * Math.PI / 3, -0.45); g.add(l); }
    return g;
  },
  cypress: rng => grp(M(new THREE.CylinderGeometry(0.25, 0.7, 4, 6), 0x6b5a3a, 0, 2), M(new THREE.ConeGeometry(1.3, 2.2, 6), 0x5c8a3a, 0, 4.4), M(new THREE.ConeGeometry(0.9, 1.6, 6), 0x9aa86a, 0.5, 3.4)),
  cactus: rng => { const c = rng.pick([0x4fb05a, 0x3f9a4a]); const h = 1.6 + rng() * 1.2; return grp(M(new THREE.CylinderGeometry(0.35, 0.4, h, 6), c, 0, h / 2), M(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 6), c, 0.6, h * 0.6), M(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 6), c, -0.55, h * 0.45), M(new THREE.SphereGeometry(0.18, 5, 3), 0xff6b9a, 0, h + 0.1)); },
  mesa: rng => { const c = rng.pick([0xd9663a, 0xe8853f, 0xc8552f]); const w = 1.5 + rng() * 1.5; return grp(M(new THREE.BoxGeometry(w * 1.4, 1.2, w), c, 0, 0.6), M(new THREE.BoxGeometry(w, 1.2, w * 0.8), 0xf0a050, 0, 1.8)); },
  rock: rng => { const r = M(new THREE.DodecahedronGeometry(0.6 + rng() * 0.7, 0), rng.pick([0x9a90a8, 0xb0a6b8, 0x8a8098]), 0, 0.3); r.scale.y = 0.7; return grp(r); },
  house: (rng, colors) => {
    const c = rng.pick(colors || [0xff9ec4, 0x9ad8ff, 0xfff08a, 0xb8f0a0, 0xd0b0ff]);
    const g = grp(M(new THREE.BoxGeometry(2.2, 1.7, 2), c, 0, 0.85), M(new THREE.ConeGeometry(1.75, 1.3, 4), rng.pick([0xe8453f, 0x5a6ad0, 0x8a4a3a]), 0, 2.35), M(new THREE.BoxGeometry(0.5, 0.9, 0.06), 0x6a3f2a, 0, 0.45, 1.02), M(new THREE.BoxGeometry(0.45, 0.45, 0.06), 0xfff6c0, 0.65, 1.1, 1.02));
    g.children[1].rotation.y = Math.PI / 4; return g;
  },
  pinkBuilding: rng => grp(M(new THREE.BoxGeometry(2.6, 1.6 + rng() * 1.2, 2), rng.pick([0xffa0c8, 0xffc0a0, 0xc0a0ff]), 0, 1), M(new THREE.BoxGeometry(2.8, 0.15, 2.2), 0xffffff, 0, 2.2)),
  stilt: rng => { const g = grp(M(new THREE.BoxGeometry(2, 1.3, 1.8), 0x8a6a4a, 0, 1.75), M(new THREE.ConeGeometry(1.6, 1, 4), 0x5a7a5a, 0, 2.9)); for (const [x, z] of [[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]]) g.add(M(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 4), 0x5a4030, x, 0.6, z)); g.children[1].rotation.y = Math.PI / 4; return g; },
  deadTree: rng => { const g = grp(M(new THREE.CylinderGeometry(0.15, 0.35, 2.8, 5), 0x3a2a4a, 0, 1.4)); for (let i = 0; i < 3; i++) { const b = M(new THREE.CylinderGeometry(0.06, 0.12, 1.3, 4), 0x3a2a4a, 0, 1.6 + i * 0.4, 0); b.rotation.set(rng() * 1 - 0.5, i * 2, 0.9); g.add(b); } return g; },
  pumpkin: rng => { const p = M(new THREE.SphereGeometry(0.6, 7, 5), 0xff8a2a, 0, 0.5); p.scale.y = 0.75; return grp(p, M(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 4), 0x4a7a2a, 0, 1.0), M(new THREE.BoxGeometry(0.4, 0.12, 0.05), 0xffe060, 0, 0.5, 0.6)); },
  tower: rng => grp(M(new THREE.CylinderGeometry(0.9, 1.1, 4.2, 7), 0x6a5a8a, 0, 2.1), M(new THREE.ConeGeometry(1.2, 1.8, 7), 0x8a3f9a, 0, 5.1), M(new THREE.BoxGeometry(0.4, 0.5, 0.05), 0xffe060, 0, 3, 1.0)),
  lantern: rng => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), mat(0xffd060, 0xffb030, 0.9)); l.position.y = 1.7; return grp(M(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 4), 0x2b2340, 0, 0.75), l); },
  lighthouse: rng => grp(M(new THREE.CylinderGeometry(0.6, 0.9, 1.5, 8), 0xffffff, 0, 0.75), M(new THREE.CylinderGeometry(0.55, 0.6, 1.5, 8), 0xe8453f, 0, 2.25), M(new THREE.CylinderGeometry(0.5, 0.55, 1.2, 8), 0xffffff, 0, 3.6), G(new THREE.SphereGeometry(0.45, 6, 4), 0xfff0a0, 4.35), M(new THREE.ConeGeometry(0.6, 0.6, 8), 0xe8453f, 0, 4.85)),
  bigLeaf: rng => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const l = M(new THREE.SphereGeometry(0.9, 5, 3), rng.pick([0x2fae4a, 0x3fc05a, 0x1f9a3a]), 0, 0.9, 0); l.scale.set(1.4, 0.12, 0.6); l.geometry.translate(0.9, 0, 0); l.rotation.set(0, i * 1.25, 0.5 + rng() * 0.4); g.add(l); } return g; },
  pyramid: rng => grp(M(new THREE.BoxGeometry(4, 1, 4), 0xa8a070, 0, 0.5), M(new THREE.BoxGeometry(3, 1, 3), 0xb8b080, 0, 1.5), M(new THREE.BoxGeometry(2, 1, 2), 0xa8a070, 0, 2.5), M(new THREE.BoxGeometry(1, 0.8, 1), 0x6ac05a, 0, 3.4)),
  flower: rng => grp(M(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 3), 0x3a8a3a, 0, 0.3), M(new THREE.IcosahedronGeometry(0.25, 0), rng.pick([0xff5a7a, 0xffd84a, 0xff9a3d, 0xb07aff, 0x5ad0ff, 0xffffff]), 0, 0.7)),
  fence: rng => { const g = new THREE.Group(); for (let i = -1; i <= 1; i++) g.add(M(new THREE.BoxGeometry(0.15, 0.9, 0.1), 0xffffff, i * 0.6, 0.45, 0)); g.add(M(new THREE.BoxGeometry(1.5, 0.12, 0.08), 0xffffff, 0, 0.6, 0)); return g; },
  pool: rng => { const p = M(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 10), 0x4fd8ff, 0, 0.04); p.scale.z = 0.6; return grp(p); },
  pond: rng => { const p = M(new THREE.CylinderGeometry(1.6 + rng(), 1.6, 0.08, 10), 0x3f9f8f, 0, 0.03); p.scale.z = 0.7; return grp(p); },
  tent: rng => { const t = M(new THREE.ConeGeometry(1.2, 1.5, 4), rng.pick([0xff7a3d, 0x5aa8ff, 0xffd84a]), 0, 0.75); t.rotation.y = Math.PI / 4; return grp(t); },
  mushroom: rng => grp(M(new THREE.CylinderGeometry(0.15, 0.2, 0.7, 5), 0xfff1dc, 0, 0.35), M(new THREE.SphereGeometry(0.55, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), rng.pick([0xe8453f, 0xff9ac4, 0xb07aff]), 0, 0.65))
};

// ---------- The eight worlds ----------

const n = (...f) => f; // note frequencies for the music box
export const BIOMES = {
  bayou: { label: "Bayou", sky: [0x3e8fb0, 0xf9d77e], ground: [0x4f8f3a, 0x6aa84a], props: [["cypress", 10], ["stilt", 2], ["pond", 6], ["flower", 10], ["mushroom", 4]], particles: { color: 0xfff27a, kind: "float" }, notes: n(196, 0, 233, 262, 0, 294, 262, 233), axes: { calm: 1, curious: 1 } },
  desert: { label: "Desert Mesa", sky: [0x3b8ff0, 0xffd9a0], ground: [0xf2b25c, 0xe89a4a], props: [["cactus", 12], ["mesa", 6], ["rock", 8], ["flower", 3]], particles: { color: 0xffffff, kind: "dust" }, notes: n(220, 0, 262, 0, 294, 330, 0, 262), axes: { bold: 1, driven: 1 } },
  suburb: { label: "Candy Suburb", sky: [0x6fb8ff, 0xffe0f0], ground: [0x8fdc6a, 0x7acb5a], props: [["house", 7], ["roundTree", 8], ["fence", 8], ["flower", 14], ["pool", 1]], particles: { color: 0xffb0d8, kind: "float" }, notes: n(523, 659, 784, 659, 587, 698, 880, 698), axes: { social: 1, kind: 1 } },
  spooky: { label: "Moonlit Hollow", sky: [0x1a1240, 0x7a3fa0], ground: [0x4a3a6a, 0x5a4a7a], night: true, props: [["deadTree", 9], ["pumpkin", 10], ["tower", 2], ["lantern", 8], ["mushroom", 6]], particles: { color: 0x9aff8a, kind: "float" }, notes: n(220, 0, 262, 247, 0, 196, 208, 0), axes: { curious: 1, playful: 1 } },
  harbor: { label: "Maple Harbor", sky: [0x5aa0e0, 0xffe6c8], ground: [0x9fbf5a, 0xc9a24a], props: [["fallTree", 12], ["lighthouse", 1], ["house", 3], ["pond", 3], ["fence", 4]], particles: { color: 0xff8a3a, kind: "fall" }, notes: n(392, 0, 440, 494, 0, 440, 392, 330), axes: { calm: 1, kind: 1 } },
  sunset: { label: "Sunset Strip", sky: [0x6a5acd, 0xff9a6a], ground: [0xe8c98a, 0xd8b87a], props: [["palm", 10], ["pinkBuilding", 4], ["pool", 2], ["flower", 6]], particles: { color: 0xffe0a0, kind: "float" }, notes: n(330, 392, 494, 0, 440, 392, 330, 0), axes: { social: 1, playful: 1 } },
  pines: { label: "Pine Peaks", sky: [0x5ab0f0, 0xe8f6ff], ground: [0x5aa04a, 0x4a8f3f], props: [["pine", 16], ["rock", 8], ["tent", 2], ["pond", 2]], particles: { color: 0xffffff, kind: "fall" }, notes: n(262, 330, 392, 0, 349, 330, 294, 0), axes: { calm: 1, driven: 1 } },
  jungle: { label: "Jungle Ruins", sky: [0x4ac0e0, 0xfff0b0], ground: [0x3fa04a, 0x2f8a3a], props: [["bigLeaf", 12], ["pyramid", 1], ["flower", 14], ["palm", 3], ["mushroom", 3]], particles: { color: 0xff6bd0, kind: "float" }, notes: n(294, 0, 349, 392, 440, 0, 392, 349), axes: { bold: 1, curious: 1 } }
};
export const BIOME_KEYS = Object.keys(BIOMES);

export function prop(name, rng) { return (P[name] || P.rock)(rng); }
export const PROP_NAMES = Object.keys(P);

/** A biome with this life's own twist on top (the AI's colors, props and particles). */
export function lookOf(key, look) {
  const base = BIOMES[key] || BIOMES.suburb;
  if (!look) return base;
  return { ...base, sky: look.sky || base.sky, ground: look.ground || base.ground, props: look.props || base.props, particles: look.particle != null ? { ...base.particles, color: look.particle } : base.particles, label: look.label || base.label, night: look.night != null ? look.night : base.night };
}

// ---------- Summonable stickers (Doki Doki Universe summons, LittleBigPlanet stickers) ----------

export const STICKERS = {
  puppy: ["🐶", "a puppy"], cake: ["🍰", "a slice of cake"], rain: ["🌧️", "a rain cloud"], ghost: ["👻", "a ghost"],
  music: ["🎵", "a song"], flower: ["🌸", "a flower"], poop: ["💩", "a poop"], baby: ["👶", "a baby"],
  fire: ["🔥", "fire"], bug: ["🐛", "a bug"], star: ["⭐", "a star"], fish: ["🐟", "a fish"],
  icecream: ["🍦", "ice cream"], spider: ["🕷️", "a spider"], balloon: ["🎈", "a balloon"], cat: ["🐱", "a cat"],
  skull: ["💀", "a skull"], rocket: ["🚀", "a rocket"], crown: ["👑", "a crown"], dance: ["🪩", "a disco ball"]
};
export const STICKER_IDS = Object.keys(STICKERS);

export const GREETINGS = { wave: ["👋", "Wave"], bow: ["🙇", "Bow"], kiss: ["😘", "Blow a kiss"], dance: ["💃", "Little dance"] };
export const GREETING_IDS = Object.keys(GREETINGS);

/** Building colors for each base biome (the AI usually picks its own). */
export function defaultPalette(key) {
  return {
    bayou: { walls: ["#f6e2b8", "#bfe0b0", "#f0bfa0"], roof: "#3f7a6a" }, desert: { walls: ["#f4dcb8", "#f0c89a", "#fff1dc"], roof: "#c8643f" },
    suburb: { walls: ["#ffc8c8", "#c8e4ff", "#fff0a8"], roof: "#e8604f" }, spooky: { walls: ["#c9b8e8", "#a89ad0", "#e0d4f0"], roof: "#4a3a6a" },
    harbor: { walls: ["#fff4e2", "#f6c27a", "#b8dcef"], roof: "#c8443a" }, sunset: { walls: ["#ffd0c0", "#ffe8b0", "#f8c8e0"], roof: "#e8784a" },
    pines: { walls: ["#f0e4d4", "#d8c4a8", "#c8d8e0"], roof: "#4a6a8a" }, jungle: { walls: ["#f4ead0", "#d8f0c8", "#f8d8a8"], roof: "#2f8a5a" }
  }[key] || { walls: ["#fff1dc", "#ffd6d6", "#d6ecff"], roof: "#e86a5a" };
}

