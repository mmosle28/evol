// The pond: one short life as a fish, in real time. A seed lays out the pond and picks which events happen this life.
// The game quietly records what you do; those traits are all the AI gets when deciding what you become.

import { Input } from "../core/input.js";
import { go, game } from "../core/game.js";
import { makeRng } from "../core/rng.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, box, hint, clamp, dist2 } from "../core/draw.js";
import { UI, FONT, PAL } from "../core/palette.js";
import { makeSky } from "../gfx/sky.js";
import * as M from "../gfx/models.js";
import { blip, ambience } from "../core/audio.js";

const THREE = window.THREE;
const QUICK = new URLSearchParams(location.search).has("quick");
const LIFE = QUICK ? 35 : 75;          // seconds of pond time
const PX = 60, PZ = 40;                // pond half-size
const DEEP_R = 26;                     // the dark middle of the pond
const EVENTS = ["frog", "turtle", "eggs", "net", "hook", "trapped", "rain"];

let rng, view, sky, root, t, real, phase, endT, log, pops, tr, visited;
let fish, pike, heron, school, bugs, weeds, items, reedSpots, ev;

function freshTraits(present) {
  return {
    present,
    plants: 0, bugs: 0, minnows: 0, crayfish: 0, eggsEaten: 0, bites: 0,
    tailLost: false, scars: 0, pikeBitten: 0, pikeEscapes: 0,
    frogBitten: 0, turtleTime: 0, turtleBitten: 0, eggsGuarded: false,
    netCaught: 0, hooked: 0, escapedHook: 0, caughtByAngler: 0,
    freedFish: false, ignoredTrapped: false, rainBugs: 0,
    items: [], explored: 0, shallowTime: 0, deepTime: 0, hideTime: 0, schoolTime: 0, stillTime: 0, dangerTime: 0,
    events: []
  };
}

function say(text, red = false) {
  log.unshift({ text, age: 0, red });
  log.length = Math.min(log.length, 4);
  tr.events.push(`${Math.round(t)}s: ${text}`);
}
function pop(text, pos) { pops.push({ text, pos: pos.clone(), age: 0 }); }

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const place = (obj, x, y, z) => { obj.position.set(x, y, z); root.add(obj); return obj; };
/** Keep a point inside the pond's oval, `margin` units from the rim. */
function inPond(o, margin = 3) {
  const ax = PX - margin, az = PZ - margin, k = (o.x * o.x) / (ax * ax) + (o.z * o.z) / (az * az);
  if (k > 1) { const s = 1 / Math.sqrt(k); o.x *= s; o.z *= s; }
  return o;
}
const randPos = (margin = 6) => { for (let i = 0; i < 50; i++) { const p = { x: rng.range(-PX, PX), z: rng.range(-PZ, PZ) }; const ax = PX - margin, az = PZ - margin; if ((p.x * p.x) / (ax * ax) + (p.z * p.z) / (az * az) < 1) return p; } return { x: 0, z: 0 }; };
const inDeep = p => Math.hypot(p.x, p.z * 1.4) < DEEP_R;

// ---------- Build ----------
function build() {
  rng = makeRng(game.seed);
  const scene = new THREE.Scene();
  sky = makeSky(scene, rng, { clouds: 12, cloudHeight: 70 });
  sky.setTime(0.45, { x: 0, z: 0 });
  root = new THREE.Group(); scene.add(root);

  // Pond basin: pale floor, a darker deep middle, stone rim, and a glassy surface
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PX * 2 + 20, PZ * 2 + 20), new THREE.MeshStandardMaterial({ color: 0x3fb8a8, roughness: 1, flatShading: true }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const deep = new THREE.Mesh(new THREE.CircleGeometry(DEEP_R, 32), new THREE.MeshStandardMaterial({ color: 0x1f7f9a, roughness: 1 }));
  deep.rotation.x = -Math.PI / 2; deep.scale.y = 1 / 1.4; deep.position.y = 0.02; deep.receiveShadow = true; root.add(deep);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(PX * 2 + 4, PZ * 2 + 4), new THREE.MeshStandardMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.15, roughness: 0.1, metalness: 0.2, depthWrite: false }));
  surface.rotation.x = -Math.PI / 2; surface.position.y = 6; root.add(surface);
  for (let i = 0; i < 70; i++) {
    const a = i / 70 * Math.PI * 2;
    const r = M.rock(2 + rng() * 2.5);
    place(r, Math.cos(a) * (PX + 3), 3, Math.sin(a) * (PZ + 3));
  }
  for (let i = 0; i < 6; i++) { const p = randPos(); place(M.lilypad(1.4 + rng() * 1.2), p.x, 6.05, p.z); }
  for (let i = 0; i < 10; i++) { const p = randPos(); place(M.rock(0.8 + rng() * 1.4), p.x, 0.3, p.z); }
  // The world around the pond (seen at the edges)
  const landShape = new THREE.Shape(); landShape.moveTo(-320, -320); landShape.lineTo(320, -320); landShape.lineTo(320, 320); landShape.lineTo(-320, 320); landShape.lineTo(-320, -320);
  const holePath = new THREE.Path(); holePath.absellipse(0, 0, PX + 3, PZ + 3, 0, Math.PI * 2, true); landShape.holes.push(holePath);
  const land = new THREE.Mesh(new THREE.ShapeGeometry(landShape, 48), new THREE.MeshStandardMaterial({ color: PAL.grass, roughness: 1, flatShading: true }));
  land.rotation.x = -Math.PI / 2; land.position.y = 6.2; land.receiveShadow = true; root.add(land);
  for (let i = 0; i < 10; i++) { const tt = M.tree(rng); tt.scale.setScalar(2.4); const a = rng() * Math.PI * 2; place(tt, Math.cos(a) * 95, 6, Math.sin(a) * 80); }

  // Reeds: hiding places
  reedSpots = [];
  for (let i = 0; i < rng.int(2, 3); i++) { const p = randPos(12); const r = M.reeds(); r.scale.setScalar(1.5); place(r, p.x, 0, p.z); reedSpots.push({ x: p.x, z: p.z, r: 7 }); }

  // Pondweed to eat
  weeds = [];
  for (let i = 0; i < 12; i++) { const p = randPos(); const w = M.weed(); place(w, p.x, 0, p.z); weeds.push({ obj: w, x: p.x, z: p.z, bites: 2 }); }

  // Water bugs near the surface
  bugs = [];
  for (let i = 0; i < 8; i++) addBug(randPos(), false);

  // A school of minnows
  school = { x: rng.range(-30, 30), z: rng.range(-20, 20), vx: 7, fish: [] };
  for (let i = 0; i < 7; i++) { const m = M.fish({ scale: 0.45, color: 0x9fd6e8 }); root.add(m); school.fish.push({ obj: m, ox: rng.range(-5, 5), oz: rng.range(-3, 3), alive: true }); }

  // The pike
  pike = { obj: M.fish({ scale: 2.8, color: 0x5d7d3a }), x: rng.pick([-45, 45]), z: rng.range(-20, 20), vx: 0, vz: 0, mode: "patrol", target: randPos(), cool: 0, flee: 0 };
  root.add(pike.obj);

  // The heron's shadow
  heron = { next: rng.range(12, 18), warn: 0, x: 0, z: 0, r: 7, obj: new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })) };
  heron.obj.rotation.x = -Math.PI / 2; heron.obj.position.y = 0.1; root.add(heron.obj);

  // Things to pick up
  items = [];
  const kinds = ["stick", "shell", "glowing stone", "bottle cap"];
  const n = rng.int(2, 3);
  for (let i = 0; i < n; i++) { const kind = kinds[(game.seed + i) % kinds.length]; const p = randPos(); const o = M.item(kind); place(o, p.x, kind === "stick" ? 5.6 : 0.6, p.z); items.push({ kind, obj: o, x: p.x, z: p.z, taken: false }); }

  // This life's random events (the seed decides which happen)
  const pool = [...EVENTS].sort(() => rng() - 0.5);
  const present = pool.slice(0, 4);
  ev = { present };
  if (present.includes("frog")) { const p = randPos(10); ev.frog = { obj: M.frog(), x: p.x, z: p.z, hop: 0, snap: rng.range(4, 8) }; place(ev.frog.obj, p.x, 5.7, p.z); }
  if (present.includes("turtle")) { const p = randPos(10); ev.turtle = { obj: M.turtle(), x: p.x, z: p.z, ang: 0, hide: 0 }; place(ev.turtle.obj, p.x, 1.2, p.z); }
  if (present.includes("eggs")) { const p = randPos(12); ev.eggs = { obj: M.eggs(), x: p.x, z: p.z, left: 9, guardT: 0 }; place(ev.eggs.obj, p.x, 0.4, p.z); ev.cray = { obj: M.crayfish(), x: p.x + 25, z: p.z, alive: true, mode: "wander", t: rng.range(15, 25) }; inPond(ev.cray, 6); place(ev.cray.obj, ev.cray.x, 0.6, ev.cray.z); }
  if (present.includes("net")) ev.net = { obj: M.net(), next: rng.range(18, 28), phase: "idle", t: 0, x: 0, z: 0 };
  if (present.includes("net")) { ev.net.obj.visible = false; root.add(ev.net.obj); }
  if (present.includes("hook")) { const p = randPos(10); ev.hook = { obj: M.hook(), x: p.x, z: p.z, hooked: false, pull: 0, mash: 0, done: false }; place(ev.hook.obj, p.x, 3.2, p.z); }
  if (present.includes("trapped")) { const p = randPos(12); ev.trapped = { obj: M.fish({ scale: 0.9, color: 0xffd84a }), x: p.x, z: p.z, freed: false, seen: 0, line: new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 3, 10), M.mat(0xffffff)) }; place(ev.trapped.obj, p.x, 1.2, p.z); ev.trapped.line.rotation.x = Math.PI / 2; place(ev.trapped.line, p.x, 1.2, p.z); }
  if (present.includes("rain")) ev.rain = { at: rng.range(LIFE * 0.3, LIFE * 0.6), left: 12, on: false, drops: null };

  // The player
  fish = { obj: M.fish({ scale: 1.25, color: PAL.red }), x: 0, z: 10, vx: 0, vz: 0, heading: -Math.PI / 2, lunge: 0, hurt: 0, carrying: null, netted: 0 };
  root.add(fish.obj);

  const camera = makeCamera(50);
  view = { scene, camera };
}

function addBug(p, fromRain) {
  const b = { obj: M.bug(), x: p.x, z: p.z, vx: 0, vz: 0, turn: 0, alive: true, rain: fromRain };
  place(b.obj, p.x, 6.15, p.z);
  bugs.push(b);
}

// ---------- Scene ----------
export const pondScene = {
  enter() {
    build();
    stage.view = view;
    t = 0; real = 0; phase = "intro"; endT = 0; log = []; pops = []; visited = new Set();
    tr = freshTraits(ev.present);
    ambience("pond");
  },

  update(rdt) {
    real += rdt;
    sky.update(rdt);
    if (phase === "intro") { follow(rdt, true); if (real > 0.4 && Input.pressed()) phase = "live"; return; }
    if (phase === "end") { endT += rdt; follow(rdt); if (endT > 1 && Input.pressed()) { game.traits = tr; go("evolving"); } return; }

    const push = Math.hypot(Input.x, Input.y);
    const dt = rdt;
    if (push < 0.15) tr.stillTime += rdt;
    t += dt;
    for (const l of log) l.age += rdt;
    for (const p of pops) p.age += rdt;
    pops = pops.filter(p => p.age < 1.2);

    moveFish(rdt);
    trackPlace(rdt, dt);
    if (Input.pressed()) bite();
    updateBugs(dt); updateSchool(dt); updatePike(dt); updateHeron(dt); updateEvents(dt, rdt);
    for (const w of weeds) w.obj.rotation.z = Math.sin(t * 1.5 + w.x) * 0.08;
    follow(rdt);
    if (t >= LIFE || real > LIFE * 2.4) finish();
  },

  draw(g) {
    // Floating pops (+bug, ouch)
    for (const p of pops) {
      const s = stage.toScreen(p.pos.clone().add(v3(0, 4 + p.age * 3, 0)));
      if (!s) continue;
      g.globalAlpha = 1 - p.age / 1.2; g.fillStyle = UI.red; g.font = font(24, 900); g.textAlign = "center"; g.fillText(p.text, s.x, s.y);
    }
    g.globalAlpha = 1;
    // Life bar
    g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(0, 0, W, 10);
    g.fillStyle = UI.red; g.fillRect(0, 0, W * Math.max(0, 1 - t / LIFE), 10);
    // Event feed
    g.textAlign = "left";
    log.forEach((l, i) => {
      g.globalAlpha = clamp(1 - (l.age - 3.5) / 1.5, 0, 1) * (1 - i * 0.15);
      g.font = font(24, 900);
      const w = g.measureText(l.text).width + 28;
      g.fillStyle = l.red ? UI.red : UI.ink; g.fillRect(24, 30 + i * 46, w, 38);
      g.fillStyle = UI.white; g.fillText(l.text, 38, 57 + i * 46);
    });
    g.globalAlpha = 1;
    if (phase === "live") {
      const still = Math.hypot(Input.x, Input.y) < 0.15 && fish.lunge <= 0;
      if (ev.hook && ev.hook.hooked) { g.fillStyle = UI.red; g.font = font(44, 900, FONT.title); g.textAlign = "center"; g.fillText("Hooked! Mash the button!", W / 2, 160); }
      hint(g, "Move: joystick   Bite / grab: button");
    }
    if (phase === "intro") {
      box(g, W / 2 - 400, H / 2 - 190, 800, 380);
      g.fillStyle = UI.red; g.font = font(64, 400, FONT.title); g.textAlign = "center";
      g.fillText("You are a small fish", W / 2, H / 2 - 100);
      g.fillStyle = UI.ink; g.font = font(24, 500);
      wrapText(g, "One short life in a pond, and the pond has plans for you. Eat, explore, pick things up, fight back or hide. Bite a pike from behind and it might flee. There's no right way to live: whatever you do shapes what you become.", W / 2, H / 2 - 40, 680, 34, "center");
      g.fillStyle = UI.red; g.font = font(22, 900);
      g.fillText("PRESS THE BUTTON TO START", W / 2, H / 2 + 150);
    }
    if (phase === "end") {
      g.fillStyle = "rgba(247,246,242,0.72)"; g.fillRect(0, 0, W, H);
      g.fillStyle = UI.red; g.font = font(80, 400, FONT.title); g.textAlign = "center";
      g.fillText("Something is changing", W / 2, H / 2 - 10);
      g.fillStyle = UI.ink; g.font = font(24, 700);
      g.fillText("Your time as a fish is over. Press the button to evolve.", W / 2, H / 2 + 44);
    }
  }
};

// ---------- Player ----------
function moveFish(rdt) {
  if (fish.netted > 0) { fish.netted -= rdt; return; }
  const top = (tr.tailLost ? 11 : 17) * (fish.lunge > 0 ? 2.3 : 1);
  fish.lunge = Math.max(0, fish.lunge - rdt);
  if (ev.hook && ev.hook.hooked) {
    // Being reeled toward the shore
    fish.vx = 0; fish.vz = -9;
  } else {
    const k = Math.min(1, rdt * 7);
    if (fish.lunge > 0) { fish.vx += (Math.cos(fish.heading) * top - fish.vx) * k; fish.vz += (Math.sin(fish.heading) * top - fish.vz) * k; }
    else { fish.vx += (Input.x * top - fish.vx) * k; fish.vz += (Input.y * top - fish.vz) * k; }
  }
  fish.x += fish.vx * rdt; fish.z += fish.vz * rdt;
  inPond(fish, 3);
  if (Math.hypot(fish.vx, fish.vz) > 1.5) fish.heading = Math.atan2(fish.vz, fish.vx);
  fish.hurt = Math.max(0, fish.hurt - rdt);
  fish.obj.position.set(fish.x, 2.4 + Math.sin(real * 3) * 0.15, fish.z);
  fish.obj.rotation.y = -fish.heading;
  fish.obj.visible = !(fish.hurt > 0 && Math.floor(fish.hurt * 14) % 2);
  if (fish.carrying) { fish.carrying.obj.position.set(fish.x + Math.cos(fish.heading) * 2.4, 2.4, fish.z + Math.sin(fish.heading) * 2.4); }
}

function hidden() {
  if (reedSpots.some(r => dist2(r, fish) < r.r)) return true;
  if (ev.turtle && dist2(ev.turtle, fish) < 3.2) return true;
  return false;
}

function trackPlace(rdt, dt) {
  if (hidden()) tr.hideTime += dt;
  if (inDeep(fish)) tr.deepTime += dt; else tr.shallowTime += dt;
  if (dist2(school, fish) < 9) tr.schoolTime += dt;
  if (ev.turtle && dist2(ev.turtle, fish) < 3.2) tr.turtleTime += dt;
  visited.add(Math.floor((fish.x + PX) / 15) + "," + Math.floor((fish.z + PZ) / 16));
}

function hurt(text) {
  if (fish.hurt > 0) return; // a moment of safety after each hit
  fish.hurt = 0.9; tr.scars++; blip("hurt"); Input.signal("b"); say(text, true); pop("ouch", fish.obj.position);
}

/** Pressing the button lunges forward and bites whatever is in front of you. */
function bite() {
  if (ev.hook && ev.hook.hooked) { ev.hook.mash++; blip("bite"); return; }
  tr.bites++; fish.lunge = 0.18; blip("bite");
  const mouth = { x: fish.x + Math.cos(fish.heading) * 2.6, z: fish.z + Math.sin(fish.heading) * 2.6 };
  const near = (o, r = 3.2) => dist2(o, mouth) < r;

  for (const it of items) if (!it.taken && near(it, 3.6)) {
    if (fish.carrying) { fish.carrying.taken = false; fish.carrying.x = fish.x; fish.carrying.z = fish.z; fish.carrying.obj.position.set(fish.x, 0.6, fish.z); }
    it.taken = true; fish.carrying = it; tr.items.push(it.kind); blip("get"); say(`You picked up a ${it.kind}`); return;
  }
  if (ev.hook && !ev.hook.done && near(ev.hook)) { ev.hook.hooked = true; ev.hook.pull = 0; ev.hook.mash = 0; tr.hooked++; say("You bit the bait. It's a hook!", true); return; }
  if (ev.trapped && !ev.trapped.freed && near(ev.trapped, 3.6)) { ev.trapped.freed = true; ev.trapped.line.visible = false; tr.freedFish = true; blip("get"); say("You bit the line and freed the trapped fish"); pop("freed", ev.trapped.obj.position); return; }
  if (dist2(pike, mouth) < 4.5) {
    const behind = Math.cos(Math.atan2(fish.z - pike.z, fish.x - pike.x) - Math.atan2(pike.vz, pike.vx)) < -0.2;
    if (behind || pike.mode === "flee") { tr.pikeBitten++; pike.mode = "flee"; pike.flee = 5; blip("get"); say("You bit the pike's tail. It fled!"); pop("!", pike.obj.position); }
    else hurt("You bit the pike head-on. It bit back");
    return;
  }
  if (ev.frog && near(ev.frog, 3.8)) { tr.frogBitten++; ev.frog.hop = 1; const p = randPos(10); ev.frog.tx = p.x; ev.frog.tz = p.z; say("You nipped the frog. It leapt away"); return; }
  if (ev.turtle && near(ev.turtle, 4)) { tr.turtleBitten++; ev.turtle.hide = 3; say("You bit the turtle. It pulled into its shell"); return; }
  if (ev.cray && ev.cray.alive && near(ev.cray, 3.4)) {
    const behind = Math.cos(Math.atan2(fish.z - ev.cray.z, fish.x - ev.cray.x) - ev.cray.ang) < 0;
    if (behind) { ev.cray.alive = false; ev.cray.obj.visible = false; tr.crayfish++; blip("get"); say(ev.eggs && dist2(ev.eggs, fish) < 10 ? "You ate the crayfish and saved the eggs" : "You ate a crayfish"); if (ev.eggs && dist2(ev.eggs, fish) < 10) tr.eggsGuarded = true; }
    else hurt("The crayfish pinched you");
    return;
  }
  for (const b of bugs) if (b.alive && near(b)) { b.alive = false; b.obj.visible = false; tr.bugs++; if (b.rain) tr.rainBugs++; blip("get"); pop("+bug", b.obj.position); return; }
  for (const m of school.fish) if (m.alive && near(m.obj.position, 2.8)) { m.alive = false; m.obj.visible = false; tr.minnows++; blip("get"); say("You ate a minnow"); return; }
  if (ev.eggs && ev.eggs.left > 0 && near(ev.eggs, 3.2)) { ev.eggs.left--; ev.eggs.obj.children[ev.eggs.left].visible = false; tr.eggsEaten++; blip("get"); if (tr.eggsEaten === 1) say("You ate some fish eggs"); return; }
  for (const w of weeds) if (w.bites > 0 && near(w, 3.4)) { w.bites--; if (!w.bites) w.obj.scale.setScalar(0.5); tr.plants++; blip("get"); pop("+weed", w.obj.position); return; }
}

// ---------- Pond life ----------
function updateBugs(dt) {
  for (const b of bugs) {
    if (!b.alive) continue;
    b.turn -= dt;
    if (b.turn <= 0) { b.turn = rng.range(0.4, 1.2); const a = rng() * Math.PI * 2; b.vx = Math.cos(a) * 5; b.vz = Math.sin(a) * 5; }
    const d = dist2(b, fish);
    if (d < 7) { b.vx = (b.x - fish.x) / d * 11; b.vz = (b.z - fish.z) / d * 11; }
    b.x += b.vx * dt; b.z += b.vz * dt; inPond(b, 4);
    b.obj.position.set(b.x, 6.15, b.z);
    b.obj.userData.wing.rotation.z = Math.sin(t * 40) * 0.4;
  }
}

function updateSchool(dt) {
  school.x += school.vx * dt; school.z += Math.sin(t * 0.6) * 3 * dt;
  const before = school.x; inPond(school, 14); if (school.x !== before) school.vx *= -1;
  for (const m of school.fish) {
    if (!m.alive) continue;
    const near = dist2({ x: school.x + m.ox, z: school.z + m.oz }, fish) < 5;
    m.obj.position.set(school.x + m.ox + Math.sin(t * 3 + m.oz) * 0.6 + (near ? (m.ox > 0 ? 2 : -2) : 0), 1.6, school.z + m.oz);
    m.obj.rotation.y = school.vx > 0 ? 0 : Math.PI;
  }
}

function steer(o, tx, tz, speed, dt, turn = 2.5) {
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz) || 1;
  o.vx += (dx / d * speed - o.vx) * Math.min(1, dt * turn);
  o.vz += (dz / d * speed - o.vz) * Math.min(1, dt * turn);
  o.x += o.vx * dt; o.z += o.vz * dt;
  inPond(o, 5);
}

function updatePike(dt) {
  pike.cool -= dt;
  const d = dist2(pike, fish), hid = hidden();
  if (d < 22 && !hid) tr.dangerTime += dt;
  if (pike.mode === "flee") {
    pike.flee -= dt;
    steer(pike, pike.x + (pike.x - fish.x), pike.z + (pike.z - fish.z), 20, dt);
    if (pike.flee <= 0) { pike.mode = "patrol"; pike.cool = 6; }
  } else if (pike.mode === "patrol") {
    if (dist2(pike, pike.target) < 4) pike.target = randPos(8);
    steer(pike, pike.target.x, pike.target.z, 6, dt);
    if (d < 20 && !hid && pike.cool <= 0) { pike.mode = "chase"; say("A pike spotted you", true); }
  } else {
    steer(pike, fish.x, fish.z, 14.5, dt, 1.8);
    if (hid || d > 34) { pike.mode = "patrol"; pike.cool = 3; tr.pikeEscapes++; say(hid ? "You hid. The pike lost you" : "You outswam the pike"); }
    else if (d < 3.6) { pike.mode = "patrol"; pike.cool = 5; fish.vx += (fish.x - pike.x) * 3; fish.vz += (fish.z - pike.z) * 3; hurt(tr.scars >= 1 ? "The pike got you again" : "The pike bit you. You'll scar"); }
  }
  pike.obj.position.set(pike.x, 2.2, pike.z);
  pike.obj.rotation.y = -Math.atan2(pike.vz, pike.vx);
}

function updateHeron(dt) {
  heron.next -= dt;
  if (heron.next <= 0 && heron.warn <= 0) {
    heron.warn = 1.8;
    heron.x = clamp(fish.x + rng.range(-5, 5), -PX + 6, PX - 6); heron.z = clamp(fish.z + rng.range(-4, 4), -PZ + 6, PZ - 6);
  }
  if (heron.warn > 0) {
    heron.warn -= dt;
    const k = 1 - heron.warn / 1.8;
    heron.obj.position.set(heron.x, 0.15, heron.z); heron.obj.scale.setScalar(heron.r * (0.5 + k * 0.5));
    heron.obj.material.opacity = 0.12 + k * 0.4;
    if (heron.warn <= 0) {
      heron.obj.material.opacity = 0; heron.next = rng.range(13, 19);
      if (dist2(heron, fish) < heron.r && !hidden()) {
        if (!tr.tailLost) { tr.tailLost = true; M.setTailless(fish.obj, true); hurt("A heron struck! You lost your tail"); }
        else hurt("The heron struck again");
      } else say("A heron missed you");
    }
  }
}

function updateEvents(dt, rdt) {
  // Frog: sits on a lily pad, snaps at things that come close
  const f = ev.frog;
  if (f) {
    if (f.hop > 0) { f.hop -= dt * 1.5; f.x += (f.tx - f.x) * Math.min(1, dt * 3); f.z += (f.tz - f.z) * Math.min(1, dt * 3); f.obj.position.y = 5.7 + Math.sin(Math.max(0, f.hop) * Math.PI) * 4; }
    f.obj.position.x = f.x; f.obj.position.z = f.z;
    f.snap -= dt;
    if (f.snap <= 0) { f.snap = rng.range(5, 9); if (dist2(f, fish) < 6) hurt("The frog snapped at you"); }
  }
  // Turtle: drifts slowly; hide under it and nothing can reach you
  const tu = ev.turtle;
  if (tu) {
    tu.hide = Math.max(0, tu.hide - dt);
    if (tu.hide <= 0) { tu.ang += dt * 0.15; tu.x += Math.cos(tu.ang) * 1.6 * dt; tu.z += Math.sin(tu.ang) * 1.6 * dt; inPond(tu, 9); }
    tu.obj.position.set(tu.x, 1.4, tu.z); tu.obj.rotation.y = -tu.ang;
  }
  // Eggs and the crayfish that wants them
  const c = ev.cray;
  if (c && c.alive) {
    c.t -= dt;
    const goal = c.t <= 0 && ev.eggs.left > 0 ? ev.eggs : { x: c.x + Math.cos(t * 0.3) * 4, z: c.z + Math.sin(t * 0.3) * 4 };
    if (c.t <= 0 && c.mode !== "raid") { c.mode = "raid"; say("A crayfish is heading for the eggs", true); }
    const dx = goal.x - c.x, dz = goal.z - c.z, d = Math.hypot(dx, dz) || 1;
    c.ang = Math.atan2(dz, dx);
    if (d > 1.5) { c.x += dx / d * 4 * dt; c.z += dz / d * 4 * dt; }
    else if (c.mode === "raid" && ev.eggs.left > 0 && rng() < dt * 0.6) { ev.eggs.left--; ev.eggs.obj.children[ev.eggs.left].visible = false; }
    c.obj.position.set(c.x, 0.6, c.z); c.obj.rotation.y = -c.ang;
  }
  if (ev.eggs && dist2(ev.eggs, fish) < 6) ev.eggs.guardT += dt;
  // The kid's net: a shadow, then a scoop
  const n = ev.net;
  if (n) {
    if (n.phase === "idle") { n.next -= dt; if (n.next <= 0) { n.phase = "warn"; n.t = 2; n.x = fish.x; n.z = fish.z; n.obj.visible = true; say("Something is coming from the shore", true); } }
    else if (n.phase === "warn") {
      n.t -= dt; n.obj.position.set(n.x, 12 - (2 - n.t) * 3, n.z);
      if (n.t <= 0) {
        n.phase = "idle"; n.next = rng.range(22, 30); n.obj.visible = false;
        if (dist2(n, fish) < 4 && !hidden()) { tr.netCaught++; fish.netted = 2.2; Input.signal("b"); say("A kid scooped you up, looked at you, and let you go"); fish.x = rng.range(-20, 20); fish.z = rng.range(-10, 10); }
        else say("A net splashed down and missed");
      }
    }
  }
  // The hook: once bitten, mash to break free
  const h = ev.hook;
  if (h && !h.done) {
    h.obj.position.y = 3.2 + Math.sin(t * 2) * 0.4;
    if (h.hooked) {
      h.pull += rdt;
      h.obj.position.set(fish.x + Math.cos(fish.heading) * 2, 2.6, fish.z + Math.sin(fish.heading) * 2);
      if (h.mash >= 9) { h.hooked = false; h.done = true; h.obj.visible = false; tr.escapedHook++; say("You tore free of the hook!"); }
      else if (h.pull > 3.2) { h.hooked = false; h.done = true; h.obj.visible = false; tr.caughtByAngler++; tr.scars++; fish.hurt = 1; say("Pulled out of the water... then tossed back in", true); fish.x = rng.range(-15, 15); fish.z = rng.range(-8, 8); }
    }
  }
  // The trapped fish: free it and it follows you; ignore it and the game notices
  const tp = ev.trapped;
  if (tp) {
    if (!tp.freed) { tp.obj.rotation.y = Math.sin(t * 6) * 0.4; if (dist2(tp, fish) < 10) tp.seen += dt; }
    else {
      const tx = fish.x - Math.cos(fish.heading) * 4, tz = fish.z - Math.sin(fish.heading) * 4;
      tp.x += (tx - tp.x) * Math.min(1, dt * 2.5); tp.z += (tz - tp.z) * Math.min(1, dt * 2.5);
      tp.obj.position.set(tp.x, 2, tp.z); tp.obj.rotation.y = -fish.heading;
    }
  }
  // Rain: bugs fall into the pond for a short feast
  const r = ev.rain;
  if (r) {
    if (!r.on && r.left > 0 && t >= r.at) { r.on = true; say("It started to rain. Bugs are falling in"); for (let i = 0; i < 10; i++) addBug(randPos(), true); r.drops = makeRain(); }
    if (r.on) { r.left -= dt; animateRain(r.drops, rdt); if (r.left <= 0) { r.on = false; r.drops.visible = false; } }
  }
}

function makeRain() {
  const n = 400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rng.range(-PX, PX); pos[i * 3 + 1] = rng.range(6, 40); pos[i * 3 + 2] = rng.range(-PZ, PZ); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8fb6d8, size: 0.35 }));
  root.add(pts);
  return pts;
}
function animateRain(pts, rdt) {
  const a = pts.geometry.attributes.position;
  for (let i = 0; i < a.count; i++) { let y = a.getY(i) - 40 * rdt; if (y < 6) y = 40; a.setY(i, y); }
  a.needsUpdate = true;
}

function follow(rdt, instant = false) {
  const cam = view.camera;
  const tx = clamp(fish.x, -PX + 20, PX - 20) * 0.85, tz = clamp(fish.z, -PZ + 12, PZ - 12) * 0.85;
  const want = v3(tx, 46, tz + 34);
  if (instant) cam.position.copy(want); else cam.position.lerp(want, Math.min(1, rdt * 3));
  cam.lookAt(cam.position.x, 0, cam.position.z - 30);
  sky.setTime(0.45, { x: cam.position.x, z: cam.position.z - 30 });
}

function finish() {
  phase = "end";
  if (ev.trapped && !ev.trapped.freed && ev.trapped.seen > 2) tr.ignoredTrapped = true;
  if (ev.eggs && ev.eggs.guardT > 10) tr.eggsGuarded = true;
  tr.explored = Math.round((visited.size / (8 * 5)) * 100) / 100;
  for (const k of ["shallowTime", "deepTime", "hideTime", "schoolTime", "stillTime", "dangerTime", "turtleTime"]) tr[k] = Math.round(tr[k]);
  ambience("quiet");
}
