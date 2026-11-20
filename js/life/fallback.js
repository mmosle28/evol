// Offline versions of everything the AI writes (creature, world, diary, reading), used only if the AI can't answer.
// Simpler than the AI's, but built from the same traits and the same rules, so the game still makes sense.

import { makeRng } from "../core/rng.js";
import { traitTags } from "./traits.js";
import { BIOMES, PROP_NAMES, defaultPalette } from "../gfx/biomes.js";
import { COLORS } from "./schema.js";

const SYL = ["ko", "ra", "vel", "mo", "thi", "zan", "ul", "pe", "dra", "su", "gor", "lu", "fen", "ka", "ri", "osh", "mi", "to"];
const TAG_BIOMES = { toolmaker: ["suburb", "sunset"], mystic: ["spooky", "bayou"], predator: ["desert", "jungle"], hunter: ["jungle", "pines"], grazer: ["bayou", "harbor"], explorer: ["harbor", "jungle"], cautious: ["pines", "harbor"], social: ["suburb", "sunset"], fighter: ["desert", "spooky"], tailless: ["bayou", "pines"], guardian: ["harbor", "suburb"], patient: ["pines", "bayou"], fasting: ["desert", "spooky"] };
const WORLD_NAMES = { bayou: "Gumbo Hollow", desert: "Mesa Mia", suburb: "Sprinkle Lane", spooky: "Batbourne", harbor: "Maple Cove", sunset: "Sunset Strip", pines: "Pinecone Peak", jungle: "Ruinwood" };
const PITCH = { bayou: "Fireflies, frogs, and somebody's grandma's gumbo.", desert: "Hot days, cool cacti, zero shade.", suburb: "Pastel houses and neighbors who notice everything.", spooky: "Always night. Everyone's a little dramatic.", harbor: "Falling leaves and a lighthouse that hums.", sunset: "Palm trees, pools, and permanent golden hour.", pines: "Tall trees, tents, and very loud owls.", jungle: "Big leaves, old ruins, louder birds." };
const name = rng => { const n = rng.pick(SYL) + rng.pick(SYL) + (rng.chance(0.4) ? rng.pick(SYL) : ""); return n[0].toUpperCase() + n.slice(1); };

export function fallbackLife(traits, seed) {
  const rng = makeRng(seed ^ 0x5bd1e995);
  const tags = traitTags(traits);
  const picks = [];
  for (const t of tags) for (const b of TAG_BIOMES[t] || []) if (!picks.includes(b)) picks.push(b);
  for (const b of rng.shuffle ? rng.shuffle(Object.keys(BIOMES)) : Object.keys(BIOMES).sort(() => rng() - 0.5)) if (!picks.includes(b)) picks.push(b);
  const features = [];
  if (tags.includes("tailless")) features.push("stumpTail");
  if (tags.includes("fighter")) features.push("horns");
  if (tags.includes("cautious")) features.push("shell");
  if (tags.includes("toolmaker")) features.push("gears");
  if (tags.includes("mystic")) features.push("glow");
  if (tags.includes("social")) features.push("frills");
  if (tags.includes("predator") || tags.includes("hunter")) features.push("spikes");
  return {
    creature: {
      name: name(rng),
      description: `A ${tags.includes("tailless") ? "slow, sturdy" : "quick"} little creature that grew out of a ${tags[0] || "curious"} fish.`,
      because: tags.includes("tailless") ? "Because you lost your tail and kept going, you walk on sturdy legs now." : `Because you lived like a ${tags[0] || "wanderer"}, your body leaned that way.`,
      body: { shape: tags.includes("tailless") ? "round" : tags.includes("explorer") ? "long" : rng.pick(["round", "tall", "blob", "spiky"]), eyes: tags.includes("cautious") ? 3 : 2, limbs: tags.includes("explorer") ? 4 : 2, limbType: tags.includes("tailless") ? "legs" : rng.pick(["legs", "fins", "wings"]), features: features.slice(0, 4) },
      color: rng.pick(COLORS)
    },
    world: (() => {
      // Same base world as a similar fish, but never the same look: shift the colors, swap in a surprise prop.
      const b = rng.chance(0.7) ? picks[0] : picks[1], base = BIOMES[b], dh = rng.range(-0.12, 0.12);
      const shift = c => "#" + new window.THREE.Color(c).offsetHSL(dh, rng.range(0, 0.15), rng.range(-0.04, 0.06)).getHexString();
      const props = base.props.map(([n, c]) => [n, Math.max(2, c + rng.int(-2, 3))]);
      props.push([rng.pick(PROP_NAMES.filter(n => !props.some(p => p[0] === n))), rng.int(3, 8)]);
      const NOUN = { bayou: ["Hollow", "Bayou", "Marsh"], desert: ["Mesa", "Dunes", "Gulch"], suburb: ["Lane", "Heights", "Court"], spooky: ["Hollow", "Crypt", "Manor"], harbor: ["Cove", "Harbor", "Point"], sunset: ["Strip", "Boulevard", "Beach"], pines: ["Peak", "Ridge", "Woods"], jungle: ["Ruins", "Canopy", "Temple"] };
      const nm = rng.chance(0.25) ? WORLD_NAMES[b] : `${rng.pick(["Lil", "Old", "Fizzy", "Sleepy", "Lucky", "Velvet", "Tiny", "Gumdrop", "Moonpie", "Crumb", "Jelly", "Wobble"])} ${rng.pick(NOUN[b])}`;
      return { biome: b, name: nm, pitch: PITCH[b], look: { sky: base.sky.map(shift), ground: base.ground.map(shift), props, particle: shift(base.particles.color), vibe: base.label }, palette: defaultPalette(b) };
    })()
  };
}

export function fallbackDiary(log) {
  const things = log.slice(-4).map(l => l.text[0].toLowerCase() + l.text.slice(1).replace(/\.$/, ""));
  return {
    entry: `Day one. ${things.length ? "Today I " + things.join(", then I ") + "." : "Today I mostly explored. The hills go on forever."} The town is small, but it's mine.`,
    sticker: "The New Builder",
    note: "You build the way you swam: one careful stone at a time."
  };
}

export function fallbackReading(axes, stats) {
  const st = stats || {};
  const tall = (st.tallest || 0) >= 5, spread = (st.clusters || 0) >= 3, tight = (st.density || 0) >= 0.5, redo = (st.removed || 0) >= 4, water = (st.overWater || 0) > 0;
  const archetype = tall && tight ? "The Skyline Hoarder" : spread ? "The Hamlet Sprinkler" : water ? "The Pier Dreamer" : redo ? "The Gentle Perfectionist" : tight ? "The Cozy Packer" : "The Quiet Founder";
  const receipts = [];
  if (st.tallest) receipts.push(`Your tallest building reached ${st.tallest} floors.`);
  if (st.clusters) receipts.push(`You built ${st.clusters} separate group${st.clusters > 1 ? "s" : ""} of houses.`);
  if (st.removed) receipts.push(`You took ${st.removed} floor${st.removed > 1 ? "s" : ""} back down.`);
  if (st.overWater) receipts.push(`You built ${st.overWater} house${st.overWater > 1 ? "s" : ""} out over the water.`);
  if (st.firstAt) { const sec = Math.max(1, Math.round(st.firstAt)); receipts.push(`You waited ${sec} second${sec > 1 ? "s" : ""} before the first stone.`); }
  while (receipts.length < 3) receipts.push(["You took your time in the pond.", "You let a whole world grow without blinking.", "You built until the lights came on."][receipts.length]);
  const top = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  return {
    archetype,
    lines: [
      tall ? "You build up, not out. When something matters, you stack on it until people can see it from far away." : "You kept things low and human-sized. Nothing you made needed to prove anything.",
      spread ? "You started over in new places instead of crowding one spot. You like having room to breathe." : "You kept everything close together, like you wanted your town to be able to hear itself.",
      `Under all of it is the same ${top[0][0]} streak your fish had in the pond. It just has walls now.`
    ],
    receipts: receipts.slice(0, 3),
    question: redo ? "What would you build if you knew you couldn't take it back?" : "What would you build if nobody was ever going to see it?"
  };
}
