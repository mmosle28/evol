// The shape of an evolved life. Both the AI and the offline generator produce this; cleanLife() repairs
// anything missing or out of range, so the game never draws something broken.

import { AXES } from "../core/game.js";
import { QUIZ_KINDS } from "../gfx/models.js";

export const SHAPES = ["round", "long", "tall", "blob", "spiky"];
export const LIMBS = ["legs", "fins", "tentacles", "wings", "none"];
export const FEATURES = ["spikes", "shell", "antennae", "stumpTail", "gears", "glow", "horns", "armor", "frills"];
export const PROPS = ["gears", "mushrooms", "crystals", "coral", "trees", "pipes", "bones", "lanterns"];

const str = (v, d, max = 160) => (typeof v === "string" && v.trim() ? v.trim().replace(/—/g, ",").slice(0, max) : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const int = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.round(Number(v)) || d));

export function cleanBody(b = {}) {
  return {
    shape: oneOf(b.shape, SHAPES, "round"),
    eyes: int(b.eyes, 1, 4, 2),
    limbs: int(b.limbs, 0, 6, 2),
    limbType: oneOf(b.limbType, LIMBS, "legs"),
    features: (Array.isArray(b.features) ? b.features : []).filter(f => FEATURES.includes(f)).slice(0, 4)
  };
}

function cleanAxes(a) {
  const out = {};
  if (a && typeof a === "object") for (const k of AXES) if (Number.isFinite(Number(a[k]))) out[k] = Math.max(-2, Math.min(2, Math.round(Number(a[k]))));
  return out;
}

export function cleanLife(x) {
  if (!x || typeof x !== "object" || !x.creature || !x.world) throw new Error("bad life");
  const c = x.creature, w = x.world;
  const resources = (Array.isArray(x.resources) ? x.resources : []).map(r => str(r, "", 24)).filter(Boolean);
  while (resources.length < 3) resources.push(["pebble", "feather", "seed"][resources.length]);
  const critters = (Array.isArray(x.critters) ? x.critters : []).slice(0, 2).map((k, i) => ({ name: str(k && k.name, ["hopper", "buzzer"][i], 24) }));
  while (critters.length < 2) critters.push({ name: ["hopper", "buzzer"][critters.length] });
  const villagers = (Array.isArray(x.villagers) ? x.villagers : []).slice(0, 4).map((v, i) => ({
    name: str(v && v.name, ["Mio", "Taro", "Hana", "Ken"][i], 20),
    role: str(v && v.role, "neighbor", 32),
    personality: str(v && v.personality, "friendly", 140),
    body: cleanBody(v && v.body),
    wants: int(v && v.wants, 0, 2, i % 3),
    count: int(v && v.count, 1, 5, 3),
    request: str(v && v.request, "", 120)
  }));
  if (villagers.length < 2) throw new Error("not enough villagers");
  const quiz = (Array.isArray(x.quiz) ? x.quiz : []).slice(0, 6).map((q, i) => ({
    kind: oneOf(q && q.kind, QUIZ_KINDS, QUIZ_KINDS[i % QUIZ_KINDS.length]),
    name: str(q && q.name, "a strange object", 32),
    question: str(q && q.question, "", 160),
    answers: (Array.isArray(q && q.answers) ? q.answers : []).slice(0, 3).map(a => ({ text: str(a && a.text, "...", 60), axes: cleanAxes(a && a.axes), reply: str(a && a.reply, "Hm.", 120) }))
  })).filter(q => q.question && q.answers.length === 3);
  if (quiz.length < 3) throw new Error("not enough quiz questions");
  return {
    creature: { name: str(c.name, "Unnamed", 32), description: str(c.description, "A new kind of creature.", 220), because: str(c.because, "", 240), body: cleanBody(c.body) },
    world: {
      name: str(w.name, "The New Village", 36), description: str(w.description, "", 220),
      props: oneOf(w.props, PROPS, "trees"),
      project: str(w.project, "the old bridge", 40),
      projectNeeds: int(w.projectNeeds, 6, 15, 9)
    },
    resources: resources.slice(0, 3),
    critters,
    villagers,
    quiz
  };
}
