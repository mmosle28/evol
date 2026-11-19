// Offline versions of everything the AI writes, used only if the AI can't answer.
// Simpler than the AI's, but built from the same traits so the game still makes sense.

import { makeRng } from "../core/rng.js";
import { traitTags } from "./traits.js";
import { QUIZ_KINDS } from "../gfx/models.js";

const SYL = ["ko", "ra", "vel", "mo", "thi", "zan", "ul", "pe", "dra", "su", "gor", "lu", "fen", "ka", "ri", "osh", "mi", "to"];
const THEMES = {
  toolmaker: { props: "gears", world: "Kanemachi", res: ["copper coil", "bent nail", "glass bead"], project: "the clock tower" },
  mystic: { props: "crystals", world: "Hoshizora", res: ["moon pebble", "glow moss", "star shard"], project: "the night shrine" },
  hunter: { props: "trees", world: "Tonbo Hill", res: ["river reed", "smooth stone", "pine cone"], project: "the lookout" },
  predator: { props: "bones", world: "Kibagawa", res: ["old bone", "red clay", "driftwood"], project: "the long bridge" },
  grazer: { props: "mushrooms", world: "Nohara", res: ["clover", "wild berry", "soft moss"], project: "the community garden" },
  explorer: { props: "pipes", world: "Kazemura", res: ["paper map", "feather", "sea glass"], project: "the signal tower" }
};

// Doki Doki style questions: everyday and a little absurd. Each answer nudges personality axes.
const QUIZ = [
  { q: "How do you usually eat watermelon?", a: [["Seeds and all, no regrets", { bold: 1, playful: 1 }, "Fearless. The seeds respect you."], ["Carefully remove every seed", { calm: 1, driven: 1 }, "Patience like that is rare."], ["Share it with whoever's around", { kind: 1, social: 1 }, "A watermelon is a group project anyway."]] },
  { q: "A cloud looks exactly like you. What do you do?", a: [["Wave at it", { playful: 1, social: 1 }, "It waved back. Probably."], ["Take a picture for proof", { curious: 1, driven: 1 }, "Evidence is important."], ["Wonder if you look like a cloud", { calm: 1, curious: 1 }, "Deep. Very deep."]] },
  { q: "You find a door in a field with nothing behind it. Do you open it?", a: [["Obviously", { bold: 1, curious: 1 }, "Of course you did."], ["Knock first", { kind: 1, calm: 1 }, "Polite, even to doors."], ["Leave it closed. Some doors are fine", { calm: 1 }, "Wise. Or scared. Who knows."]] },
  { q: "If you could only say one word all summer, which?", a: [["Again!", { playful: 1, driven: 1 }, "A summer that never ends."], ["Thanks", { kind: 1, social: 1 }, "Everyone would like you."], ["Why?", { curious: 2 }, "You'd drive everyone a little crazy."]] },
  { q: "The ice cream truck is leaving. You...", a: [["Sprint after it", { bold: 1, driven: 1 }, "Speed is a kind of love."], ["Let it go. There's always tomorrow", { calm: 1 }, "Very zen of you."], ["Yell for everyone to come", { social: 2 }, "A true leader of snacks."]] },
  { q: "Which would you rather keep forever: a jar of fireflies or a jar of thunder?", a: [["Fireflies", { kind: 1, calm: 1 }, "Soft light, soft heart."], ["Thunder", { bold: 2 }, "Loud. Interesting."], ["Open both and see what happens", { curious: 1, playful: 1 }, "Chaos, but educational."]] }
];

export function fallbackLife(traits, seed) {
  const rng = makeRng(seed ^ 0x5bd1e995);
  const tags = traitTags(traits);
  const key = ["toolmaker", "mystic", "predator", "hunter", "grazer", "explorer"].find(k => tags.includes(k)) || "explorer";
  const th = THEMES[key];
  const name = () => { const n = rng.pick(SYL) + rng.pick(SYL) + (rng.chance(0.4) ? rng.pick(SYL) : ""); return n[0].toUpperCase() + n.slice(1); };
  const features = [];
  if (tags.includes("tailless")) features.push("stumpTail");
  if (tags.includes("fighter")) features.push("horns");
  if (tags.includes("cautious")) features.push("shell");
  if (tags.includes("toolmaker")) features.push("gears");
  if (tags.includes("mystic")) features.push("glow");
  if (tags.includes("social")) features.push("frills");
  if (tags.includes("predator") || tags.includes("hunter")) features.push("spikes");
  const nm = name();
  const order = [...QUIZ].sort(() => rng() - 0.5);
  return {
    creature: {
      name: nm,
      description: `A ${tags.includes("tailless") ? "slow, sturdy" : "quick"} little creature that grew out of a ${tags[0]} fish.`,
      because: tags.includes("tailless") ? "Because you lost your tail and kept going, you walk on sturdy legs now." : `Because you lived as a ${tags[0]}, your body leaned that way.`,
      body: { shape: tags.includes("tailless") ? "round" : tags.includes("explorer") ? "long" : rng.pick(["round", "tall", "blob", "spiky"]), eyes: tags.includes("cautious") ? 3 : 2, limbs: tags.includes("explorer") ? 4 : 2, limbType: tags.includes("tailless") ? "legs" : rng.pick(["legs", "fins", "wings"]), features: features.slice(0, 4) }
    },
    world: { name: th.world, description: `A sleepy summer village where creatures like ${nm} live.`, props: th.props, project: th.project, projectNeeds: 9 },
    resources: th.res,
    critters: [{ name: "summer hopper" }, { name: "dusk buzzer" }],
    villagers: [0, 1, 2, 3].map(i => ({ name: name(), role: ["shopkeeper", "old fisher", "kid next door", "mail carrier"][i], personality: ["chatty and kind", "slow and wise", "loud and restless", "always late, always smiling"][i], body: { shape: rng.pick(["round", "tall", "blob", "long"]), eyes: rng.int(1, 3), limbs: rng.int(0, 4), limbType: rng.pick(["legs", "tentacles", "fins"]), features: [] }, wants: i % 3, count: 2 + (i % 3), request: "" })),
    quiz: order.map((q, i) => ({ kind: QUIZ_KINDS[i % QUIZ_KINDS.length], name: ["a talking watermelon", "an old vending machine", "a red mailbox", "a scarecrow", "a dusty radio", "a temple bell"][i % 6], question: q.q, answers: q.a.map(([text, axes, reply]) => ({ text, axes, reply })) }))
  };
}

export function fallbackTalk(v, life) {
  return {
    line: `Oh, a ${life.creature.name}! I'm ${v.name}. Hot one today, huh? What brings you out this way?`,
    a: "Just wandering", b: "Looking for something to do",
    replyA: "Wandering's the best part of summer.", replyB: `Then help me find some ${life.resources[v.wants]}, would you?`,
    axesA: { calm: 1 }, axesB: { driven: 1 }
  };
}

export function fallbackDiary(day, log) {
  const things = log.filter(l => l.day === day).slice(-4).map(l => l.text.toLowerCase());
  return {
    entry: `Day ${day}. ${things.length ? "Today I " + things.join(", then I ") + "." : "Today I mostly walked around and looked at the sky."} The cicadas were so loud. I want tomorrow to come fast.`,
    sticker: "The Wanderer",
    note: "You seem to collect moments more than things."
  };
}

export function fallbackReading(axes) {
  const top = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  const names = { curious: "Door Opener", kind: "Umbrella Holder", bold: "Thunder Jar", calm: "Still Pond", social: "Bonfire Starter", playful: "Puddle Jumper", driven: "Early Bird" };
  return {
    archetype: `The ${names[top[0][0]]}`,
    lines: [
      `Your strongest pull was being ${top[0][0]}, with a streak of ${top[1][0]} right behind it.`,
      `You were least ${top[top.length - 1][0]}. That's not a flaw, it's where you have room to surprise yourself.`,
      "Next summer, try doing the thing you'd normally skip."
    ],
    question: "What would you do differently if nobody was keeping score?"
  };
}
