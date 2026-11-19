// Evolving: the pond recap (what you did) appears while the AI builds your new life, then the cocoon
// breaks and your creature is revealed on a white plinth under the summer sky.

import { Input } from "../core/input.js";
import { go, game, score } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, hint, clamp, easeOut } from "../core/draw.js";
import { UI, FONT, PAL } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeSky } from "../gfx/sky.js";
import * as M from "../gfx/models.js";
import { askJSON } from "../ai/claude.js";
import { lifePrompt } from "../ai/prompts.js";
import { describeTraits, pondAxes } from "../life/traits.js";
import { fallbackLife } from "../life/fallback.js";
import { cleanLife } from "../life/schema.js";
import { blip } from "../core/audio.js";

const THREE = window.THREE;
let view, sky, cocoon, shards, critter, t, lines, result, fromAI, revealAt;

function build() {
  const scene = new THREE.Scene();
  sky = makeSky(scene, makeRng(game.seed), { clouds: 14 });
  sky.setTime(0.55, { x: 0, z: 0 });
  scene.add(M.ground(260));
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1.2, 8), M.mat(PAL.stone)); plinth.position.y = 0.6; plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);
  cocoon = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), M.mat(PAL.white)); cocoon.scale.y = 1.4; cocoon.position.y = 5; cocoon.castShadow = true; scene.add(cocoon);
  shards = [];
  const camera = makeCamera(40);
  camera.position.set(0, 9, 22); camera.lookAt(0, 4.5, 0);
  view = { scene, camera };
}

export const evolvingScene = {
  enter() {
    build(); stage.view = view;
    t = 0; result = null; fromAI = false; revealAt = 0; critter = null;
    lines = describeTraits(game.traits);
    score(pondAxes(game.traits));
    const past = game.history.flatMap(r => [r.creatureName, r.worldName]).filter(Boolean);
    askJSON(lifePrompt(lines, game.seed, past), { validate: cleanLife, fallback: () => cleanLife(fallbackLife(game.traits, game.seed)), timeoutMs: 50000 })
      .then(r => { result = r.value; fromAI = r.fromAI; });
  },
  update(dt) {
    t += dt; sky.update(dt);
    if (!revealAt) {
      cocoon.rotation.y += dt * 0.6;
      const s = 1 + Math.sin(t * 5) * 0.04; cocoon.scale.set(s, 1.4 * s, s);
      if (result && t > 1.5 + lines.length * 0.5) reveal();
    } else {
      const k = t - revealAt;
      for (const sh of shards) { sh.position.addScaledVector(sh.userData.v, dt); sh.userData.v.y -= 30 * dt; sh.rotation.x += dt * 4; if (sh.position.y < 1.2) { sh.position.y = 1.2; sh.userData.v.set(0, 0, 0); } }
      critter.scale.setScalar(Math.min(1.6, easeOut(clamp(k / 0.8, 0, 1)) * 1.6));
      critter.rotation.y += dt * 0.7;
      M.animateCreature(critter, t, false);
      if (k > 1.6 && Input.pressed()) go("summer", { first: true });
    }
    view.camera.position.x = Math.sin(t * 0.15) * 4;
    view.camera.lookAt(0, 4.5, 0);
  },
  draw(g) {
    if (!revealAt) {
      g.fillStyle = "rgba(247,246,242,0.82)"; g.fillRect(40, 50, 640, 90 + lines.length * 34);
      g.textAlign = "left"; g.fillStyle = UI.red; g.font = font(40, 400, FONT.title);
      g.fillText("What you did as a fish", 70, 105);
      lines.forEach((l, i) => {
        const a = clamp((t - 0.6 - i * 0.5) / 0.4, 0, 1);
        g.globalAlpha = a; g.fillStyle = UI.ink; g.font = font(19, 700);
        g.fillText("·  " + l, 74 + (1 - a) * 16, 150 + i * 34);
      });
      g.globalAlpha = 1;
      g.fillStyle = UI.ink; g.font = font(20, 900); g.textAlign = "center";
      g.fillText(result ? "READY" : "EVOLVING" + ".".repeat(1 + Math.floor(t * 2) % 3), W * 0.74, H - 80);
      return;
    }
    const life = game.life, k = clamp((t - revealAt - 0.4) / 0.8, 0, 1);
    g.globalAlpha = k;
    g.fillStyle = "rgba(247,246,242,0.88)"; g.fillRect(40, 70, 560, 520);
    g.textAlign = "left"; g.fillStyle = UI.ink; g.font = font(20, 900); g.fillText("YOU EVOLVED INTO", 70, 120);
    g.fillStyle = UI.red; g.font = font(76, 400, FONT.title); g.fillText(life.creature.name, 66, 200);
    g.fillStyle = UI.ink; g.font = font(24, 500);
    let y = wrapText(g, life.creature.description, 70, 250, 500, 34);
    g.fillStyle = UI.red; g.font = font(22, 900);
    y = wrapText(g, life.creature.because, 70, y + 12, 500, 32);
    g.fillStyle = UI.muted; g.font = font(21, 500);
    wrapText(g, `Your summer begins in ${life.world.name}. ${life.world.description}`, 70, y + 16, 500, 30);
    g.globalAlpha = 1;
    if (!fromAI) { g.fillStyle = UI.muted; g.font = font(16, 500); g.textAlign = "left"; g.fillText("AI unavailable: built offline from your traits", 30, H - 26); }
    if (t - revealAt > 1.6) hint(g, "Press the button to start your summer");
  }
};

function reveal() {
  revealAt = t; game.life = result; blip("get"); Input.signal("b");
  cocoon.visible = false;
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.6 + Math.random() * 0.5, 0), M.mat(PAL.white));
    s.position.copy(cocoon.position);
    s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 18, 8 + Math.random() * 8, (Math.random() - 0.5) * 18);
    s.castShadow = true; view.scene.add(s); shards.push(s);
  }
  critter = M.creature(game.life.creature.body);
  critter.position.y = 1.2; critter.scale.setScalar(0.01);
  view.scene.add(critter);
}
