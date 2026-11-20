// Your world: a whole world generated from your seed (like Minecraft), drawn like Tiny Glade, where you build
// a city. Lay roads, zone homes, shops, offices and parks; buildings grow taller on their own when their
// neighborhood has what people want, and cars start driving your streets. Your evolution decided the land and
// your building colors; how you planned your city is what Dr. Wobble reads at the end of the day.
//
// Controls: joystick moves the cursor. Tap places the current tool. Hold opens the tool wheel (left/right to
// pick, let go to choose). With the road tool, tap starts drawing a road as you move; tap again to stop.

import { Input } from "../core/input.js";
import { go, game, note } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, hint, clamp, rect, sticker } from "../core/draw.js";
import { UI, FONT, BODY_COLORS } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeWorld, gladeSky, BUILD_RADIUS, weather } from "../gfx/terrain.js";
import { CELL } from "../gfx/town.js";
import { makeCity, TOOLS } from "../gfx/city.js";
import { lookOf, defaultPalette } from "../gfx/biomes.js";
import * as M from "../gfx/models.js";
import { alien, animateAlien } from "../gfx/alien.js";
import { blip, music, ambience } from "../core/audio.js";
import { outfit, makeTreasures, makeCritters, GEAR } from "../gfx/wilds.js";

const THREE = window.THREE;
const QUICK = new URLSearchParams(location.search).has("quick");
const DAY_SECONDS = QUICK ? 120 : 270;
const CURSOR_SPEED = 12, HOLD = 0.3;
const MILESTONES = [[12, "Your first neighbors moved in!", "Welcomed the first neighbors."], [60, "It's a real neighborhood now.", "Grew a real neighborhood."], [150, "A town! People are talking.", "Grew into a proper town."], [300, "City status. Look at you.", "Reached city size."]];

let gear, treasures, critters, rainfall, fixedCam = null, hideHud = false;
let view, terra, sky, city, cursor, ghost, me, t, dayT, holdT, wheel, tool, drawing, lastCell, growT, pops, puffs, ending, endT, toast, stats, glowSet, light0, milestone;

function build() {
  const w = game.life.world;
  const scene = new THREE.Scene();
  terra = makeWorld(w.biome, makeRng(game.seed ^ 0x9e3779b9), { look: w.look });
  scene.add(terra.group);
  sky = gladeSky(scene, terra.biome, { key: w.biome });
  rainfall = weather(scene, w.biome);
  light0 = { sun: sky.sun.intensity, hemi: sky.hemi.intensity, sunColor: sky.sun.color.clone() };
  city = makeCity(terra, w.palette || defaultPalette(w.biome), {
    onGrow: (i, j, c, g) => { if (g) pops.push({ obj: g, t: 0 }); puff(i, j, city.topY(i, j)); blip("pop"); }
  });
  scene.add(city.group);

  // Cursor: a see-through tile showing where the tool will land
  cursor = { x: 0, z: 0, i: 0, j: 0 };
  ghost = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.6, CELL), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
  block.position.y = 0.3; ghost.add(block);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL, 0.6, CELL)), new THREE.LineBasicMaterial({ color: 0xffffff }));
  edge.position.y = 0.3; ghost.add(edge);
  ghost.userData.block = block;
  scene.add(ghost);

  // You: your creature trots along beside the cursor and hops when you build
  const color = BODY_COLORS[game.life.creature.color];
  me = { obj: new THREE.Group(), x: 0, z: 4, hop: 0 };
  const c = alien(game.life.creature.body, { scale: 0.62, color });
  c.rotation.y = -Math.PI / 2; me.obj.add(c); me.inner = c;
  c.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(me.obj);
  // Your evolved alien is the builder here: it starts in a hard hat
  gear = outfit(c); gear.wear("hardhat");

  // Life in the world: wandering creatures and hidden treasures
  const wrng = makeRng(game.seed ^ 0x51ed27);
  critters = makeCritters(terra, wrng, (color, r) => { const o = new THREE.Group(); const b = M.creature({ shape: r.pick(["round", "blob", "long"]), eyes: 2, limbs: 4, limbType: "legs", features: [r.pick(["antennae", "frills", "horns"])] }, { scale: 0.3, color }); b.rotation.y = -Math.PI / 2; o.add(b); return o; });
  treasures = makeTreasures(terra, wrng, 8);
  scene.add(critters.group, treasures.group);

  const camera = makeCamera(42);
  camera.position.set(-5, 24, 30); camera.lookAt(0, 0, 0);
  view = { scene, camera, tone: true, exposure: 0.78 };
}

function setToast(text) { toast = { text, t: 3.4 }; }

function use(i, j) {
  const before = city.get(i, j);
  // Bulldozing wild land clears the trees and rocks
  if (tool === "bulldoze" && !before) {
    if (terra.clearAt(i, j)) { stats.cleared = (stats.cleared || 0) + 1; puff(i, j, city.topY(i, j)); blip("whoosh"); if (stats.cleared === 1) note("Cleared some wild land."); return true; }
  }
  const natural = terra.hasNature(i, j);
  const why = city.place(i, j, tool);
  if (!why && tool !== "bulldoze" && natural) { terra.clearAt(i, j); stats.cleared = (stats.cleared || 0) + 1; }
  if (why) { if (!drawing) { blip("yuck"); setToast(why); } return false; }
  const after = city.get(i, j);
  if (before && after && before.type === after.type) return false;
  stats.actions++;
  if (!stats.first) { stats.first = tool; stats.firstAt = +(dayT * DAY_SECONDS).toFixed(1); note(`Started the city with ${tool === "road" ? "a road" : tool === "park" ? "a park" : tool === "house" ? "homes" : tool === "shop" ? "a shop" : "an office"}.`); }
  if (tool === "bulldoze") { stats.bulldozed++; blip("whoosh"); if (stats.bulldozed === 4) note("Started tearing things down to replan."); }
  else {
    stats.placed[tool] = (stats.placed[tool] || 0) + 1;
    if (stats.placed[tool] === 1 && tool !== "road") note({ house: "Zoned the first homes.", shop: "Opened the first shop.", office: "Put up an office building.", park: "Planted a park." }[tool]);
    if (tool === "road" && city.isWater(i, j) && !stats.bridge) { stats.bridge = true; note("Built a bridge across the water."); }
    if (city.needsRoad(i, j) && !stats.warnedRoad) { stats.warnedRoad = true; setToast("Buildings need a road next to them to grow."); }
    blip("pop");
  }
  puff(i, j, city.topY(i, j)); me.hop = 1;
  return true;
}

function puff(i, j, y) {
  for (let k = 0; k < 6; k++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    m.position.set(i * CELL + (Math.random() - 0.5) * CELL, y + 0.2, j * CELL + (Math.random() - 0.5) * CELL);
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3);
    view.scene.add(m); puffs.push({ m, t: 0 });
  }
}

export const worldScene = {
  enter() {
    build(); stage.view = view;
    t = 0; dayT = 0; holdT = 0; wheel = false; tool = "road"; drawing = false; lastCell = ""; growT = 0; pops = []; puffs = []; ending = false; endT = 0; toast = null; glowSet = false; milestone = 0;
    stats = game.stats = { actions: 0, bulldozed: 0, placed: {}, first: null, firstAt: 0, found: [] };
    const w = game.life.world;
    music(lookOf(w.biome, w.look).notes); ambience("quiet");
    setToast(`You're the builder of ${w.name}. Lay a road, or go find the sparkles.`);
    if (new URLSearchParams(location.search).has("debug")) window.evolWorld = { city: () => city, cursor: () => cursor, treasures: () => treasures, wear: id => gear.wear(id), me: () => me,
      setCam: (p, l) => { fixedCam = p ? { p: new THREE.Vector3(...p), l: new THREE.Vector3(...l) } : null; }, hideHud: v => { hideHud = v; ghost.visible = !v; }, setDay: v => { dayT = v; }, grow: n => { for (let k = 0; k < n; k++) city.grow(); },
      build: (type, cellsList) => { const prev = tool; tool = type; for (const [i, j] of cellsList) use(i, j); tool = prev; } };
  },
  exit() { music(null); },
  update(dt) {
    t += dt; terra.update(dt); city.update(dt); rainfall.update(dt, cursor.x, cursor.z);
    if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
    const cam = view.camera;

    // ----- End of the day: pull back to see the whole city, then write the diary -----
    if (ending) {
      endT += dt;
      cam.position.lerp(new THREE.Vector3(8, 40, 48), dt * 0.9); cam.lookAt(0, 2, 0);
      tick(dt);
      if (endT > 3.2) {
        const sum = city.summary();
        game.town = sum; game.townCells = [...city.cells.entries()].map(([k, c]) => [k, c]);
        Object.assign(game.stats, sum, { placed: undefined }, Object.fromEntries(Object.entries(stats.placed).map(([k, v]) => ["placed_" + k, v])));
        note(`Ended the day with ${sum.population} people, ${sum.jobs} jobs and ${sum.roads} road tiles, wearing ${gear.worn().map(id => GEAR[id].name).join(", ")}.`);
        game.stats.found = stats.found.length; game.stats.wearing = gear.worn().join(",");
        go("diary", { photo: stage.snapshot() });
      }
      return;
    }
    dayT = Math.min(1, dayT + dt / DAY_SECONDS);
    if (dayT >= 1) { ending = true; ghost.visible = false; drawing = false; setToast("Night falls on your city."); return; }

    // ----- Tool wheel: hold the button, flick left/right, let go -----
    if (Input.held()) { holdT += dt; if (holdT > HOLD && !wheel) { wheel = true; drawing = false; blip("talk"); } }
    if (wheel) {
      const tap = Input.tapped();
      if (tap.x) { const n = TOOLS.findIndex(o => o.id === tool); tool = TOOLS[(n + tap.x + TOOLS.length) % TOOLS.length].id; blip("talk"); }
      if (!Input.held()) { wheel = false; holdT = 0; setToast(TOOLS.find(o => o.id === tool).label + (tool === "road" ? ": tap to start drawing, tap again to stop" : "")); }
    } else {
      if (!Input.held() && holdT > 0) {
        // a quick tap: use the tool (roads toggle drawing)
        if (tool === "road") { drawing = !drawing; if (drawing) { lastCell = ""; } }
        else use(cursor.i, cursor.j);
        holdT = 0;
      }
      // ----- Cursor -----
      const mx = Math.abs(Input.x) > 0.12 ? Input.x : 0, mz = Math.abs(Input.y) > 0.12 ? Input.y : 0;
      cursor.x += mx * CURSOR_SPEED * dt; cursor.z += mz * CURSOR_SPEED * dt;
      const r = Math.hypot(cursor.x, cursor.z), lim = BUILD_RADIUS;
      if (r > lim) { cursor.x *= lim / r; cursor.z *= lim / r; }
      cursor.i = Math.round(cursor.x / CELL); cursor.j = Math.round(cursor.z / CELL);
      const k = cursor.i + "," + cursor.j;
      if (drawing && k !== lastCell) { lastCell = k; use(cursor.i, cursor.j); }
    }
    ghost.position.lerp(new THREE.Vector3(cursor.i * CELL, city.topY(cursor.i, cursor.j), cursor.j * CELL), Math.min(1, dt * 18));
    ghost.userData.block.material.opacity = 0.2 + Math.sin(t * 5) * 0.08;
    ghost.userData.block.material.color.set({ road: 0xc8d0dc, house: 0xffe8c8, shop: 0xffd0a0, office: 0xb8d0ff, park: 0xb8f0a0, bulldoze: 0xff8a7a }[tool]);

    // ----- The city grows on its own -----
    growT += dt;
    if (growT > (QUICK ? 0.8 : 1.4)) { growT = 0; city.grow(); }
    const st = city.stats();
    while (milestone < MILESTONES.length && st.population >= MILESTONES[milestone][0]) { setToast(MILESTONES[milestone][1]); note(MILESTONES[milestone][2]); blip("yay"); milestone++; }

    // ----- Camera follows the cursor from above -----
    if (fixedCam) { cam.position.copy(fixedCam.p); cam.lookAt(fixedCam.l); }
    else { cam.position.lerp(new THREE.Vector3(cursor.x * 0.7 - 8, 34, cursor.z * 0.7 + 40), dt * 2.5); cam.lookAt(cursor.x * 0.8, 0, cursor.z * 0.8 - 3); }

    // ----- Day turns to dusk: the sun lowers and warms, windows light up -----
    const dusk = clamp((dayT - 0.6) / 0.4, 0, 1);
    sky.sun.intensity = light0.sun * (1 - dusk * 0.6); sky.hemi.intensity = light0.hemi * (1 - dusk * 0.45);
    sky.sun.color.copy(light0.sunColor).lerp(new THREE.Color(0xff9a5a), dusk);
    view.exposure = 0.78 - dusk * 0.08;
    if (dayT > 0.8 && !glowSet) { glowSet = true; city.town.setGlow(1); setToast("The lights are coming on."); }

    // ----- Exploring: creatures scatter, treasures get found -----
    critters.update(dt, me); treasures.update(t);
    const tr = treasures.check(me.x, me.z);
    if (tr) { gear.wear(tr.id); stats.found.push(tr.id); blip("yay"); setToast(`You found ${GEAR[tr.id].name}! Your builder put it on.`); note(`Found ${GEAR[tr.id].name} out in the wild and wore it.`); }

    tick(dt);
  },
  draw(g) {
    if (hideHud) return;
    const w = game.life.world, look = lookOf(w.biome, w.look), st = city.stats();
    // World name and the day
    g.fillStyle = "rgba(30,26,46,0.55)"; rect(g, 24, 20, 340, 92, 24); g.fill();
    g.textAlign = "left"; g.fillStyle = UI.white; g.font = font(28, 700, FONT.title); g.fillText(w.name, 46, 58);
    g.font = font(14, 600); g.fillStyle = "rgba(255,255,255,0.75)"; g.fillText(look.label.toUpperCase(), 47, 80);
    g.fillStyle = "rgba(255,255,255,0.22)"; rect(g, 46, 90, 290, 8, 4); g.fill();
    g.fillStyle = dayT > 0.6 ? "#ffab6a" : "#ffe59a"; rect(g, 46, 90, 290 * (1 - dayT) + 0.01, 8, 4); g.fill();
    // City numbers
    const hud = `👥 ${st.population}   ·   💼 ${st.jobs} jobs   ·   😊 ${st.homes ? st.happiness + "%" : "-"}   ·   🎁 ${stats.found.length}/8`;
    g.font = font(19, 600); const hw = g.measureText(hud).width + 44;
    g.fillStyle = "rgba(30,26,46,0.55)"; rect(g, W - 24 - hw, 20, hw, 46, 23); g.fill();
    g.fillStyle = UI.white; g.textAlign = "right"; g.fillText(hud, W - 46, 50);
    // "Needs a road" markers
    for (const [k] of city.cells) { const [i, j] = k.split(",").map(Number); if (!city.needsRoad(i, j)) continue; const p = stage.toScreen(new THREE.Vector3(i * CELL, city.topY(i, j) + 1.5, j * CELL)); if (p) sticker(g, p.x, p.y, 34, "🚧"); }
    if (toast) { g.globalAlpha = clamp(toast.t, 0, 1); g.fillStyle = "rgba(255,250,240,0.92)"; g.font = font(21, 600); const tw = g.measureText(toast.text).width + 60; rect(g, W / 2 - tw / 2, 120, tw, 48, 24); g.fill(); g.fillStyle = UI.ink; g.textAlign = "center"; g.fillText(toast.text, W / 2, 151); g.globalAlpha = 1; }
    // Tool bar (the wheel opens it big)
    if (!ending) {
      const n = TOOLS.length, size = wheel ? 78 : 52, gap = wheel ? 26 : 12, total = n * size + (n - 1) * gap, x0 = W / 2 - total / 2 + size / 2, y = wheel ? 600 : 650;
      g.fillStyle = wheel ? "rgba(255,250,240,0.95)" : "rgba(30,26,46,0.5)"; rect(g, W / 2 - total / 2 - 24, y - size / 2 - 18, total + 48, size + (wheel ? 60 : 36), 26); g.fill();
      TOOLS.forEach((o, i) => {
        const on = o.id === tool, x = x0 + i * (size + gap);
        sticker(g, x, y, on ? size * 1.1 : size, o.icon, { ring: on ? UI.red : null });
        if (wheel) { g.fillStyle = on ? UI.red : UI.ink; g.font = font(15, on ? 700 : 500); g.textAlign = "center"; g.fillText(o.label, x, y + size / 2 + 26); }
      });
      if (!wheel) {
        g.textAlign = "left"; g.font = font(15, 600); g.fillStyle = UI.white;
        g.fillText(drawing ? "Drawing road... tap to stop" : "Tap: use   ·   Hold: tools", W / 2 + total / 2 + 36, y + 5);
      }
    }
    if (Input.held() && holdT > 0.05 && !wheel && !ending) { const p = stage.toScreen(ghost.position.clone().add(new THREE.Vector3(0, 2, 0))); if (p) { g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.beginPath(); g.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.min(1, holdT / HOLD) * Math.PI * 2); g.stroke(); } }
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
  if (fixedCam) { /* screenshot mode: hold the pose */ }
  else if (d > 0.3) { const sp = Math.min(d, dt * 16); me.x += dx / d * sp; me.z += dz / d * sp; me.obj.rotation.y = Math.atan2(dx, dz); }
  else me.obj.rotation.y += (Math.atan2(cursor.x - me.x, cursor.z - me.z) - me.obj.rotation.y) * Math.min(1, dt * 4);
  me.hop = Math.max(0, me.hop - dt * 2.5);
  const ci = Math.round(me.x / CELL), cj = Math.round(me.z / CELL);
  const cc = city.get(ci, cj), ground = cc && cc.level ? city.topY(ci, cj) : Math.max(0.5, terra.heightAt(me.x, me.z)) + (cc ? 0.15 : 0);
  me.obj.position.set(me.x, ground + Math.sin(me.hop * Math.PI) * 1.4 + (d > 0.3 ? Math.abs(Math.sin(t * 14)) * 0.25 : 0), me.z);
  animateAlien(me.inner, t, d > 0.3);
}
