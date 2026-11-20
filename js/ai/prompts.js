// Every prompt the game sends to Claude lives here. Each asks for JSON only, with allowed values spelled out.
// The voice is Doki Doki Universe: playful, slightly absurd, kind, and a little too accurate about you.

import { SHAPES, LIMBS, FEATURES, COLORS, REQUESTS } from "../life/schema.js";
import { BIOMES, BIOME_KEYS, STICKER_IDS, GREETING_IDS } from "../gfx/biomes.js";
import { AXES } from "../core/game.js";

const bodySpec = `{"shape": one of ${JSON.stringify(SHAPES)}, "eyes": 1-4, "limbs": 0-6, "limbType": one of ${JSON.stringify(LIMBS)}, "features": up to 4 of ${JSON.stringify(FEATURES)}}`;
const axesSpec = `object with one or two keys from ${JSON.stringify(AXES)}, values -2 to 2`;
const VOICE = `Style: playful, warm, a little absurd, like Doki Doki Universe. Never moralize or judge. Plain words a college student would enjoy. No em dashes.`;
const biomeList = BIOME_KEYS.map(k => `${k} (${BIOMES[k].label})`).join(", ");

/** Evolution: pond behavior in, a creature and three worlds to choose from out. */
export function lifePrompt(traitLines, seed, pastNames) {
  return `You are the evolution engine of Evol. The player just lived 75 seconds as a fish in a pond.

What the fish did:
${traitLines.map(l => "- " + l).join("\n")}

Seed: ${seed}. Do not reuse: ${pastNames.join(", ") || "none"}.

1. Invent what it evolves into. The body must come from specific pond actions (lost tail: "stumpTail"; bit the pike: horns or spikes; hid a lot: shell or extra eyes; picked up junk: gears; glowing stone: glow; freed a fish or guarded eggs: frills). Surprising and earned, like a Minecraft seed.
2. Offer three tiny planets it could move to, each a different biome from: ${biomeList}. Pick biomes that fit different sides of how it lived. Give each a playful name and a one-line pitch that teases the vibe.
${VOICE}

JSON only:
{"creature": {"name": invented species name, "description": one sentence, "because": one sentence starting "Because you" linking two pond moments to the body, "body": ${bodySpec}, "color": one of ${JSON.stringify(COLORS)}},
 "worlds": [3 x {"biome": key, "name": 1-3 words, "pitch": under 16 words}]}`;
}

/** The chosen planet, filled with Doki Doki Universe style characters and two quiz moths. */
export function worldPrompt(life, world, traitLines) {
  return `Game Evol. A ${life.creature.name} (${life.creature.description}) just moved to the tiny planet "${world.name}" (${BIOMES[world.biome].label}: ${world.pitch}).
How it lived as a fish: ${traitLines.slice(0, 8).join("; ")}.

Fill the planet like a Doki Doki Universe planet. Every resident has an identity card: what they like and dislike (from a fixed set of summonable stickers), how they like to be greeted, and one request.
- 4 residents who fit this biome, each with a vivid personality and a small problem.
- likes and dislikes: 2 each from ${JSON.stringify(STICKER_IDS)}. Make some funny contrasts (one resident adores ghosts, another is terrified of them).
- greeting: one of ${JSON.stringify(GREETING_IDS)}.
- request.type: one of ${JSON.stringify(REQUESTS)}. sticker = wants to be shown one of their likes (target = that sticker id); bring = wants to meet another resident, the player must carry them over (target = that resident's index 0-3); fly = wants to be thrown into the sky; greet = wants a proper greeting. Use at least three different types.
- lines, all in their own voice: hello (first meeting, under 20 words), ask (their request, hinting at what they need without naming the sticker id, under 24 words), thanks (under 16 words), liked (reaction to a sticker they love, under 10 words), disliked (to one they hate, under 10 words), tossed (when picked up and thrown, under 10 words).
- 2 quiz moths (tiny monks floating near the planet, like Doki Doki Universe asteroid quizzes). Each asks 3 picture questions: everyday and slightly absurd ("What are the rats doing in this picture?", "Without thinking, pick a picture", "Choose a caption"). Each question has a "pic" of 1 to 3 emoji, and 3 answers, each with its own emoji "pic", a short "text", an "axes" score (${axesSpec}) and the moth's one-line "reply".
${VOICE}

JSON only:
{"name": "${world.name}", "description": one sentence,
 "npcs": [4 x {"name": short, "role": short, "personality": one sentence, "body": ${bodySpec}, "color": one of ${JSON.stringify(COLORS)}, "greeting": string, "likes": [2], "dislikes": [2], "lovesFlying": boolean, "request": {"type": string, "target": string or number}, "lines": {"hello": s, "ask": s, "thanks": s, "liked": s, "disliked": s, "tossed": s}}],
 "quiz": [2 x {"name": moth name, "questions": [3 x {"q": under 14 words, "pic": emoji, "answers": [3 x {"text": under 7 words, "pic": one emoji, "axes": object, "reply": under 14 words}]}]}]}`;
}

/** Tonight's diary page, with a Doki Doki sticker. */
export function diaryPrompt(life, todayLog, answers, axes) {
  return `Game Evol. Write tonight's diary page for a ${life.creature.name} after its first day on the tiny planet ${life.world.name}.

What happened today:
${todayLog.map(l => "- " + l).join("\n") || "- mostly wandered around the planet"}
Odd questions answered: ${answers.map(a => `"${a.question}" -> "${a.answer}"`).join("; ") || "none"}

Diary: first person, like a kid's diary: simple, sincere, small sensory details, 3 to 5 short sentences about the real events above, naming the residents.
Then a Doki Doki Universe "sticker": a funny archetype for who they were today (2 to 4 words) and one playful observation that connects two unrelated things they did into a surprising pattern.
${VOICE}
JSON only: {"entry": string, "sticker": string, "note": one sentence}`;
}

/** The final reading, Doki Doki style, with the "receipts" for how the doctor figured it out. */
export function readingPrompt(life, pondLines, log, answers, stats, axes, history) {
  const past = history.map(r => r.reading && r.reading.archetype).filter(Boolean).slice(-8);
  return `Game Evol. The player lived as a fish, evolved into a ${life.creature.name}, chose the planet ${life.world.name} (${BIOMES[life.world.biome].label}) and spent a day with its residents. You are Dr. Wobble, the game's cheerful personality doctor (like Doctor Therapist in Doki Doki Universe).

As a fish:
${pondLines.map(l => "- " + l).join("\n")}
On the planet:
${log.map(l => "- " + l.text).join("\n") || "- not much"}
How they treated people: ${JSON.stringify(stats)}
Quiz answers: ${answers.map(a => `"${a.question}" -> "${a.answer}"`).join("; ") || "none"}
Scores: ${JSON.stringify(axes)}
Past archetypes (find something new): ${past.join(", ") || "none"}

Write: an archetype (2 to 5 words, funny and memorable), three observations that each connect specific things they did into a pattern they might not have noticed (at least one about how they treated residents: reading cards first or winging it, pranking with stickers they knew were hated, tossing people, finishing requests), three short "receipts" (the exact moments you based this on, each under 14 words), and one open question to think about. Never diagnose, never therapy-speak.
${VOICE}
JSON only: {"archetype": string, "lines": [3 strings under 30 words], "receipts": [3 strings], "question": string}`;
}
