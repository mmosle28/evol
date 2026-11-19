// Every prompt the game sends to Claude lives here, so the AI's role is easy to read in one place.
// Each prompt asks for JSON only and says exactly which fields and values are allowed.

import { SHAPES, LIMBS, FEATURES, PROPS } from "../life/schema.js";

const bodySpec = `{"shape": one of ${JSON.stringify(SHAPES)}, "color": "#rrggbb", "accent": "#rrggbb", "eyes": 1-4, "limbs": 0-6, "limbType": one of ${JSON.stringify(LIMBS)}, "features": up to 4 of ${JSON.stringify(FEATURES)}}`;

/** Evolution: pond behavior in, a whole new creature and world out. */
export function lifePrompt(traitLines, seed, pastNames) {
  return `You are the evolution engine of a video game called Evol. The player spent 75 seconds as a small fish in a pond.
Here is exactly what they did:
${traitLines.map(l => "- " + l).join("\n")}

Random seed for variety: ${seed}. Avoid repeating these past creatures and worlds: ${pastNames.join(", ") || "none"}.

Invent what this fish evolves into. Rules:
- The creature must clearly come from what the player did. Lost tail: it has no tail or a stump ("stumpTail"), and it adapted (slow but armored, walks instead of swims, and so on). Ate plants: grazer. Ate bugs or minnows: hunter. Picked up a stick: tool user, and the world is mechanical or crafted. Glowing stone: mystical world. Hid a lot: cautious features like a shell or extra eyes. Near the pike a lot: bold features like horns or spikes. Swam with the school: social. Explored a lot: built for travel.
- Be surprising and specific, not generic. It should feel random but earned, like a Minecraft seed.
- The world is shaped by the creature: what it eats, how it moves, what it's good at.
- Three jobs, one per mini-game type: "catch" (things fall, catch the good ones, dodge the bad ones), "timing" (press at the exact right moment, like forging or casting), "recipe" (pick ingredients in the right order). Themed to the world.
- Three NPCs who live there, each with a clear personality.
- Plain, playful language a college student would enjoy. No em dashes.

Return JSON only:
{"creature": {"name": short invented species name, "description": one sentence, "because": one sentence starting "Because you" linking 2 specific pond actions to its body, "body": ${bodySpec}},
 "world": {"name": short, "description": one sentence, "props": one of ${JSON.stringify(PROPS)}, "ground": "#rrggbb" (dark, readable under light text), "ground2": "#rrggbb" (slightly lighter), "accent": "#rrggbb" (bright), "currency": one plural word},
 "npcs": [3 x {"name": short, "role": short job title, "personality": one sentence, "body": ${bodySpec}}],
 "jobs": [{"template":"catch","name":job title,"blurb":one sentence,"good":[3 short item names],"bad":[2 short item names],"pay":5-15},
          {"template":"timing","name":job title,"blurb":one sentence,"pay":5-15},
          {"template":"recipe","name":job title,"blurb":one sentence,"ingredients":[5 short ingredient names],"pay":5-15}],
 "oracle": {"name": short, "form": what it looks like in this world, a few words}}`;
}

/** A small moral choice at the end of a job. */
export function dilemmaPrompt(life, job, pastChoices) {
  return `Video game Evol. The player is a ${life.creature.name} (${life.creature.description}) living in ${life.world.name} (${life.world.description}).
They just finished a shift as ${job.name}: ${job.blurb}
Choices they already made: ${pastChoices.slice(-6).map(c => c.picked).join("; ") || "none yet"}.

Write one small dilemma that comes up at the end of this shift. It should be about a real value tradeoff (honesty, loyalty, ambition, kindness, risk, fairness, freedom), not a right or wrong answer, and it should be different from their past choices. Plain language, no em dashes.
Return JSON only: {"prompt": one or two sentences, max 30 words, "a": option under 7 words, "b": option under 7 words}`;
}

/** NPC conversation. */
export function talkPrompt(life, npc, choices, met) {
  return `Video game Evol. You are ${npc.name}, the ${npc.role} in ${life.world.name}. Personality: ${npc.personality}
The player is a ${life.creature.name}: ${life.creature.description} ${life.creature.because}
Things the player has chosen so far: ${choices.slice(-6).map(c => c.picked).join("; ") || "nothing yet"}.
${met ? "You have talked before. Pick up where you left off." : "This is your first time meeting."}

Say one thing in character (under 30 words) that reacts to who the player is or what they've done, and ends with a question. Then give two short replies the player could choose (under 7 words each) that reveal different values, and your answer to each (under 22 words). No em dashes.
Return JSON only: {"line": string, "a": string, "b": string, "replyA": string, "replyB": string}`;
}

/** The Oracle reads the whole run (and past runs) and offers a new insight every time. */
export function oraclePrompt(life, traitLines, choices, history) {
  const past = history.flatMap(r => (r.insights || []).map(i => `${i.title}: ${i.text}`)).slice(-8);
  return `Video game Evol. You are ${life.oracle.name}, ${life.oracle.form}, in ${life.world.name}. You give the player a reflection about themselves, in the playful, gentle spirit of Doki Doki Universe. You are philosophical, never clinical: no diagnoses, no therapy talk, no labels like disorders.

How they lived as a fish:
${traitLines.map(l => "- " + l).join("\n")}
What they became: ${life.creature.name}. ${life.creature.because}
Choices since evolving:
${choices.map(c => `- At ${c.where}: "${c.prompt}" They chose "${c.picked}" over "${c.other}".`).join("\n") || "- none yet"}

Insights already given in earlier lives (do NOT repeat these, find something new):
${past.map(p => "- " + p).join("\n") || "- none"}

Connect at least two specific things they did into one new observation about how they move through life. Warm, a little surprising, specific to their actions. Then one open question to think about. No em dashes.
Return JSON only: {"title": 2 to 5 words, "insight": 2 or 3 sentences, "question": one sentence}`;
}
