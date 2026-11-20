// The shape of an evolved life: the creature and the world it evolved into. Both the AI and the offline generator produce these;
// the clean functions repair anything missing or out of range, so the game never draws something broken.

import { AXES } from "../core/game.js";
import { BODY_COLORS } from "../core/palette.js";
import { BIOME_KEYS, PROP_NAMES, defaultPalette } from "../gfx/biomes.js";

export const SHAPES = ["round", "long", "tall", "blob", "spiky"];
export const LIMBS = ["legs", "fins", "tentacles", "wings", "none"];
export const FEATURES = ["spikes", "shell", "antennae", "stumpTail", "gears", "glow", "horns", "armor", "frills"];
export const COLORS = Object.keys(BODY_COLORS);

const str = (v, d, max = 160) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s*[—–]\s*/g, ", ").slice(0, max) : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const int = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.round(Number(v)) || d));
const emoji = (v, d) => (typeof v === "string" && v.trim() && v.trim().length <= 12 ? v.trim() : d);

export function cleanBody(b = {}) {
  return {
    shape: oneOf(b.shape, SHAPES, "round"),
    eyes: int(b.eyes, 1, 4, 2),
    limbs: int(b.limbs, 0, 6, 2),
    limbType: oneOf(b.limbType, LIMBS, "legs"),
    features: (Array.isArray(b.features) ? b.features : []).filter(f => FEATURES.includes(f)).slice(0, 4)
  };
}

export function cleanAxes(a) {
  const out = {};
  if (a && typeof a === "object") for (const k of AXES) if (Number.isFinite(Number(a[k]))) out[k] = Math.max(-2, Math.min(2, Math.round(Number(a[k]))));
  return out;
}

const hex = v => (typeof v === "string" && /^#?[0-9a-f]{6}$/i.test(v.trim()) ? parseInt(v.trim().replace("#", ""), 16) : null);
const pair = v => (Array.isArray(v) && v.length >= 2 && hex(v[0]) != null && hex(v[1]) != null ? [hex(v[0]), hex(v[1])] : null);

/** This life's world look: the AI's own colors and prop mix on top of a base biome. */
export function cleanLook(l) {
  if (!l || typeof l !== "object") return null;
  const props = (Array.isArray(l.props) ? l.props : []).map(p => Array.isArray(p) ? [p[0], p[1]] : [p && p.name, p && p.count])
    .filter(([n]) => PROP_NAMES.includes(n)).map(([n, c]) => [n, int(c, 1, 16, 6)]).slice(0, 6);
  return { sky: pair(l.sky), ground: pair(l.ground), props: props.length >= 3 ? props : null, particle: hex(l.particle), label: str(l.vibe, null, 28), night: typeof l.night === "boolean" ? l.night : null };
}

/** After the pond: your creature, and the one world it evolved into. */
export function cleanLife(x) {
  if (!x || typeof x !== "object" || !x.creature || !x.world) throw new Error("bad life");
  const c = x.creature, w = x.world;
  return {
    creature: { name: str(c.name, "Unnamed", 28), description: str(c.description, "A new kind of creature.", 200), because: str(c.because, "", 220), body: cleanBody(c.body), color: oneOf(c.color, COLORS, "tangerine") },
    world: (() => {
      const biome = oneOf(w.biome, BIOME_KEYS, "suburb"), def = defaultPalette(biome), p = w.palette || {};
      const walls = (Array.isArray(p.walls) ? p.walls : []).filter(c => hex(c) != null).slice(0, 3);
      return { biome, name: str(w.name, "Somewhere New", 30), pitch: str(w.pitch, "", 140), look: cleanLook(w.look), palette: { walls: walls.length === 3 ? walls : def.walls, roof: hex(p.roof) != null ? p.roof : def.roof } };
    })()
  };
}
