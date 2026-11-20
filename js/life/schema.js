// The shape of an evolved life and its world. Both the AI and the offline generator produce these;
// the clean functions repair anything missing or out of range, so the game never draws something broken.

import { AXES } from "../core/game.js";
import { BODY_COLORS } from "../core/palette.js";
import { BIOME_KEYS, STICKER_IDS, GREETING_IDS, PROP_NAMES } from "../gfx/biomes.js";

export const SHAPES = ["round", "long", "tall", "blob", "spiky"];
export const LIMBS = ["legs", "fins", "tentacles", "wings", "none"];
export const FEATURES = ["spikes", "shell", "antennae", "stumpTail", "gears", "glow", "horns", "armor", "frills"];
export const COLORS = Object.keys(BODY_COLORS);
export const REQUESTS = ["sticker", "bring", "fly", "greet"];

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
    world: { biome: oneOf(w.biome, BIOME_KEYS, "suburb"), name: str(w.name, "Somewhere New", 30), pitch: str(w.pitch, "", 140), look: cleanLook(w.look) }
  };
}

function cleanQuestion(q) {
  const answers = (Array.isArray(q && q.answers) ? q.answers : []).slice(0, 3).map(a => ({ text: str(a && a.text, "...", 48), pic: emoji(a && a.pic, "❓"), axes: cleanAxes(a && a.axes), reply: str(a && a.reply, "Interesting.", 110) }));
  return { q: str(q && q.q, "", 120), pic: emoji(q && q.pic, "🖼️"), answers };
}

/** The world you chose: its characters (Doki Doki Universe identity cards) and the quiz moths. */
export function cleanWorld(x, biome) {
  if (!x || typeof x !== "object") throw new Error("bad world");
  const raw = (Array.isArray(x.npcs) ? x.npcs : []).slice(0, 5);
  if (raw.length < 4) throw new Error("need four characters");
  const npcs = raw.map((v, i) => {
    v = v || {};
    const likes = [...new Set((Array.isArray(v.likes) ? v.likes : []).filter(s => STICKER_IDS.includes(s)))].slice(0, 2);
    const dislikes = [...new Set((Array.isArray(v.dislikes) ? v.dislikes : []).filter(s => STICKER_IDS.includes(s) && !likes.includes(s)))].slice(0, 2);
    while (likes.length < 2) { const s = STICKER_IDS[(i * 5 + likes.length * 3 + 1) % STICKER_IDS.length]; if (!likes.includes(s) && !dislikes.includes(s)) likes.push(s); else likes.push(STICKER_IDS.find(t => !likes.includes(t) && !dislikes.includes(t))); }
    while (dislikes.length < 2) dislikes.push(STICKER_IDS.find(t => !likes.includes(t) && !dislikes.includes(t)));
    const greeting = oneOf(v.greeting, GREETING_IDS, GREETING_IDS[i % 4]);
    let type = oneOf(v.request && v.request.type, REQUESTS, REQUESTS[i % 4]);
    let target = v.request && v.request.target;
    if (type === "sticker") target = likes.includes(target) ? target : likes[0];
    if (type === "bring") { target = int(target, 0, raw.length - 1, (i + 1) % raw.length); if (target === i) target = (i + 1) % raw.length; }
    if (type === "greet") target = greeting;
    const L = v.lines || {};
    return {
      name: str(v.name, ["Pim", "Bo", "Zuzu", "Okra", "Lumi"][i], 16),
      role: str(v.role, "neighbor", 30),
      personality: str(v.personality, "friendly", 120),
      body: cleanBody(v.body),
      color: oneOf(v.color, COLORS, COLORS[(i * 3 + 2) % COLORS.length]),
      greeting, likes, dislikes,
      lovesFlying: type === "fly" ? true : !!v.lovesFlying,
      request: { type, target },
      lines: {
        hello: str(L.hello, "Oh! A new face!", 120),
        ask: str(L.ask, "", 140),
        thanks: str(L.thanks, "You did it! Here, take this.", 120),
        liked: str(L.liked, "I LOVE that!", 90),
        disliked: str(L.disliked, "Ew. Why would you show me that?", 90),
        tossed: str(L.tossed, "Wheee!", 90)
      }
    };
  });
  const quiz = (Array.isArray(x.quiz) ? x.quiz : []).slice(0, 2).map((m, i) => ({
    name: str(m && m.name, ["Moth Monk", "Professor Puddle"][i], 24),
    questions: (Array.isArray(m && m.questions) ? m.questions : []).map(cleanQuestion).filter(q => q.q && q.answers.length === 3).slice(0, 3)
  })).filter(m => m.questions.length === 3);
  if (quiz.length < 2) throw new Error("need two quiz moths");
  return { name: str(x.name, "Somewhere New", 30), description: str(x.description, "", 200), biome, npcs, quiz };
}
