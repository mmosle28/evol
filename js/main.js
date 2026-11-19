// Entry point: sets up the canvas, the controller, every scene, and runs the game loop.

import { Input, connectSerial } from "./core/input.js";
import { register, go, updateScene, drawScene, newRun, game } from "./core/game.js";
import { W, H } from "./core/draw.js";
import { titleScene } from "./scenes/title.js";
import { pondScene } from "./scenes/pond.js";
import { evolvingScene } from "./scenes/evolving.js";
import { worldScene } from "./scenes/world.js";
import { jobScene } from "./scenes/job.js";
import { talkScene } from "./scenes/talk.js";
import { oracleScene } from "./scenes/oracle.js";

const canvas = document.getElementById("game");
const g = canvas.getContext("2d");

// Controller bar
const btn = document.getElementById("connectBtn");
const status = document.getElementById("ctrlStatus");
btn.addEventListener("click", async () => {
  btn.disabled = true;
  const ok = await connectSerial(msg => { status.textContent = msg; });
  btn.disabled = ok;
  btn.blur();
});

// Scenes (the state machine)
register("title", titleScene);
register("pond", pondScene);
register("evolving", evolvingScene);
register("world", worldScene);
register("job", jobScene);
register("talk", talkScene);
register("oracle", oracleScene);

newRun();
go("title");

// ?debug exposes the state machine in the console, for testing scenes directly.
if (new URLSearchParams(location.search).has("debug")) window.evol = { go, game };

// Game loop: read input, update the current scene, draw it.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // cap so a slow frame doesn't teleport things
  last = now;
  Input.update();
  updateScene(dt);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  drawScene(g);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
