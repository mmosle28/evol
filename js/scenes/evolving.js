// Evolving: one continuous transition, no menus. Your fish is pulled out of the pond into space and spins
// inside a felt cocoon while the pond moments it remembers float past. It hatches into what you earned, then
// your own world rises out of nothing far below, and the camera swoops down to where you'll build.
// Behind the scenes the AI designs the creature and its world while the cocoon spins.

import { go, game, score } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, clamp, easeOut, rect } from "../core/draw.js";
import { UI, FONT, BODY_COLORS } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeWorld, gladeSky } from "../gfx/terrain.js";
import { lookOf } from "../gfx/biomes.js";
import * as M from "../gfx/models.js";
import { askJSON } from "../ai/claude.js";
import { lifePrompt } from "../ai/prompts.js";
import { describeTraits, pondAxes } from "../life/traits.js";
import { fallbackLife } from "../life/fallback.js";
import { cleanLife } from "../life/schema.js";
import { blip, ambience } from "../core/audio.js";
import { Input } from "../core/input.js";

const THREE = window.THREE;
const DROP = -30; // your world appears far below you
let spaceLights = [];
let view, dome, stars, fish, cocoon, shards, critter, planet, pops, t, phase, phaseT, lines, life, world, fromAI, flash;

function build() {
  const scene = new THREE.Scene();
  dome = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { a: { value: new THREE.Color(0x3a2a6a) }, b: { value: new THREE.Color(0x100a22) } },
    vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec3 vp; void main(){ float h = vp.y*0.5+0.5; gl_FragColor = vec4(mix(a, b, smoothstep(0.2,0.85,h)), 1.0); }"
  }));
  scene.add(dome);
  const N = 700, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(250); arr.set([d.x, d.y, d.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })); scene.add(stars);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6a4a9a, 0.95); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 0.8); sun.position.set(20, 30, 40); scene.add(sun);
  spaceLights = [hemi, sun];

  fish = M.fish({ scale: 0.9 }); fish.position.y = 2; scene.add(fish);
  cocoon = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshStandardMaterial({ color: 0xffe08a, flatShading: true, transparent: true, opacity: 0, roughness: 1 }));
  cocoon.position.y = 2; scene.add(cocoon);
  shards = [];
  const camera = makeCamera(45);
  camera.position.set(0, 3, 15); camera.lookAt(0, 2, 0);
  view = { scene, camera };
}

function setPhase(p) { phase = p; phaseT = 0; }

export const evolvingScene = {
  enter() {
    build(); stage.view = view;
    t = 0; setPhase("cocoon"); life = null; world = null; fromAI = true; critter = null; planet = null; pops = []; flash = 0;
    lines = describeTraits(game.traits).slice(0, 8);
    score(pondAxes(game.traits));
    ambience("quiet"); blip("whoosh");
    const past = game.history.flatMap(r => [r.creatureName, r.worldName]).filter(Boolean);
    askJSON(lifePrompt(describeTraits(game.traits), game.seed, past), { validate: cleanLife, fallback: () => cleanLife(fallbackLife(game.traits, game.seed)), timeoutMs: 50000 })
      .then(r => { life = r.value; fromAI = r.fromAI; life.fromAI = r.fromAI; game.life = life; world = true; });
  },
  update(dt) {
    t += dt; phaseT += dt;
    const cam = view.camera;
    if (phase === "cocoon") {
      // The fish curls up and a felt cocoon wraps around it
      const k = clamp(phaseT / 1.6, 0, 1);
      fish.rotation.y += dt * (2 + k * 8); fish.rotation.z = Math.sin(t * 3) * 0.3;
      fish.scale.setScalar(1 - k * 0.6);
      cocoon.material.opacity = k; cocoon.rotation.y -= dt * 0.8;
      const s = (0.4 + k * 0.6) * (1 + Math.sin(t * 6) * 0.04 * k); cocoon.scale.set(s, s * 1.3, s);
      if (life && phaseT > Math.max(3, 1.2 + lines.length * 0.7)) hatch();
    } else if (phase === "hatch") {
      for (const sh of shards) { sh.position.addScaledVector(sh.userData.v, dt); sh.rotation.x += dt * 5; sh.userData.v.multiplyScalar(0.97); }
      const k = easeOut(clamp(phaseT / 0.9, 0, 1));
      critter.scale.setScalar(Math.max(0.01, k));
      critter.rotation.y += dt * 1.2; M.animateCreature(critter, t, false);
      if (phaseT > 2.8) grow();
    } else if (phase === "grow" || phase === "wait") {
      // Your world rises out of nothing far below you: hills swell up, then forests and houses pop in
      const k = easeOut(clamp(phaseT / 2.4, 0, 1));
      planet.group.scale.y = Math.max(0.02, k);
      planet.update(dt, critter.position);
      pops.forEach((p, i) => { const pk = clamp((phaseT - 1.4 - i / pops.length * 2) / 0.35, 0, 1); p.obj.scale.copy(p.s).multiplyScalar(easeOut(pk) * (1 + Math.sin(pk * Math.PI) * 0.3)); if (pk > 0 && !p.popped) { p.popped = true; if (i % 9 === 0) blip("pop"); } });
      for (const sh of shards) { sh.position.addScaledVector(sh.userData.v, dt); sh.userData.v.multiplyScalar(0.97); }
      // You float down toward the clearing in the middle
      critter.position.y = Math.max(DROP + 2.2, critter.position.y - dt * 7); critter.rotation.y += dt * 0.6; M.animateCreature(critter, t, false);
      cam.position.lerp(new THREE.Vector3(Math.sin(t * 0.15) * 20, 22, 80), dt * 1.0); cam.lookAt(0, DROP + 2, -10);
      if (phase === "grow" && phaseT > 4.4) setPhase("wait");
      if (phase === "wait" && phaseT > 1.2) { setPhase("dive"); blip("whoosh"); }
      return;
    } else if (phase === "dive") {
      // Swoop down to just behind you, ground level, where the game picks up
      const k = easeOut(clamp(phaseT / 1.8, 0, 1));
      critter.position.y = DROP + 2.2; critter.position.z += (10 - critter.position.z) * Math.min(1, dt * 2);
      cam.position.lerp(new THREE.Vector3(0, DROP + 26, 34), Math.min(1, dt * 3));
      cam.lookAt(0, DROP, 4 * k);
      planet.update(dt, critter.position); M.animateCreature(critter, t, false);
      flash = clamp((phaseT - 1.4) / 0.4, 0, 1) * 0.9;
      if (phaseT > 1.8) go("world");
      return;
    }
    cam.position.x = Math.sin(t * 0.3) * 2; cam.lookAt(0, 1, 0);
  },
  draw(g) {
    g.textAlign = "center";
    if (phase === "cocoon") {
      // What the cocoon remembers: pond moments drift past, one at a time
      const i = Math.floor(phaseT / 0.7), k = (phaseT % 0.7) / 0.7;
      if (i < lines.length) { g.globalAlpha = Math.sin(k * Math.PI); caption(g, lines[i], 560 - k * 30, 22, UI.paper); g.globalAlpha = 1; }
      g.fillStyle = "rgba(255,255,255,0.75)"; g.font = font(20, 600); g.fillText("EVOLVING" + ".".repeat(1 + Math.floor(t * 2) % 3), W / 2, 80);
    } else if (phase === "hatch" && life) {
      const a = clamp((phaseT - 0.3) / 0.5, 0, 1); g.globalAlpha = a;
      g.fillStyle = "rgba(255,255,255,0.8)"; g.font = font(20, 600); g.fillText("YOU EVOLVED INTO", W / 2, 470);
      g.fillStyle = UI.white; g.font = font(72, 700, FONT.title); g.fillText(life.creature.name, W / 2, 545);
      caption(g, life.creature.because || life.creature.description, 600, 22, UI.paper);
      g.globalAlpha = 1;
    } else if ((phase === "grow" || phase === "wait") && life) {
      const look = lookOf(life.world.biome, life.world.look), a = clamp((phaseT - 0.8) / 0.6, 0, 1);
      g.globalAlpha = a;
      g.fillStyle = "rgba(255,255,255,0.8)"; g.font = font(20, 600); g.fillText("A WORLD GREW AROUND YOU", W / 2, 80);
      g.fillStyle = UI.white; g.font = font(64, 700, FONT.title); g.fillText(life.world.name, W / 2, 148);
      g.font = font(20, 600); g.fillStyle = "#" + new THREE.Color(look.sky[1]).getHexString(); g.fillText(look.label.toUpperCase(), W / 2, 180);
      caption(g, life.world.pitch, 620, 21, UI.paper);
      g.globalAlpha = 1;
      if (phase === "wait" && !world) { g.fillStyle = "rgba(255,255,255,0.8)"; g.font = font(18, 500); g.fillText("Waking up the neighbors" + ".".repeat(1 + Math.floor(t * 2) % 3), W / 2, 580); }
    }
    if (flash) { g.fillStyle = `rgba(255,246,230,${flash})`; g.fillRect(0, 0, W, H); }
    if (!fromAI && phase !== "cocoon") { g.fillStyle = "rgba(255,255,255,0.6)"; g.font = font(14, 500); g.textAlign = "left"; g.fillText("AI unavailable: built offline from your traits", 20, H - 16); }
  }
};

/** A pill-shaped caption along the bottom. */
function caption(g, text, y, size, fill) {
  g.font = font(size, 600);
  const w = Math.min(980, g.measureText(text).width + 60);
  g.fillStyle = fill; rect(g, W / 2 - w / 2, y - size - 14, w, size + 30, (size + 30) / 2); g.fill();
  g.fillStyle = UI.ink; g.textAlign = "center";
  if (g.measureText(text).width > 920) { g.font = font(size - 4, 600); }
  g.fillText(text, W / 2, y + 2);
}

function hatch() {
  setPhase("hatch"); blip("yay"); Input.signal("b");
  cocoon.visible = false; fish.visible = false;
  const cols = [0xffe08a, 0xff9ec4, 0x9ad8ff, 0xb8f0a0];
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.4 + Math.random() * 0.4, 0), M.mat(cols[i % 4]));
    s.position.set(0, 2, 0);
    s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.3) * 12, (Math.random() - 0.5) * 14);
    view.scene.add(s); shards.push(s);
  }
  const color = BODY_COLORS[life.creature.color];
  critter = M.creature(life.creature.body, { scale: 0.5, color, accent: new THREE.Color(color).multiplyScalar(0.7).getHex() });
  critter.position.y = 2; critter.scale.setScalar(0.01);
  view.scene.add(critter);
}

function grow() {
  setPhase("grow"); blip("whoosh");
  // The same seed as the world you're about to walk in, so what you see from the sky is where you land
  planet = makeWorld(life.world.biome, makeRng(game.seed ^ 0x9e3779b9), { look: life.world.look });
  planet.group.position.y = DROP; planet.group.scale.y = 0.02;
  view.scene.add(planet.group);
  dome.visible = false; stars.visible = false;
  gladeSky(view.scene, planet.biome); view.tone = true; view.exposure = 0.78;
  spaceLights.forEach(l => { l.visible = false; });
  view.scene.fog = new THREE.Fog(planet.biome.sky[1], 220, 520);
  // Every prop starts at zero size and pops up in turn
  planet.group.children.forEach(c => { if (c.isGroup) { pops.push({ obj: c, s: c.scale.clone() }); c.scale.setScalar(0.001); } });
  pops.sort((a, b) => Math.hypot(a.obj.position.x, a.obj.position.z) - Math.hypot(b.obj.position.x, b.obj.position.z));
}
