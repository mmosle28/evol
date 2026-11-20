// Every prompt the game sends to Claude lives here. Each asks for JSON only, with allowed values spelled out.
// The voice is Doki Doki Universe: playful, slightly absurd, kind, and a little too accurate about you.

import { SHAPES, LIMBS, FEATURES, COLORS } from "../life/schema.js";
import { BIOMES, BIOME_KEYS } from "../gfx/biomes.js";
import { AXES } from "../core/game.js";

const bodySpec = `{"shape": one of ${JSON.stringify(SHAPES)}, "eyes": 1-4, "limbs": 0-6, "limbType": one of ${JSON.stringify(LIMBS)}, "features": up to 4 of ${JSON.stringify(FEATURES)}}`;
const axesSpec = `object with one or two keys from ${JSON.stringify(AXES)}, values -2 to 2`;
const VOICE = `Style: playful, warm, a little absurd, like Doki Doki Universe. Never moralize or judge. Plain words a college student would enjoy. No em dashes.`;
const biomeList = BIOME_KEYS.map(k => `${k} (${BIOMES[k].label})`).join(", ");

/** Evolution: pond behavior in, a creature and its own tiny world out. */
export function lifePrompt(traitLines, seed, pastNames) {
  return `You are the evolution engine of Evol. The player just lived 75 seconds as a fish in a pond.

What the fish did:
${traitLines.map(l => "- " + l).join("\n")}

Seed: ${seed}. Do not reuse: ${pastNames.join(", ") || "none"}.

1. Invent what it evolves into. The body must come from specific pond actions (lost tail: "stumpTail"; bit the pike: horns or spikes; hid a lot: shell or extra eyes; picked up junk: gears; glowing stone: glow; freed a fish or guarded eggs: frills). Surprising and earned, like a Minecraft seed.
2. Invent the open world it evolved into, like a Minecraft seed: hills, valleys, lakes and groves, ringed by ocean. The player will build a town there, Townscaper style, so also pick its building colors: three soft wall colors and one roof color that suit the creature and the land (think Tiny Glade: gentle, warm, never neon). Every life gets its own world, never the same twice, shaped by the creature (what it eats, how it moves, what it survived). Start from a base biome (${biomeList}) for the props, then make it your own: your own sky and ground colors, a particle color, and a short vibe label. Make it beautiful, like a Tiny Glade postcard: harmonious, soft, golden-hour colors. Surprising but tasteful (a peach-sky desert, a misty lilac marsh).
${VOICE}

JSON only:
{"creature": {"name": invented species name, "description": one sentence, "because": one sentence starting "Because you" linking two pond moments to the body, "body": ${bodySpec}, "color": one of ${JSON.stringify(COLORS)}},
 "world": {"biome": key, "name": 1-3 words, "pitch": one line under 16 words, "look": {"sky": ["#top", "#horizon"], "ground": ["#patch1", "#patch2"], "particle": "#hex", "night": boolean, "vibe": 2-3 word label like "Misty Lagoon"}, "palette": {"walls": ["#hex", "#hex", "#hex"], "roof": "#hex"}}}`;
}

/** Tonight's diary page. */
export function diaryPrompt(life, todayLog, answers, axes) {
  return `Game Evol. Write tonight's diary page for a ${life.creature.name} after its first day in its new world, ${life.world.name}, where it spent the day building a town (Townscaper style: tap to add a floor, hold to take one away).

What happened today:
${todayLog.map(l => "- " + l).join("\n") || "- mostly looked around"}

Diary: first person, simple and sincere, small sensory details (the light, the water, the sound of stone), 3 to 5 short sentences about what it actually built.
Then a "sticker": a funny archetype for who they were today (2 to 4 words) and one playful observation about HOW they built.
${VOICE}
JSON only: {"entry": string, "sticker": string, "note": one sentence}`;
}

/** The final reading, with the "receipts" for how the doctor figured it out. */
export function readingPrompt(life, pondLines, log, answers, stats, axes, history) {
  const past = history.map(r => r.reading && r.reading.archetype).filter(Boolean).slice(-8);
  return `Game Evol. The player lived as a fish, evolved into a ${life.creature.name}, woke up in its own world ${life.world.name}, and spent a day building a town there (Townscaper style). You are Dr. Wobble, the game's cheerful personality doctor (like Doctor Therapist in Doki Doki Universe).

As a fish:
${pondLines.map(l => "- " + l).join("\n")}
Building:
${log.map(l => "- " + l.text).join("\n") || "- not much"}
The town in numbers: ${JSON.stringify(stats)} (columns = buildings, floors = total floors, tallest = highest stack out of 7, towers = lone tall stacks, overWater = built on piers, clusters = separate groups of buildings, density = how tightly packed 0-1, removed = floors taken back down, firstAt = seconds before the first stone)
Past archetypes (find something new): ${past.join(", ") || "none"}

Read the person through how they lived and built: tall and proud or low and spread out, one tight village or scattered hamlets, building over water, tearing down and redoing, hesitating before the first stone, and how that echoes what the fish did. Connect at least one pond moment to one building habit.
Write: an archetype (2 to 5 words, funny and memorable), three observations that each connect specific things they did into a pattern they might not have noticed, three short "receipts" (the exact moments or numbers you based this on, each under 14 words), and one open question to think about. Never diagnose, never therapy-speak.
${VOICE}
JSON only: {"archetype": string, "lines": [3 strings under 30 words], "receipts": [3 strings], "question": string}`;
}
