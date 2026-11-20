// Offline versions of everything the AI writes (creature, world, diary, reading), used only if the AI can't answer.
// Simpler than the AI's, but built from the same traits and the same rules, so the game still makes sense.

import { makeRng } from "../core/rng.js";
import { traitTags } from "./traits.js";
import { BIOMES, PROP_NAMES, defaultPalette } from "../gfx/biomes.js";
import { COLORS } from "./schema.js";

const SYL = ["ko", "ra", "vel", "mo", "thi", "zan", "ul", "pe", "dra", "su", "gor", "lu", "fen", "ka", "ri", "osh", "mi", "to"];
const TAG_BIOMES = { toolmaker: ["crystal", "suburb"], mystic: ["crystal", "spooky"], predator: ["ember", "desert"], hunter: ["jungle", "ember"], grazer: ["bloom", "bayou"], explorer: ["harbor", "snow"], cautious: ["snow", "rain"], social: ["candy", "sunset"], fighter: ["ember", "desert"], tailless: ["rain", "bayou"], guardian: ["bloom", "harbor"], patient: ["rain", "pines"], fasting: ["desert", "snow"] };
const WORLD_NAMES = { ember: "Cinderhold", snow: "Frostmere", bloom: "Petalune", rain: "Drizzlewick", crystal: "Glimmerdeep", candy: "Sugarlune", bayou: "Gumbo Hollow", desert: "Mesa Mia", suburb: "Sprinkle Lane", spooky: "Batbourne", harbor: "Maple Cove", sunset: "Sunset Strip", pines: "Pinecone Peak", jungle: "Ruinwood" };
const PITCH = { ember: "Lava rivers, burnt trees, and sparks in the air.", snow: "Endless white and a wind that never stops.", bloom: "Everything is in flower, all the time.", rain: "It has never once stopped raining.", crystal: "Glowing spires under a teal sky.", candy: "Pink hills and lollipop trees.", bayou: "Fireflies, frogs, and somebody's grandma's gumbo.", desert: "Hot days, cool cacti, zero shade.", suburb: "Pastel houses and neighbors who notice everything.", spooky: "Always night. Everyone's a little dramatic.", harbor: "Falling leaves and a lighthouse that hums.", sunset: "Palm trees, pools, and permanent golden hour.", pines: "Tall trees, tents, and very loud owls.", jungle: "Big leaves, old ruins, louder birds." };
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
      const NOUN = { ember: ["Kingdom", "Forge", "Ash"], snow: ["Drift", "Peak", "Tundra"], bloom: ["Garden", "Meadow", "Grove"], rain: ["Marsh", "Hollow", "Basin"], crystal: ["Deep", "Spire", "Cavern"], candy: ["Hills", "Lane", "Fair"], bayou: ["Hollow", "Bayou", "Marsh"], desert: ["Mesa", "Dunes", "Gulch"], suburb: ["Lane", "Heights", "Court"], spooky: ["Hollow", "Crypt", "Manor"], harbor: ["Cove", "Harbor", "Point"], sunset: ["Strip", "Boulevard", "Beach"], pines: ["Peak", "Ridge", "Woods"], jungle: ["Ruins", "Canopy", "Temple"] };
      const nm = rng.chance(0.25) ? WORLD_NAMES[b] : `${rng.pick(["Lil", "Old", "Fizzy", "Sleepy", "Lucky", "Velvet", "Tiny", "Gumdrop", "Moonpie", "Crumb", "Jelly", "Wobble"])} ${rng.pick(NOUN[b])}`;
      return { biome: b, name: nm, pitch: PITCH[b], look: { sky: base.sky.map(shift), ground: base.ground.map(shift), props, particle: shift(base.particles.color), vibe: base.label }, palette: defaultPalette(b) };
    })()
  };
}

export function fallbackDiary(log) {
  const things = log.slice(-4).map(l => l.text[0].toLowerCase() + l.text.slice(1).replace(/\.$/, ""));
  return {
    entry: `Day one. ${things.length ? "Today I " + things.join(", then I ") + "." : "Today I mostly looked at the empty land and imagined streets."} It's small, but people live here now.`,
    sticker: "The New Mayor",
    note: "You build the way you swam: one careful move at a time."
  };
}

export function fallbackReading(axes, stats) {
  const st = stats || {};
  const planner = st.first === "road", parks = (st.parks || 0) >= 2, jobsy = (st.jobs || 0) >= (st.population || 0) * 0.5, sprawl = (st.clusters || 0) >= 3, redo = (st.bulldozed || 0) >= 4, lost = (st.unconnected || 0) >= 2;
  const archetype = planner && parks ? "The Sidewalk Romantic" : planner ? "The Grid Whisperer" : lost ? "The Dream-First Mayor" : sprawl ? "The Suburb Sprinkler" : redo ? "The Restless Planner" : parks ? "The Green Mayor" : "The Quiet Founder";
  const receipts = [];
  if (st.first) receipts.push(`The very first thing you built was ${st.first === "road" ? "a road" : st.first === "house" ? "homes" : "a " + st.first}.`);
  if (st.population) receipts.push(`${st.population} people moved in; there were ${st.jobs || 0} jobs.`);
  if (st.parks != null) receipts.push(`You planted ${st.parks} park${st.parks === 1 ? "" : "s"}.`);
  if (st.bulldozed) receipts.push(`You bulldozed ${st.bulldozed} thing${st.bulldozed > 1 ? "s" : ""} to replan.`);
  if (st.bridges) receipts.push(`You built ${st.bridges} bridge tile${st.bridges > 1 ? "s" : ""} over water.`);
  while (receipts.length < 3) receipts.push(["You took your time in the pond.", "You let a whole world grow without blinking.", "You built until the lights came on."][receipts.length]);
  const top = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  return {
    archetype,
    lines: [
      planner ? "You laid the road before anyone lived there. You like knowing how people will get somewhere before you invite them." : "You put homes down first and figured out the roads later. You start with who, not how.",
      parks ? "You saved room for parks even when you could have built more. You care how a place feels, not just what it holds." : jobsy ? "You made sure there was work for everyone. You think about what keeps a place going." : "Your city was mostly homes. A place to land matters more to you than a place to hustle.",
      `Under all of it is the same ${top[0][0]} streak your fish had in the pond. It just has streets now.`
    ],
    receipts: receipts.slice(0, 3),
    question: redo ? "What would you build if you knew you couldn't take it back?" : "Who would you want living on your street?"
  };
}
