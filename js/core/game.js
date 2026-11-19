// The game's shared state and the scene state machine.
//
// States (see the flowchart in README.md):
//   title -> pond -> evolving -> world <-> job | talk | oracle
//   oracle -> pond (evolve again, new seed)
//
// Each scene is an object with optional enter(data), update(dt), draw(g), exit().

import { newSeed } from "./rng.js";
import { loadHistory } from "./store.js";

/** Everything about the current run. Reset by newRun(). */
export const game = {
  runId: "",
  seed: 0,
  traits: null,      // what happened in the pond (pond.js fills this)
  life: null,        // the evolved creature, its world, NPCs and jobs (evolve.js fills this)
  choices: [],       // every decision the player made after evolving: { where, prompt, picked, other }
  insights: [],      // what the Oracle has told the player this run
  coins: 0,
  jobsDone: 0,
  history: []        // past runs from storage, so the Oracle never repeats itself
};

export function newRun(seed = newSeed()) {
  game.runId = "run-" + Date.now().toString(36);
  game.seed = seed;
  game.traits = null;
  game.life = null;
  game.choices = [];
  game.insights = [];
  game.coins = 0;
  game.jobsDone = 0;
  game.history = loadHistory();
}

const scenes = {};
let current = null;
let currentName = "";

export function register(name, scene) { scenes[name] = scene; }

/** Switch to another scene, passing it optional data. */
export function go(name, data) {
  if (current && current.exit) current.exit();
  current = scenes[name];
  currentName = name;
  if (!current) throw new Error("Unknown scene: " + name);
  if (current.enter) current.enter(data || {});
}

export function sceneName() { return currentName; }
export function updateScene(dt) { if (current && current.update) current.update(dt); }
export function drawScene(g) { if (current && current.draw) current.draw(g); }
