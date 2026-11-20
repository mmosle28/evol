// Choose a world: three tiny planets float in space, like the Sims world-select circles or a TikTok
// "choose your planet" edit. The AI picked them from how you lived as a fish. Which one you pick says something too.

import { Input } from "../core/input.js";
import { go, game, score, note } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, hint, box, sticker, clamp, easeOut } from "../core/draw.js";
import { UI, FONT, BODY_COLORS } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makePlanet } from "../gfx/planet.js";
import { BIOMES } from "../gfx/biomes.js";
import * as M from "../gfx/models.js";
import { askJSON } from "../ai/claude.js";
import { worldPrompt } from "../ai/prompts.js";
import { describeTraits } from "../life/traits.js";
import { fallbackWorld } from "../life/fallback.js";
import { cleanWorld } from "../life/schema.js";
import { blip, ambience } from "../core/audio.js";

const THREE = window.THREE;
const ICON = { bayou: "🐸", desert: "🌵", suburb: "🏡", spooky: "🦇", harbor: "🍁", sunset: "🌴", pines: "🌲", jungle: "🦜" };
let view, planets, sel, t, chosenAt, result, me;

function build() {
  const scene = new THREE.Scene();
  // Deep space with a soft purple glow
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec3 vp; void main(){ float h = vp.y*0.5+0.5; gl_FragColor = vec4(mix(vec3(0.42,0.22,0.55), vec3(0.08,0.06,0.2), h), 1.0); }"
  }));
  scene.add(dome);
  const N = 600, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(250); arr.set([d.x, d.y, d.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a4a9a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff0dc, 0.8); sun.position.set(20, 30, 40); scene.add(sun);

  planets = game.life.worlds.map((w, i) => {
    const p = makePlanet(w.biome, makeRng(game.seed + i * 977), { R: 5.5, detail: 3 });
    p.group.position.set((i - 1) * 15, 0, 0);
    p.group.rotation.set(0.4, i * 2, 0);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.18, 6, 48), new THREE.MeshBasicMaterial({ color: BIOMES[w.biome].sky[1] }));
    halo.position.copy(p.group.position); scene.add(halo);
    scene.add(p.group);
    return { ...p, world: w, halo };
  });
  me = M.creature(game.life.creature.body, { scale: 0.45, color: BODY_COLORS[game.life.creature.color] });
  me.position.set(0, -10, 6); scene.add(me);
  const camera = makeCamera(45);
  camera.position.set(0, 2, 34); camera.lookAt(0, 0, 0);
  view = { scene, camera };
}

export const chooseScene = {
  enter() { build(); stage.view = view; sel = 1; t = 0; chosenAt = 0; result = null; ambience("quiet"); },
  update(dt) {
    t += dt;
    planets.forEach((p, i) => {
      p.group.rotation.y += dt * (i === sel ? 0.5 : 0.18);
      p.update(dt);
      const s = THREE.MathUtils.lerp(p.group.scale.x, i === sel ? 1.18 : 0.82, dt * 6);
      p.group.scale.setScalar(s); p.halo.scale.setScalar(s);
      p.group.position.y = Math.sin(t * 1.4 + i) * 0.5;
      p.halo.position.y = p.group.position.y;
      p.halo.material.opacity = i === sel ? 1 : 0.35; p.halo.material.transparent = true;
      p.halo.rotation.z = Math.sin(t * 0.6 + i) * 0.1;
    });
    me.rotation.y = Math.sin(t) * 0.4; M.animateCreature(me, t, false);
    if (!chosenAt) {
      const tap = Input.tapped();
      if (tap.x) { sel = clamp(sel + tap.x, 0, 2); blip("pop"); }
      if (t > 0.6 && Input.pressed()) choose();
      return;
    }
    // Fly toward the chosen planet while its residents are written
    const k = easeOut(clamp((t - chosenAt) / 2.2, 0, 1)), p = planets[sel];
    view.camera.position.lerpVectors(new THREE.Vector3(0, 2, 34), new THREE.Vector3(p.group.position.x, 4, 15), k);
    view.camera.lookAt(p.group.position.x * k, 0, 0);
    me.position.lerpVectors(new THREE.Vector3(0, -10, 6), new THREE.Vector3(p.group.position.x, 7.5, 0), k);
    if (result && t - chosenAt > 2.4) go("planet", { world: result });
  },
  draw(g) {
    g.textAlign = "center";
    g.fillStyle = UI.white; g.font = font(58, 700, FONT.title);
    g.fillText(chosenAt ? "Packing your bags..." : "Choose a world", W / 2, 92);
    if (chosenAt) { g.font = font(22, 500); g.fillText(result ? "Landing!" : "Meeting the neighbors" + ".".repeat(1 + Math.floor(t * 2) % 3), W / 2, 132); return; }
    g.font = font(22, 500); g.fillStyle = "rgba(255,255,255,0.8)";
    g.fillText(`Three planets want a ${game.life.creature.name}.`, W / 2, 132);
    planets.forEach((p, i) => {
      const x = W / 2 + (i - 1) * 395, on = i === sel;
      sticker(g, x - 120, 560, on ? 66 : 50, ICON[p.world.biome], { tilt: -0.15 + i * 0.1 });
      g.fillStyle = on ? UI.white : "rgba(255,255,255,0.6)"; g.font = font(on ? 34 : 26, 700, FONT.title);
      g.fillText(p.world.name, x, 570);
      g.font = font(17, 500); g.fillText(BIOMES[p.world.biome].label.toUpperCase(), x, 598);
    });
    const w = planets[sel].world;
    box(g, W / 2 - 360, 620, 720, 62);
    g.fillStyle = UI.ink; g.font = font(21, 500); g.textAlign = "center";
    g.fillText(w.pitch, W / 2, 658);
    hint(g, "Left / right to look, button to move there");
  }
};

function choose() {
  chosenAt = t; blip("yay");
  const w = game.life.worlds[sel];
  score(BIOMES[w.biome].axes);
  game.choice = { picked: w.name, biome: w.biome, passed: game.life.worlds.filter((_, i) => i !== sel).map(x => x.name) };
  note(`Chose to live on ${w.name} (${BIOMES[w.biome].label}) over ${game.choice.passed.join(" and ")}.`);
  askJSON(worldPrompt(game.life, w, describeTraits(game.traits)), {
    validate: x => cleanWorld(x, w.biome), timeoutMs: 45000,
    fallback: () => cleanWorld(fallbackWorld(w, game.seed), w.biome)
  }).then(r => { result = r.value; result.fromAI = r.fromAI; result.pitch = w.pitch; });
}
