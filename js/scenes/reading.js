// The reading: Dr. Wobble (the game's Doctor Therapist, from Doki Doki Universe) tells you who you were
// this life. It reads the pond, your world, how you treated each resident, and your quiz answers, then shows
// its "receipts": the exact moments it based the reading on. Never repeats an archetype from past lives.

import { Input } from "../core/input.js";
import { go, game, newRun } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, box, hint, clamp, rect, sticker } from "../core/draw.js";
import { UI, FONT, BODY_COLORS } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeWorld, gladeSky } from "../gfx/terrain.js";
import { makeTown } from "../gfx/town.js";
import { defaultPalette } from "../gfx/biomes.js";
import * as M from "../gfx/models.js";
import { askJSON } from "../ai/claude.js";
import { readingPrompt } from "../ai/prompts.js";
import { describeTraits } from "../life/traits.js";
import { fallbackReading } from "../life/fallback.js";
import { saveRun } from "../core/store.js";
import { blip } from "../core/audio.js";

const THREE = window.THREE;
let view, planet, me, doc, reading, t, sel;

export const readingScene = {
  enter() {
    const scene = new THREE.Scene();
    const { biome, look } = game.life.world;
    const skyL = gladeSky(scene, { sky: [0x8ec5ff, 0xffe6cc], ground: [0xb0c890, 0xa0b880] }); scene.fog = null;
    // Your town as a little diorama on the doctor's desk: the same world and every floor you built
    const terra = makeWorld(biome, makeRng(game.seed ^ 0x9e3779b9), { look, density: 0.5, size: 84, segments: 84 });
    planet = new THREE.Group();
    terra.group.children[1].visible = false; planet.add(terra.group);
    const town = makeTown(terra, game.life.world.palette || defaultPalette(biome));
    for (const [k, h] of game.townCells || []) { const [i, j] = k.split(",").map(Number); for (let n = 0; n < h; n++) town.add(i, j); }
    planet.add(town.group);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(62, 64, 3, 64), new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 0.9 })); disc.position.y = -1.6; planet.add(disc);
    planet.scale.setScalar(0.16); planet.position.set(9, 0, -2); scene.add(planet);
    me = M.creature(game.life.creature.body, { scale: 0.7, color: BODY_COLORS[game.life.creature.color] }); me.position.set(7.5, 0.4, 3); scene.add(me);
    // Dr. Wobble: a round purple doctor with big glasses
    doc = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), M.mat(0xb07aff)); body.position.y = 1.3; doc.add(body);
    for (const s of [-1, 1]) { const lens = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 5, 12), M.mat(0x2b2340)); lens.position.set(s * 0.42, 1.65, 1.2); doc.add(lens); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), M.mat(0x2b2340)); eye.position.set(s * 0.42, 1.65, 1.15); doc.add(eye); }
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 1.1, 8), M.mat(0xffffff)); coat.position.y = 0.6; doc.add(coat);
    doc.position.set(12, 0.2, 1); doc.rotation.y = -0.6; scene.add(doc);
    const camera = makeCamera(40); camera.position.set(2, 5, 24); camera.lookAt(2, 2.5, 0);
    view = { scene, camera, tone: true, exposure: 1.05 }; stage.view = view;
    t = 0; sel = 0; reading = null;
    askJSON(readingPrompt(game.life, describeTraits(game.traits), game.log, game.answers, game.stats || {}, game.axes, game.history), {
      validate: r => {
        if (typeof r.archetype !== "string" || !Array.isArray(r.lines)) throw new Error("bad");
        return { archetype: r.archetype.slice(0, 50), lines: r.lines.slice(0, 3).map(l => String(l).slice(0, 220)), receipts: (Array.isArray(r.receipts) ? r.receipts : []).slice(0, 3).map(l => String(l).slice(0, 110)), question: String(r.question || "").slice(0, 200) };
      },
      fallback: () => fallbackReading(game.axes, game.stats || {}), timeoutMs: 45000
    }).then(r => {
      reading = r.value; t = 0; blip("yay");
      saveRun({ id: game.runId, creatureName: game.life.creature.name, worldName: game.life.world.name, reading, diary: game.diary.map(d => ({ day: d.day, sticker: d.sticker })), at: Date.now() });
    });
  },
  update(dt) {
    t += dt;
    planet.rotation.y += dt * 0.15;
    me.rotation.y = -0.4 + Math.sin(t * 0.6) * 0.3; M.animateCreature(me, t, false);
    doc.position.y = 0.2 + Math.abs(Math.sin(t * 2)) * 0.25;
    if (!reading || t < 1.5) return;
    const tap = Input.tapped();
    if (tap.x) sel = tap.x > 0 ? 1 : 0;
    if (Input.pressed()) { if (sel === 0) { newRun(); go("pond"); } else go("title"); }
  },
  draw(g) {
    box(g, 40, 30, 720, 660);
    g.textAlign = "left";
    if (!reading) {
      g.fillStyle = UI.ink; g.font = font(26, 700);
      g.fillText("Dr. Wobble is reviewing your file" + ".".repeat(1 + Math.floor(t * 2) % 3), 80, 120);
      return;
    }
    g.globalAlpha = clamp(t / 0.8, 0, 1);
    g.fillStyle = "#8a5ad0"; g.font = font(17, 700); g.fillText(`DR. WOBBLE'S READING  ·  ${game.life.creature.name.toUpperCase()} OF ${game.life.world.name.toUpperCase()}`, 80, 82);
    g.fillStyle = UI.red; g.font = font(48, 700, FONT.title);
    let y = wrapText(g, reading.archetype, 80, 140, 640, 52);
    g.font = font(19, 500);
    for (const l of reading.lines) { g.fillStyle = UI.red; g.beginPath(); g.arc(86, y + 6, 4, 0, 7); g.fill(); g.fillStyle = UI.ink; y = wrapText(g, l, 100, y + 12, 620, 26) + 4; }
    g.fillStyle = UI.ink; g.font = font(16, 700); g.fillText("HOW I FIGURED IT OUT", 80, y + 18);
    g.font = font(16, 500); g.fillStyle = UI.muted;
    reading.receipts.forEach((r, i) => { y = wrapText(g, "🧾  " + r, 80, y + 44 + (i ? -18 : 0), 640, 22); });
    g.fillStyle = "#8a5ad0"; g.font = font(19, 700); wrapText(g, reading.question, 80, Math.min(y + 32, 590), 640, 26);
    g.globalAlpha = 1;
    if (t > 1.5) {
      ["Live another life", "Back to the title"].forEach((txt, i) => {
        const x = 80 + i * 330, on = i === sel;
        g.fillStyle = on ? UI.red : UI.white; rect(g, x, 616, 300, 50, 25); g.fill(); g.strokeStyle = UI.ink; g.lineWidth = 2; g.stroke();
        g.fillStyle = on ? UI.white : UI.ink; g.font = font(20, 700); g.textAlign = "center"; g.fillText(txt, x + 150, 648); g.textAlign = "left";
      });
      hint(g, "Left / right to choose, button to go");
    }
  }
};
