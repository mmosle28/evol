// The shape of an evolved "life": the creature, its world, the NPCs and jobs in it.
// Both the AI and the offline generator must produce this shape; `cleanLife` repairs anything missing.

export const SHAPES = ["round", "long", "tall", "blob", "spiky"];
export const LIMBS = ["legs", "fins", "tentacles", "wings", "none"];
export const FEATURES = ["spikes", "shell", "antennae", "stumpTail", "gears", "glow", "horns", "armor", "frills"];
export const PROPS = ["gears", "mushrooms", "crystals", "coral", "trees", "pipes", "bones", "lanterns"];
export const TEMPLATES = ["catch", "timing", "recipe"];

const hex = (v, d) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d);
const str = (v, d, max = 160) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const list = (v, n, d) => {
  const a = Array.isArray(v) ? v.filter(x => typeof x === "string" && x.trim()).map(x => x.trim().slice(0, 28)) : [];
  while (a.length < n) a.push(d[a.length % d.length]);
  return a.slice(0, n);
};

export function cleanBody(b = {}) {
  return {
    shape: oneOf(b.shape, SHAPES, "round"),
    color: hex(b.color, "#e0864a"),
    accent: hex(b.accent, "#f6d36b"),
    eyes: Math.max(1, Math.min(4, Math.round(Number(b.eyes) || 2))),
    limbs: Math.max(0, Math.min(6, Math.round(Number(b.limbs) || 0))),
    limbType: oneOf(b.limbType, LIMBS, "legs"),
    features: (Array.isArray(b.features) ? b.features : []).filter(f => FEATURES.includes(f)).slice(0, 4)
  };
}

/** Make any AI or fallback answer safe to use. Throws if it's hopeless (caller then uses the fallback). */
export function cleanLife(x) {
  if (!x || typeof x !== "object" || !x.creature || !x.world) throw new Error("bad life");
  const c = x.creature, w = x.world;
  const jobs = Array.isArray(x.jobs) ? x.jobs.slice(0, 3) : [];
  // Guarantee one job per mini-game template, in a fixed order
  const byTemplate = TEMPLATES.map((tpl, i) => jobs.find(j => j && j.template === tpl) || jobs[i] || {});
  return {
    creature: {
      name: str(c.name, "Unnamed", 40),
      description: str(c.description, "A new kind of creature.", 260),
      because: str(c.because, "", 260),
      body: cleanBody(c.body)
    },
    world: {
      name: str(w.name, "The New World", 40),
      description: str(w.description, "", 240),
      props: oneOf(w.props, PROPS, "trees"),
      ground: hex(w.ground, "#2c4a3a"),
      ground2: hex(w.ground2, "#355a46"),
      accent: hex(w.accent, "#f2b91c"),
      currency: str(w.currency, "shells", 20)
    },
    npcs: (Array.isArray(x.npcs) ? x.npcs : []).slice(0, 3).map((n, i) => ({
      name: str(n && n.name, ["Orrin", "Pell", "Vash"][i], 24),
      role: str(n && n.role, "neighbor", 40),
      personality: str(n && n.personality, "curious", 120),
      body: cleanBody(n && n.body)
    })),
    jobs: byTemplate.map((j, i) => ({
      name: str(j.name, ["Gatherer", "Smith", "Cook"][i], 32),
      template: TEMPLATES[i],
      blurb: str(j.blurb, "Help out around the world.", 140),
      good: list(j.good, 3, ["seed", "berry", "pebble"]),
      bad: list(j.bad, 2, ["rot", "thorn"]),
      ingredients: list(j.ingredients, 5, ["moss", "sap", "spore", "salt", "ash"]),
      pay: Math.max(3, Math.min(20, Math.round(Number(j.pay) || 8)))
    })),
    oracle: { name: str(x.oracle && x.oracle.name, "The Oracle", 32), form: str(x.oracle && x.oracle.form, "a glowing stone", 80) }
  };
}
