// Title: a quiet summer pond under a big sky, a red fish circling, and the name in red.

import { Input } from "../core/input.js";
import { go, game, newRun } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText } from "../core/draw.js";
import { UI, FONT, PAL } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeSky } from "../gfx/sky.js";
import * as M from "../gfx/models.js";
import { warmUp } from "../ai/claude.js";

const THREE = window.THREE;
let view, sky, fishA, fishB, t = 0;

function build() {
  const scene = new THREE.Scene();
  const rng = makeRng(7);
  sky = makeSky(scene, rng, { clouds: 16 });
  sky.setTime(0.62, { x: 0, z: 0 });
  const ground = M.ground(260); scene.add(ground);
  const water = new THREE.Mesh(new THREE.CircleGeometry(26, 40), new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.3; water.receiveShadow = true; scene.add(water);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const r = M.rock(1.2 + rng() * 1.4); r.position.set(Math.cos(a) * 27, 0.4, Math.sin(a) * 27); scene.add(r); }
  for (let i = 0; i < 5; i++) { const p = M.lilypad(1.4 + rng()); p.position.set((rng() - 0.5) * 30, 0.4, (rng() - 0.5) * 30); scene.add(p); }
  const r1 = M.reeds(); r1.position.set(-18, 0, -10); scene.add(r1);
  for (let i = 0; i < 6; i++) { const tr = M.tree(rng); tr.position.set(-60 + i * 22, 0, -50 - rng() * 20); tr.scale.setScalar(2); scene.add(tr); }
  const poles = [-70, -35, 0, 35, 70].map(x => { const p = M.pole(); p.position.set(x, 0, -38); scene.add(p); return p.position; });
  for (let i = 0; i < poles.length - 1; i++) scene.add(M.wire(poles[i], poles[i + 1]));
  const h1 = M.house(rng); h1.position.set(40, 0, -30); h1.rotation.y = -0.5; scene.add(h1);
  fishA = M.fish({ scale: 1.4 }); scene.add(fishA);
  fishB = M.fish({ scale: 0.8 }); scene.add(fishB);
  const camera = makeCamera(45);
  view = { scene, camera };
}

export const titleScene = {
  enter() { if (!view) build(); stage.view = view; t = 0; newRun(); },
  update(dt) {
    t += dt;
    sky.update(dt);
    const a = t * 0.5;
    fishA.position.set(Math.cos(a) * 12, -0.2 + Math.sin(t * 3) * 0.1, Math.sin(a) * 12); fishA.rotation.y = -a - Math.PI / 2;
    const b = -t * 0.8 + 2;
    fishB.position.set(Math.cos(b) * 7, -0.1, Math.sin(b) * 7); fishB.rotation.y = -b + Math.PI / 2;
    const cam = view.camera;
    cam.position.set(14 + Math.sin(t * 0.05) * 10, 15, 36);
    cam.lookAt(-6, 1, 0);
    if (t > 0.4 && Input.pressed()) { warmUp(); go("pond"); }
  },
  draw(g) {
    g.textAlign = "left";
    g.fillStyle = UI.red; g.font = font(190, 400, FONT.title);
    g.fillText("Evol", 90, 290);
    g.fillStyle = UI.ink; g.font = font(30, 700);
    wrapText(g, "You start as a fish. What you do decides what you become.", 96, 350, 560, 40);
    g.font = font(22, 500); g.fillStyle = UI.ink;
    wrapText(g, "Time only moves when you move.", 96, 440, 560, 32);
    g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3.5);
    g.fillStyle = UI.red; g.font = font(24, 900);
    g.fillText("PRESS THE BUTTON", 96, 520);
    g.globalAlpha = 1;
    if (game.history.length) {
      g.fillStyle = UI.muted; g.font = font(20, 500);
      g.fillText(`${game.history.length} ${game.history.length === 1 ? "life" : "lives"} lived so far`, 96, 560);
    }
  }
};
