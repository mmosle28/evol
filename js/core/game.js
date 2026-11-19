// Shared game state and the scene state machine.
//
// States: title -> pond -> evolving -> summer (sandbox, 3 days) -> diary (each night) -> summer ...
//         after the last diary page -> reading (who you are) -> pond (new life) or title
// Talking, quiz questions and giving gifts are overlays inside the summer scene, not separate states.

import { newSeed } from "./rng.js";
import { loadHistory } from "./store.js";

export const DAYS = 3;

/** Personality axes the game quietly scores, Doki Doki style. */
export const AXES = ["curious", "kind", "bold", "calm", "social", "playful", "driven"];

export const game = {
  runId: "", seed: 0,
  traits: null,   // pond results (pond.js)
  life: null,     // AI-built creature, world, villagers, quiz objects (evolving.js)
  day: 1,
  log: [],        // everything notable you did after evolving: { day, text }
  answers: [],    // quiz answers: { day, who, question, answer }
  axes: {},       // running personality scores
  diary: [],      // { day, entry, sticker, photo }
  bag: {},        // resource counts
  history: []     // past lives from storage
};

export function newRun(seed = newSeed()) {
  Object.assign(game, { runId: "life-" + Date.now().toString(36), seed, traits: null, life: null, day: 1, log: [], answers: [], diary: [], bag: {}, history: loadHistory() });
  game.axes = Object.fromEntries(AXES.map(a => [a, 0]));
}

/** Nudge personality scores, e.g. score({ kind: 2, bold: -1 }). */
export function score(delta) { for (const [k, v] of Object.entries(delta || {})) if (k in game.axes) game.axes[k] += v; }

export function note(text) { game.log.push({ day: game.day, text }); }

const scenes = {};
let current = null, currentName = "";
export function register(name, scene) { scenes[name] = scene; }
export function go(name, data) {
  if (current && current.exit) current.exit();
  current = scenes[name]; currentName = name;
  if (!current) throw new Error("Unknown scene: " + name);
  if (current.enter) current.enter(data || {});
}
export function sceneName() { return currentName; }
export function updateScene(dt) { if (current && current.update) current.update(dt); }
export function drawScene(g) { if (current && current.draw) current.draw(g); }
