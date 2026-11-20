// Title: tiny worlds floating in space and a fish swimming between them. Where will this one end up?

import { Input } from "../core/input.js";
import { go, game, newRun } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText } from "../core/draw.js";
import { UI, FONT, PAL } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makePlanet } from "../gfx/planet.js";
import * as M from "../gfx/models.js";
import { warmUp } from "../ai/claude.js";

const THREE = window.THREE;
let view, worlds, fishA, fishB, t = 0;

function build() {
  const scene = new THREE.Scene();
  const rng = makeRng(7);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec3 vp; void main(){ float h = vp.y*0.5+0.5; gl_FragColor = vec4(mix(vec3(0.98,0.55,0.45), vec3(0.25,0.2,0.55), smoothstep(0.3,0.8,h)), 1.0); }"
  }));
  scene.add(dome);
  const N = 500, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(250); arr.set([d.x, d.y, d.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a4a9a, 0.95));
  const sun = new THREE.DirectionalLight(0xfff0dc, 0.8); sun.position.set(20, 30, 40); scene.add(sun);
  worlds = [["suburb", 14, 6, -4, 4.5], ["spooky", 26, -6, -14, 3.5], ["jungle", 4, -9, 2, 3], ["desert", 28, 9, -20, 4], ["harbor", -2, 10, -24, 3.2]].map(([k, x, y, z, r], i) => {
    const p = makePlanet(k, makeRng(11 + i), { R: r, detail: 3 }); p.group.position.set(x, y, z); p.group.rotation.x = 0.4; scene.add(p.group); return p;
  });
  fishA = M.fish({ scale: 1.2 }); scene.add(fishA);
  fishB = M.fish({ scale: 0.6, color: 0x9fd6e8 }); scene.add(fishB);
  const camera = makeCamera(45);
  camera.position.set(4, 0, 34); camera.lookAt(10, 0, 0);
  view = { scene, camera };
}

export const titleScene = {
  enter() { if (!view) build(); stage.view = view; t = 0; newRun(); },
  update(dt) {
    t += dt;
    worlds.forEach((w, i) => { w.group.rotation.y += dt * (0.15 + i * 0.04); w.update(dt); w.group.position.y += Math.sin(t + i) * dt * 0.3; });
    const a = t * 0.5;
    fishA.position.set(14 + Math.cos(a) * 9, Math.sin(t * 1.3) * 2, -4 + Math.sin(a) * 9); fishA.rotation.y = -a - Math.PI / 2; fishA.rotation.z = Math.sin(t * 6) * 0.1;
    const b = -t * 0.8 + 2;
    fishB.position.set(14 + Math.cos(b) * 6, 1 + Math.sin(t) , -4 + Math.sin(b) * 6); fishB.rotation.y = -b + Math.PI / 2;
    view.camera.position.set(4 + Math.sin(t * 0.1) * 2, Math.sin(t * 0.13), 34);
    view.camera.lookAt(10, 0, 0);
    if (t > 0.4 && Input.pressed()) { warmUp(); go("pond"); }
  },
  draw(g) {
    g.textAlign = "left";
    g.fillStyle = UI.white; g.font = font(190, 700, FONT.title);
    g.fillText("Evol", 90, 290);
    g.fillStyle = UI.white; g.font = font(30, 700);
    wrapText(g, "You start as a fish. What you do decides what you become.", 96, 350, 560, 40);
    g.font = font(22, 500); g.fillStyle = "rgba(255,255,255,0.85)";
    wrapText(g, "Then pick a tiny world, meet everyone on it, and find out who you really are.", 96, 440, 520, 32);
    g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3.5);
    g.fillStyle = UI.yellow; g.font = font(24, 700);
    g.fillText("PRESS THE BUTTON", 96, 520);
    g.globalAlpha = 1;
    if (game.history.length) {
      g.fillStyle = "rgba(255,255,255,0.8)"; g.font = font(20, 500);
      g.fillText(`${game.history.length} ${game.history.length === 1 ? "life" : "lives"} lived so far`, 96, 560);
    }
  }
};
