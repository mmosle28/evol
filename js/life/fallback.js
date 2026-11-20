// Offline versions of everything the AI writes, used only if the AI can't answer.
// Simpler than the AI's, but built from the same traits and the same rules, so the game still makes sense.

import { makeRng } from "../core/rng.js";
import { traitTags } from "./traits.js";
import { BIOMES, STICKER_IDS, GREETING_IDS, STICKERS } from "../gfx/biomes.js";
import { COLORS } from "./schema.js";

const SYL = ["ko", "ra", "vel", "mo", "thi", "zan", "ul", "pe", "dra", "su", "gor", "lu", "fen", "ka", "ri", "osh", "mi", "to"];
const TAG_BIOMES = { toolmaker: ["suburb", "sunset"], mystic: ["spooky", "bayou"], predator: ["desert", "jungle"], hunter: ["jungle", "pines"], grazer: ["bayou", "harbor"], explorer: ["harbor", "jungle"], cautious: ["pines", "harbor"], social: ["suburb", "sunset"], fighter: ["desert", "spooky"], tailless: ["bayou", "pines"], guardian: ["harbor", "suburb"], patient: ["pines", "bayou"], fasting: ["desert", "spooky"] };
const WORLD_NAMES = { bayou: "Gumbo Hollow", desert: "Mesa Mia", suburb: "Sprinkle Lane", spooky: "Batbourne", harbor: "Maple Cove", sunset: "Sunset Strip", pines: "Pinecone Peak", jungle: "Ruinwood" };
const PITCH = { bayou: "Fireflies, frogs, and somebody's grandma's gumbo.", desert: "Hot days, cool cacti, zero shade.", suburb: "Pastel houses and neighbors who notice everything.", spooky: "Always night. Everyone's a little dramatic.", harbor: "Falling leaves and a lighthouse that hums.", sunset: "Palm trees, pools, and permanent golden hour.", pines: "Tall trees, tents, and very loud owls.", jungle: "Big leaves, old ruins, louder birds." };
const RESIDENTS = {
  bayou: [["Gator Pete", "boat mechanic"], ["Mama Okra", "gumbo chef"], ["Lil Firefly", "night light"], ["Reverend Toad", "choir leader"]],
  desert: [["Dusty", "cactus farmer"], ["Mirage", "lizard poet"], ["Big Mesa", "rock collector"], ["Sol", "sunscreen salesman"]],
  suburb: [["Karen Mint", "HOA president"], ["Biscuit", "paperboy"], ["Mrs. Pudding", "retired dancer"], ["Chad Lawn", "lawn enthusiast"]],
  spooky: [["Count Socks", "vampire, vegetarian"], ["Wisp", "shy ghost"], ["Pumpkin Jack", "gourd poet"], ["Granny Bat", "night baker"]],
  harbor: [["Captain Maple", "retired sailor"], ["Cocoa", "cider stand kid"], ["Mr. Lighthouse", "keeper of the light"], ["Clamdy", "clam with opinions"]],
  sunset: [["Vinny Vibes", "skateboard DJ"], ["Coco Palm", "influencer"], ["Pool Noodle", "lifeguard"], ["Mama Taco", "food truck legend"]],
  pines: [["Ranger Rue", "park ranger"], ["Bearnice", "bear, hiker"], ["Owlbert", "night owl, literally"], ["Scout", "marshmallow expert"]],
  jungle: [["Professor Vine", "ruins explorer"], ["Mango", "parrot gossip"], ["Old Stone", "talking statue"], ["Zuzu", "tree frog drummer"]]
};
const PERSONALITY = ["Talks a lot, notices everything, means well.", "Shy until you make them laugh.", "Dramatic about tiny things, chill about huge things.", "Always busy, always late, always smiling."];

// Doki Doki style picture questions. Each answer nudges personality axes.
const QUIZ = [
  { q: "What are the rats doing in this picture?", pic: "🐀🎂🐀", a: [["Throwing a party", "🎉", { social: 1, playful: 1 }, "Rats deserve parties too."], ["Stealing the cake", "🏃", { bold: 1, playful: 1 }, "A heist. Classic."], ["Waiting their turn", "⏳", { calm: 1, kind: 1 }, "Very polite rats."]] },
  { q: "Without thinking, pick a picture.", pic: "❓", a: [["A volcano", "🌋", { bold: 2 }, "Hot. Loud. Noted."], ["A bubble bath", "🛁", { calm: 2 }, "Ah. Relaxing."], ["A circus", "🎪", { playful: 1, social: 1 }, "Of course you did."]] },
  { q: "How do you usually eat watermelon?", pic: "🍉", a: [["Seeds and all", "😤", { bold: 1, playful: 1 }, "Fearless."], ["Remove every seed", "🔍", { driven: 1, calm: 1 }, "So patient."], ["Share it with everyone", "🤝", { kind: 1, social: 1 }, "Watermelon is a group project."]] },
  { q: "A cloud looks exactly like you. You...", pic: "☁️", a: [["Wave at it", "👋", { playful: 1, social: 1 }, "It waved back. Probably."], ["Take a picture", "📸", { curious: 1, driven: 1 }, "Evidence matters."], ["Wonder if you look like a cloud", "🤔", { curious: 1, calm: 1 }, "Deep. Very deep."]] },
  { q: "A snowman is crying. Why?", pic: "☃️💧", a: [["He's melting", "🌞", { curious: 1 }, "Science is cruel."], ["Someone took his nose", "🥕", { kind: 1, bold: 1 }, "We must find the nose."], ["Happy tears", "🥲", { kind: 1, calm: 1 }, "What a soft guess."]] },
  { q: "Choose a caption for this picture.", pic: "🐧🏖️", a: [["Finally, a vacation", "😎", { calm: 1, playful: 1 }, "He earned it."], ["Wrong flight", "✈️", { curious: 1, playful: 1 }, "It happens to everyone."], ["Training for summer", "💪", { driven: 2 }, "The grind never stops."]] },
  { q: "Pick a box. Don't overthink it.", pic: "🎁📦🧰", a: [["The pretty one", "🎁", { playful: 1, social: 1 }, "Presentation is everything."], ["The plain one", "📦", { calm: 1, curious: 1 }, "Mystery boxes are better."], ["The toolbox", "🧰", { driven: 1, bold: 1 }, "Ready to fix anything."]] },
  { q: "The ice cream truck is leaving. You...", pic: "🍦🚚", a: [["Sprint after it", "🏃", { bold: 1, driven: 1 }, "Speed is a kind of love."], ["Let it go", "🧘", { calm: 2 }, "There's always tomorrow."], ["Yell for everyone", "📣", { social: 2 }, "A leader of snacks."]] },
  { q: "Which superhero would you be?", pic: "🦸", a: [["The one who flies", "🕊️", { curious: 1, bold: 1 }, "Up, up and away."], ["The one who's invisible", "🫥", { calm: 1, curious: 1 }, "We can't see you nodding."], ["The one who heals", "💖", { kind: 2 }, "The team needs you."]] }
];

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
    worlds: picks.slice(0, 3).map(b => ({ biome: b, name: WORLD_NAMES[b], pitch: PITCH[b] }))
  };
}

export function fallbackWorld(world, seed) {
  const rng = makeRng(seed ^ 0x27d4eb2d);
  const ids = [...STICKER_IDS].sort(() => rng() - 0.5);
  const types = ["sticker", "bring", "fly", "greet"].sort(() => rng() - 0.5);
  const npcs = RESIDENTS[world.biome].map(([nm, role], i) => {
    const likes = [ids[i * 2], ids[i * 2 + 1]], dislikes = [ids[(i * 2 + 9) % ids.length], ids[(i * 2 + 10) % ids.length]];
    const greeting = GREETING_IDS[(i + Math.floor(rng() * 4)) % 4];
    const type = types[i];
    const target = type === "sticker" ? likes[0] : type === "bring" ? (i + 1) % 4 : type === "greet" ? greeting : null;
    const ask = {
      sticker: `I've been in a mood all week. Something like ${STICKERS[likes[0]][1]} would fix it. Just saying.`,
      bring: `I've never met ${RESIDENTS[world.biome][(i + 1) % 4][0]}. Could you carry them over here? I'm too nervous to walk over.`,
      fly: "I've always wanted to touch the sky. You look strong. Throw me? Please?",
      greet: "Nobody here greets each other properly anymore. Do you even know how?"
    }[type];
    return {
      name: nm, role, personality: PERSONALITY[i],
      body: { shape: rng.pick(["round", "tall", "blob", "long", "spiky"]), eyes: rng.int(1, 3), limbs: rng.int(0, 4), limbType: rng.pick(["legs", "tentacles", "fins", "wings"]), features: [rng.pick(["antennae", "frills", "horns", "shell"])] },
      color: rng.pick(COLORS), greeting, likes, dislikes, lovesFlying: type === "fly" || rng.chance(0.3),
      request: { type, target },
      lines: { hello: `Oh! A new face on ${world.name}! I'm ${nm}, the ${role}.`, ask, thanks: "You actually did it! Here, I want you to have this.", liked: "Oh I LOVE that!", disliked: "Ugh. Get that away from me.", tossed: rng.pick(["WHEEE!", "Put me down!", "I can see my house!"]) }
    };
  });
  const q = [...QUIZ].sort(() => rng() - 0.5);
  const toQ = x => ({ q: x.q, pic: x.pic, answers: x.a.map(([text, pic, axes, reply]) => ({ text, pic, axes, reply })) });
  return { name: world.name, description: PITCH[world.biome], npcs, quiz: [{ name: "Moth Monk", questions: q.slice(0, 3).map(toQ) }, { name: "Professor Puddle", questions: q.slice(3, 6).map(toQ) }] };
}

export function fallbackDiary(log) {
  const things = log.slice(-4).map(l => l.text[0].toLowerCase() + l.text.slice(1).replace(/\.$/, ""));
  return {
    entry: `Day one. ${things.length ? "Today I " + things.join(", then I ") + "." : "Today I mostly walked around the whole planet. It only took a minute."} Everyone here is a little strange. I think I like it.`,
    sticker: "The New Kid",
    note: "You collect people the way other creatures collect shiny rocks."
  };
}

export function fallbackReading(axes, stats) {
  const top = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  const names = { curious: "Door Opener", kind: "Umbrella Holder", bold: "Thunder Jar", calm: "Still Pond", social: "Bonfire Starter", playful: "Puddle Jumper", driven: "Early Bird" };
  const receipts = [];
  if (stats.cardsRead) receipts.push(`You checked ${stats.cardsRead} identity card${stats.cardsRead > 1 ? "s" : ""} before acting.`);
  if (stats.pranks) receipts.push(`You showed someone a sticker you knew they hated.`);
  if (stats.tosses) receipts.push(`You threw ${stats.tosses} resident${stats.tosses > 1 ? "s" : ""} into the sky.`);
  if (stats.requestsDone) receipts.push(`You finished ${stats.requestsDone} request${stats.requestsDone > 1 ? "s" : ""}.`);
  if (stats.greetRight) receipts.push(`You greeted ${stats.greetRight} resident${stats.greetRight > 1 ? "s" : ""} exactly how they like.`);
  while (receipts.length < 3) receipts.push(["You took your time in the pond.", "You picked a planet in a few seconds.", "You answered the moths without stalling."][receipts.length]);
  return {
    archetype: `The ${names[top[0][0]]}`,
    lines: [
      `Your strongest pull was being ${top[0][0]}, with a streak of ${top[1][0]} right behind it.`,
      stats.cardsRead > stats.pranks ? "You like to know people before you act around them. Residents noticed." : "You act first and learn about people later. It makes things interesting.",
      `You were least ${top[top.length - 1][0]}. That's not a flaw, it's where you have room to surprise yourself.`
    ],
    receipts: receipts.slice(0, 3),
    question: "What would you do differently if nobody was keeping score?"
  };
}
