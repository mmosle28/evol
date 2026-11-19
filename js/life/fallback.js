// Offline evolution: if the AI is unavailable, build a life from the traits with seeded random picks.
// It's simpler than what the AI writes, but it follows the same rules, so the game always works.

import { makeRng } from "../core/rng.js";
import { traitTags } from "./traits.js";

const THEMES = {
  toolmaker: { props: "gears", world: ["Cogmarsh", "Rivet Hollow", "The Clockfen"], currency: "gears", ground: "#3a3a40", ground2: "#46464e", accent: "#e0a63a",
    jobs: [["Bolt Catcher", ["bolt", "spring", "cog"], ["rust flake", "loose wire"]], ["Gear Forger", [], []], ["Engine Tinker", [], ["oil", "brass", "spring", "coil", "valve"]]] },
  mystic: { props: "crystals", world: ["Lumen Deep", "The Glowfields", "Starwell"], currency: "glimmers", ground: "#2a2440", ground2: "#332c4f", accent: "#9ef0e0",
    jobs: [["Star Gatherer", ["starlight", "glow moth", "moon drop"], ["shadow", "void dust"]], ["Crystal Tuner", [], []], ["Potion Mixer", [], ["moonmilk", "ember", "dew", "spore", "glow salt"]]] },
  grazer: { props: "mushrooms", world: ["Mossmere", "The Soft Meadow", "Fernwold"], currency: "seeds", ground: "#2f4a2c", ground2: "#3a5a36", accent: "#f2d16b",
    jobs: [["Berry Picker", ["berry", "clover", "sweet root"], ["thorn", "bitter cap"]], ["Seed Planter", [], []], ["Stew Cook", [], ["moss", "root", "berry", "leaf", "honeydew"]]] },
  predator: { props: "bones", world: ["Fang Reef", "The Hunting Flats", "Ridgebite"], currency: "teeth", ground: "#4a3a2c", ground2: "#57442f", accent: "#f08a50",
    jobs: [["Night Hunter", ["beetle", "eel", "crab"], ["spiny fish", "decoy"]], ["Bone Carver", [], []], ["Feast Cook", [], ["marrow", "salt", "fat", "pepper", "smoke"]]] },
  deep: { props: "coral", world: ["The Dim Shelf", "Coralgloom", "Undertide"], currency: "pearls", ground: "#163a44", ground2: "#1d4652", accent: "#7fe0d0",
    jobs: [["Pearl Diver", ["pearl", "sea glass", "clam"], ["urchin", "jelly"]], ["Current Keeper", [], []], ["Kelp Chef", [], ["kelp", "brine", "clam", "sponge", "salt"]]] },
  explorer: { props: "trees", world: ["The Wide Reach", "Windcrest", "Far Isles"], currency: "maps", ground: "#2c4a3a", ground2: "#355a46", accent: "#f2b91c",
    jobs: [["Map Courier", ["letter", "map", "compass"], ["storm", "mud"]], ["Signal Keeper", [], []], ["Trail Cook", [], ["nut", "berry", "salt", "herb", "flatbread"]]] }
};

const SYL = ["ko", "ra", "vel", "mo", "thi", "zan", "ul", "pe", "dra", "si", "gor", "lu", "fen", "ka", "ri", "osh"];

export function fallbackLife(traits, seed) {
  const rng = makeRng(seed ^ 0x5bd1e995);
  const tags = traitTags(traits);
  const themeKey = ["toolmaker", "mystic", "deep", "predator", "grazer", "explorer"].find(k => tags.includes(k) || (k === "predator" && tags.includes("hunter"))) || "explorer";
  const th = THEMES[themeKey];
  const name = () => { const n = rng.pick(SYL) + rng.pick(SYL) + (rng.chance(0.5) ? rng.pick(SYL) : ""); return n[0].toUpperCase() + n.slice(1); };

  const features = [];
  if (tags.includes("tailless")) features.push("stumpTail");
  if (tags.includes("scarred") || tags.includes("daring")) features.push("horns");
  if (tags.includes("cautious")) features.push("shell");
  if (tags.includes("toolmaker")) features.push("gears");
  if (tags.includes("mystic")) features.push("glow");
  if (tags.includes("social")) features.push("frills");
  if (tags.includes("hunter") || tags.includes("predator")) features.push("spikes");
  const creatureName = name();
  const worldName = rng.pick(th.world);

  const job = (i, tpl) => ({
    name: th.jobs[i][0], template: tpl, blurb: `Work as a ${th.jobs[i][0].toLowerCase()} in ${worldName}.`,
    good: th.jobs[0][1], bad: th.jobs[0][2], ingredients: th.jobs[2][2], pay: 6 + i * 2
  });
  const npcBody = () => ({ shape: rng.pick(["round", "long", "tall", "blob"]), color: th.accent, accent: "#ffffff", eyes: rng.int(1, 3), limbs: rng.int(0, 4), limbType: rng.pick(["legs", "fins", "tentacles"]), features: [] });

  return {
    creature: {
      name: creatureName,
      description: `A ${tags.includes("tailless") ? "slow, sturdy" : "quick"} creature shaped by ${tags.slice(0, 3).join(", ")} habits.`,
      because: `Because you ${tags.includes("toolmaker") ? "picked up a stick" : tags.includes("grazer") ? "lived on pondweed" : tags.includes("explorer") ? "explored the pond" : "survived the pond your own way"}.`,
      body: {
        shape: tags.includes("tailless") ? "round" : tags.includes("explorer") ? "long" : rng.pick(["round", "tall", "blob", "spiky"]),
        color: rng.pick(["#e0864a", "#5aa7c9", "#9a6ad6", "#6fbf73", "#d65a6a"]),
        accent: th.accent,
        eyes: tags.includes("cautious") ? 3 : rng.int(1, 3),
        limbs: tags.includes("explorer") ? 4 : rng.int(0, 4),
        limbType: tags.includes("skyward") ? "wings" : tags.includes("deep") ? "tentacles" : tags.includes("tailless") ? "legs" : "fins",
        features: features.slice(0, 4)
      }
    },
    world: { name: worldName, description: `A world built around creatures like ${creatureName}.`, props: th.props, ground: th.ground, ground2: th.ground2, accent: th.accent, currency: th.currency },
    npcs: [0, 1, 2].map(i => ({ name: name(), role: ["shopkeeper", "elder", "rival"][i], personality: ["chatty and kind", "slow and wise", "proud and competitive"][i], body: npcBody() })),
    jobs: [job(0, "catch"), job(1, "timing"), job(2, "recipe")],
    oracle: { name: "The Still Pool", form: "a pool of water that talks back" }
  };
}
