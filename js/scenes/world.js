// Your world: a whole world generated from your seed (like Minecraft), drawn like Tiny Glade, where you build
// a town Townscaper style. Move the cursor with the joystick, tap the button to add a floor, hold it to take
// one away. The town shapes itself. Your evolution decided the land and your building colors; what you build,
// and how, is what Dr. Wobble reads at the end of the day.

import { Input } from "../core/input.js";
import { go, game, note, score } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, hint, box, clamp, rect, sticker } from "../core/draw.js";
import { UI, FONT, BODY_COLORS } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeWorld, gladeSky, BUILD_RADIUS } from "../gfx/terrain.js";
import { makeTown, CELL, MAX_H } from "../gfx/town.js";
import { lookOf, defaultPalette } from "../gfx/biomes.js";
import * as M from "../gfx/models.js";
import { blip, music, ambience } from "../core/audio.js";

const THREE = window.THREE;
const QUICK = new URLSearchParams(location.search).has("quick");
const DAY_SECONDS = QUICK ? 100 : 240;
const CURSOR_SPEED = 13, HOLD = 0.4;

let view, terra, sky, town, cursor, ghost, me, t, dayT, holdT, holdFired, pops, puffs, ending, endT, toast, stats, lastTall, glowSet, light0;

function build() {
  const w = game.life.world;
  const scene = new THREE.Scene();
  terra = makeWorld(w.biome, makeRng(game.seed ^ 0x9e3779b9), { look: w.look });
  scene.add(terra.group);
  sky = gladeSky(scene, terra.biome);
  light0 = { sun: sky.sun.intensity, hemi: sky.hemi.intensity, sunColor: sky.sun.color.clone() };
  town = makeTown(terra, w.palette || defaultPalette(w.biome));
  scene.add(town.group);

  // Cursor: a soft ring on the ground and a see-through block showing where the next floor goes
  cursor = { x: 0, z: 6, i: 0, j: 2 };
  ghost = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(CELL, 2.5, CELL), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
  block.position.y = 1.25; ghost.add(block);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL, 2.5, CELL)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
  edge.position.y = 1.25; ghost.add(edge);
  ghost.userData.block = block;
  scene.add(ghost);

  // You: your creature wanders along beside the cursor and hops when you build
  const color = BODY_COLORS[game.life.creature.color];
  me = { obj: new THREE.Group(), x: 0, z: 10, hop: 0 };
  const c = M.creature(game.life.creature.body, { scale: 0.55, color, accent: new THREE.Color(color).multiplyScalar(0.7).getHex() });
  c.rotation.y = -Math.PI / 2; me.obj.add(c); me.inner = c;
  c.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(me.obj);

  const camera = makeCamera(42);
  camera.position.set(0, 26, 34); camera.lookAt(0, 0, 4);
  view = { scene, camera, tone: true, exposure: 0.78 };
}

function setToast(text) { toast = { text, t: 3.4 }; }

function cellPos(i, j) { return new THREE.Vector3(i * CELL, 0, j * CELL); }

function place() {
  const { i, j } = cursor;
  if (!town.canBuild(i, j)) { blip("yuck"); setToast(town.heightOf(i, j) >= MAX_H ? "That one's as tall as it gets." : "Build closer to the middle."); return; }
  const before = town.heightOf(i, j), water = terra.heightAt(i * CELL, j * CELL) < 0.35;
  const col = town.add(i, j);
  stats.placed++; if (!stats.firstAt) stats.firstAt = +(dayT * DAY_SECONDS).toFixed(1);
  if (col) pops.push({ obj: col, t: 0 });
  puff(i, j, town.topY(i, j));
  me.hop = 1; blip("pop");
  if (!stats.placed || stats.placed === 1) note("Laid the first stone of a new town.");
  if (water && before === 0) { stats.piers++; if (stats.piers === 1) note("Built out over the water on a pier."); }
  const s = town.summary();
  if (s.tallest > lastTall) { lastTall = s.tallest; if (s.tallest === 3) note("Stacked a house three floors high."); if (s.tallest === MAX_H) { note("Built as high as the sky allows."); setToast("Max height! The clouds say hi."); } }
  if (s.towers > stats.towers) { stats.towers = s.towers; note(s.towers === 1 ? "Raised a lone tower with a spire." : `Raised tower number ${s.towers}.`); }
}

function removeTop() {
  const { i, j } = cursor;
  if (!town.remove(i, j)) return false;
  stats.removed++; blip("whoosh"); puff(i, j, town.topY(i, j));
  if (stats.removed === 3) note("Started tearing things down to get them right.");
  return true;
}

function puff(i, j, y) {
  for (let k = 0; k < 7; k++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    m.position.set(i * CELL + (Math.random() - 0.5) * CELL, y + 0.2, j * CELL + (Math.random() - 0.5) * CELL);
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3);
    view.scene.add(m); puffs.push({ m, t: 0 });
  }
}

export const worldScene = {
  enter() {
    build(); stage.view = view;
    t = 0; dayT = 0; holdT = 0; holdFired = false; pops = []; puffs = []; ending = false; endT = 0; toast = null; lastTall = 0; glowSet = false;
    stats = game.stats = { placed: 0, removed: 0, piers: 0, towers: 0, firstAt: 0 };
    const w = game.life.world;
    game.life.world = { ...w };
    music(lookOf(w.biome, w.look).notes); ambience("quiet");
    setToast(`Welcome to ${w.name}. Build something.`);
    if (new URLSearchParams(location.search).has("debug")) window.evolWorld = { town: () => town, cursor: () => cursor, setDay: v => { dayT = v; }, build: (i, j, n = 1) => { cursor.i = i; cursor.j = j; cursor.x = i * CELL; cursor.z = j * CELL; for (let k = 0; k < n; k++) place(); } };
  },
  exit() { music(null); },
  update(dt) {
    t += dt; terra.update(dt);
    if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
    const cam = view.camera;

    // ----- End of the day: pull back to see the whole town, then write the diary -----
    if (ending) {
      endT += dt;
      cam.position.lerp(new THREE.Vector3(10, 55, 70), dt * 0.9); cam.lookAt(0, 2, 0);
      tick(dt);
      if (endT > 3.2) { game.town = town.summary(); game.townCells = [...town.cells.entries()]; Object.assign(game.stats, game.town); note(`Ended the day with ${game.town.floors || 0} floors in ${game.town.columns || 0} buildings.`); go("diary", { photo: stage.snapshot() }); }
      return;
    }
    dayT = Math.min(1, dayT + dt / DAY_SECONDS);
    if (dayT >= 1) { ending = true; ghost.visible = false; setToast("Night falls on your town."); return; }

    // ----- Cursor -----
    const mx = Math.abs(Input.x) > 0.12 ? Input.x : 0, mz = Math.abs(Input.y) > 0.12 ? Input.y : 0;
    cursor.x += mx * CURSOR_SPEED * dt; cursor.z += mz * CURSOR_SPEED * dt;
    const r = Math.hypot(cursor.x, cursor.z), lim = BUILD_RADIUS - 1;
    if (r > lim) { cursor.x *= lim / r; cursor.z *= lim / r; }
    cursor.i = Math.round(cursor.x / CELL); cursor.j = Math.round(cursor.z / CELL);
    const top = town.topY(cursor.i, cursor.j), full = town.heightOf(cursor.i, cursor.j) >= MAX_H;
    ghost.position.lerp(new THREE.Vector3(cursor.i * CELL, top, cursor.j * CELL), Math.min(1, dt * 18));
    ghost.userData.block.material.opacity = 0.18 + Math.sin(t * 5) * 0.08;
    ghost.userData.block.material.color.set(full ? 0xff8a7a : 0xffffff);

    // ----- Tap to build, hold to take away -----
    if (Input.held()) {
      holdT += dt;
      if (holdT > HOLD && !holdFired) { holdFired = true; removeTop(); }
      else if (holdFired && holdT > HOLD + 0.35) { holdT = HOLD; removeTop(); }
    } else {
      if (holdT > 0 && !holdFired) place();
      holdT = 0; holdFired = false;
    }

    // ----- Camera follows the cursor from above, pulling back as the town grows -----
    const s = Math.min(1, lastTall / MAX_H);
    cam.position.lerp(new THREE.Vector3(cursor.x * 0.8 - 5, 12 + s * 9, cursor.z * 0.8 + 23 + s * 6), dt * 2.5);
    cam.lookAt(cursor.x * 0.85, 3 + s * 4, cursor.z * 0.85 - 1);

    // ----- Day turns to dusk: the sun lowers and warms, windows light up -----
    const dusk = clamp((dayT - 0.6) / 0.4, 0, 1);
    sky.sun.intensity = light0.sun * (1 - dusk * 0.6); sky.hemi.intensity = light0.hemi * (1 - dusk * 0.45);
    sky.sun.color.copy(light0.sunColor).lerp(new THREE.Color(0xff9a5a), dusk);
    view.exposure = 0.78 - dusk * 0.08;
    if (dayT > 0.78 && !glowSet) { glowSet = true; town.setGlow(1); setToast("The lights are coming on."); }

    tick(dt);
  },
  draw(g) {
    const w = game.life.world, look = lookOf(w.biome, w.look);
    // HUD
    g.fillStyle = "rgba(30,26,46,0.55)"; rect(g, 24, 20, 340, 92, 24); g.fill();
    g.textAlign = "left"; g.fillStyle = UI.white; g.font = font(28, 700, FONT.title); g.fillText(w.name, 46, 58);
    g.font = font(14, 600); g.fillStyle = "rgba(255,255,255,0.75)"; g.fillText(look.label.toUpperCase(), 47, 80);
    g.fillStyle = "rgba(255,255,255,0.22)"; rect(g, 46, 90, 290, 8, 4); g.fill();
    g.fillStyle = dayT > 0.6 ? "#ffab6a" : "#ffe59a"; rect(g, 46, 90, 290 * (1 - dayT) + 0.01, 8, 4); g.fill();
    const sm = town.summary();
    const hud = `${sm.floors || 0} floors   ·   ${sm.columns || 0} buildings   ·   tallest ${sm.tallest || 0}`;
    g.font = font(18, 600); const hw = g.measureText(hud).width + 44;
    g.fillStyle = "rgba(30,26,46,0.55)"; rect(g, W - 24 - hw, 20, hw, 46, 23); g.fill();
    g.fillStyle = UI.white; g.textAlign = "right"; g.fillText(hud, W - 46, 50);
    if (toast) { g.globalAlpha = clamp(toast.t, 0, 1); g.fillStyle = "rgba(255,250,240,0.92)"; g.font = font(21, 600); const tw = g.measureText(toast.text).width + 60; rect(g, W / 2 - tw / 2, 120, tw, 48, 24); g.fill(); g.fillStyle = UI.ink; g.textAlign = "center"; g.fillText(toast.text, W / 2, 151); g.globalAlpha = 1; }
    // Hold-to-remove progress ring on the cursor
    if (Input.held() && holdT > 0.08 && !ending) { const p = stage.toScreen(ghost.position.clone().add(new THREE.Vector3(0, 3, 0))); if (p) { g.strokeStyle = "#ff7a6a"; g.lineWidth = 6; g.beginPath(); g.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.min(1, holdT / HOLD) * Math.PI * 2); g.stroke(); } }
    if (!ending) hint(g, "Joystick: move   ·   Tap: build   ·   Hold: take away");
    if (!game.life.fromAI) { g.fillStyle = "rgba(255,255,255,0.7)"; g.font = font(14, 500); g.textAlign = "left"; g.fillText("AI unavailable: world built offline", 20, H - 16); }
  }
};

/** Animations shared by building and the ending: popping floors, dust, and your creature. */
function tick(dt) {
  for (const p of pops) { p.t += dt; const k = Math.min(1, p.t / 0.35); p.obj.scale.set(1 + Math.sin(k * Math.PI) * 0.08, 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.1, 1 + Math.sin(k * Math.PI) * 0.08); }
  pops = pops.filter(p => p.t < 0.35);
  for (const p of puffs) { p.t += dt; p.m.position.addScaledVector(p.m.userData.v, dt); p.m.scale.setScalar(1 + p.t * 2); p.m.material.opacity = Math.max(0, 0.8 - p.t * 1.4); }
  puffs = puffs.filter(p => { if (p.t > 0.6) { view.scene.remove(p.m); return false; } return true; });
  // Your creature trots to a spot just in front of the cursor, on the ground or a pier
  const tx = cursor.x + 1.2, tz = cursor.z + CELL * 0.9, dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz);
  if (d > 0.3) { const sp = Math.min(d, dt * 16); me.x += dx / d * sp; me.z += dz / d * sp; me.obj.rotation.y = Math.atan2(dx, dz); }
  else me.obj.rotation.y += (Math.atan2(cursor.x - me.x, cursor.z - me.z) - me.obj.rotation.y) * Math.min(1, dt * 4);
  me.hop = Math.max(0, me.hop - dt * 2.5);
  const ci = Math.round(me.x / CELL), cj = Math.round(me.z / CELL);
  const ground = town.heightOf(ci, cj) ? town.topY(ci, cj) : Math.max(0.5, terra.heightAt(me.x, me.z));
  me.obj.position.set(me.x, ground + Math.sin(me.hop * Math.PI) * 1.4 + (d > 0.3 ? Math.abs(Math.sin(t * 14)) * 0.25 : 0), me.z);
  M.animateCreature(me.inner, t, d > 0.3);
}
