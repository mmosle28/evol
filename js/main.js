// Entry point: sets up the 3D stage, the overlay, the controller, every scene, and runs the loop.

import { Input, connectSerial } from "./core/input.js";
import { register, go, updateScene, drawScene, newRun, game, sceneName } from "./core/game.js";
import { stage } from "./core/stage.js";
import { W, H } from "./core/draw.js";
import { startAudio } from "./core/audio.js";
import { titleScene } from "./scenes/title.js";
import { pondScene } from "./scenes/pond.js";
import { evolvingScene } from "./scenes/evolving.js";
import { chooseScene } from "./scenes/choose.js";
import { planetScene } from "./scenes/planet.js";
import { diaryScene } from "./scenes/diary.js";
import { readingScene } from "./scenes/reading.js";

stage.init(document.getElementById("gl"));
const ui = document.getElementById("ui");
const g = ui.getContext("2d");

// Joystick button (only shown on the title screen)
const btn = document.getElementById("connectBtn");
btn.addEventListener("click", async () => {
  btn.disabled = true;
  const ok = await connectSerial(msg => { btn.textContent = msg.length > 40 ? "Use the bridge (see README)" : msg; });
  btn.disabled = ok;
  btn.blur();
});

register("title", titleScene);
register("pond", pondScene);
register("evolving", evolvingScene);
register("choose", chooseScene);
register("planet", planetScene);
register("diary", diaryScene);
register("reading", readingScene);

newRun();
go("title");

// ?debug exposes the state machine for testing scenes directly.
if (new URLSearchParams(location.search).has("debug")) window.evol = { go, game, scene: sceneName };

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  Input.update();
  if (Input.pressed()) startAudio();
  btn.classList.toggle("hidden", sceneName() !== "title");
  updateScene(dt);
  stage.render();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  drawScene(g);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
