// Every prompt the game sends to Claude lives here. Each asks for JSON only, with allowed values spelled out.
// The voice: Boku no Natsuyasumi (a quiet, nostalgic summer) + Doki Doki Universe (playful, slightly absurd
// personality reads that catch you off guard instead of judging single actions).

import { SHAPES, LIMBS, FEATURES, PROPS } from "../life/schema.js";
import { QUIZ_KINDS } from "../gfx/models.js";
import { AXES } from "../core/game.js";

const bodySpec = `{"shape": one of ${JSON.stringify(SHAPES)}, "eyes": 1-4, "limbs": 0-6, "limbType": one of ${JSON.stringify(LIMBS)}, "features": up to 4 of ${JSON.stringify(FEATURES)}}`;
const axesSpec = `an object using only these keys: ${JSON.stringify(AXES)}, values -2 to 2, one or two keys`;

const VOICE = `Style rules: playful, warm, a little absurd, like Doki Doki Universe. Never moralize or judge. Never say "because you did X you are Y". Plain words a college student would enjoy. No em dashes.`;

/** Evolution: pond behavior in, a creature and a summer village out. */
export function lifePrompt(traitLines, seed, pastNames) {
  return `You are the evolution engine of Evol, a game where the player lived 75 seconds as a fish, then evolves and spends three summer days in a village, in the spirit of Boku no Natsuyasumi.

What the fish did:
${traitLines.map(l => "- " + l).join("\n")}

Seed for variety: ${seed}. Do not reuse these past names: ${pastNames.join(", ") || "none"}.

Invent what it evolves into and the summer village it lives in.
- The body must come from specific pond actions (lost tail: "stumpTail" and it adapted; bit the pike: horns or spikes; hid a lot: shell or extra eyes; picked up a stick or bottle cap: a tinkerer and a crafty village; glowing stone: mystical village; freed a fish or guarded eggs: gentle; stood still a lot: calm). Surprising and specific, earned like a Minecraft seed.
- The village is a sleepy summer countryside place shaped by the creature: what it eats, how it moves.
- 3 resources found on the ground, 2 small critters to catch (like bugs in Boku no Natsuyasumi), a village project the whole village is building.
- 4 villagers with distinct personalities. Each wants some amount of one resource (index 0-2) and says why in one line.
- 6 odd talking objects that each ask the player one Doki Doki Universe style question: everyday and slightly absurd, like "How do you usually eat watermelon?" or "A cloud looks exactly like you. What do you do?". Three short, funny answers each, every answer quietly scores personality, plus the object's one-line reaction to that answer.
${VOICE}

Return JSON only:
{"creature": {"name": short invented species name, "description": one sentence, "because": one sentence starting "Because you" that links two specific pond moments to the body, "body": ${bodySpec}},
 "world": {"name": short village name, "description": one sentence, "props": one of ${JSON.stringify(PROPS)}, "project": short name of the thing the village is building, "projectNeeds": 6-12},
 "resources": [3 short item names],
 "critters": [2 x {"name": short critter name}],
 "villagers": [4 x {"name": short, "role": short, "personality": one sentence, "body": ${bodySpec}, "wants": 0-2, "count": 1-4, "request": one sentence in their voice}],
 "quiz": [6 x {"kind": one of ${JSON.stringify(QUIZ_KINDS)}, "name": what it is, a few words, "question": under 18 words, "answers": [3 x {"text": under 8 words, "axes": ${axesSpec}, "reply": under 14 words}]}]}`;
}

/** Talking to a villager, in character. Their two replies quietly score personality too. */
export function talkPrompt(life, v, recent, met) {
  return `Game Evol, summer village ${life.world.name}. You are ${v.name}, the ${v.role}. Personality: ${v.personality}
The player is a ${life.creature.name}. ${life.creature.because}
What the player did recently: ${recent.slice(-5).join("; ") || "just arrived"}.
${met ? "You've talked before; continue naturally." : "First meeting."} If it fits, mention you want ${v.count} ${life.resources[v.wants]}.

Say one line in character (under 28 words) that notices something specific about the player and ends with a small question. Then two replies the player could pick (under 7 words), what you say back to each (under 20 words), and how each reply scores personality (${axesSpec}).
${VOICE}
Return JSON only: {"line": string, "a": string, "b": string, "replyA": string, "replyB": string, "axesA": object, "axesB": object}`;
}

/** The nightly diary page (Boku no Natsuyasumi) with a Doki Doki sticker. */
export function diaryPrompt(life, day, todayLog, answers, axes, history) {
  const pastStickers = history.flatMap(r => (r.diary || []).map(d => d.sticker)).slice(-10);
  return `Game Evol. Write tonight's diary page for a ${life.creature.name} spending summer in ${life.world.name}. Day ${day} of 3.

What happened today:
${todayLog.map(l => "- " + l).join("\n") || "- not much, mostly walking around"}
Odd questions answered today:
${answers.map(a => `- ${a.who} asked "${a.question}" and they said "${a.answer}"`).join("\n") || "- none"}
Personality scores so far: ${JSON.stringify(axes)}

Diary: first person, like a kid's summer diary in Boku no Natsuyasumi: simple, sincere, nostalgic, small sensory details (cicadas, heat, the sky). 3 to 5 short sentences about the real events above.
Then a Doki Doki Universe "sticker": a funny archetype name for who they were today (2 to 4 words, like "The Watermelon Diplomat"), and one playful observation that connects two unrelated things they did into one surprising pattern. Not a moral judgment, not a summary. Avoid these past stickers: ${pastStickers.join(", ") || "none"}.
${VOICE}
Return JSON only: {"entry": string, "sticker": string, "note": one sentence}`;
}

/** The final reading after three days: who you are, Doki Doki style. Never repeats past lives. */
export function readingPrompt(life, pondLines, log, answers, axes, history) {
  const past = history.map(r => r.reading && r.reading.archetype).filter(Boolean).slice(-8);
  return `Game Evol. The player lived as a fish, evolved into a ${life.creature.name}, and spent three summer days in ${life.world.name}. Give them a personality reading in the style of Doki Doki Universe: playful, specific, slightly absurd, kind, and a little too accurate.

As a fish:
${pondLines.map(l => "- " + l).join("\n")}
In the village:
${log.map(l => `- Day ${l.day}: ${l.text}`).join("\n") || "- not much"}
Odd questions they answered:
${answers.map(a => `- "${a.question}" -> "${a.answer}"`).join("\n") || "- none"}
Personality scores: ${JSON.stringify(axes)}
Archetypes given in past lives (do not repeat; find something new): ${past.join(", ") || "none"}

Write: an archetype name (2 to 5 words, funny and memorable), three short observations that each connect specific things they did (one from the pond, one from the village, one from a quiz answer) into a pattern they might not have noticed, and one open question to think about. Never diagnose, never therapy-speak.
${VOICE}
Return JSON only: {"archetype": string, "lines": [3 strings, each under 30 words], "question": string}`;
}
