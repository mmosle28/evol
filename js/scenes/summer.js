// Summer: three days in the village you evolved into (Boku no Natsuyasumi). A free-roam sandbox:
// gather things, catch critters, help villagers, build the village project, and answer odd questions
// from talking objects (Doki Doki Universe). Time only moves when you move: the sun crosses the sky
// as you walk, and the world holds still when you stop. Sleep at home to end the day.

import { Input } from "../core/input.js";
import { go, game, score, note, DAYS } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, box, dialogue, choices, hint, tag, clamp, dist2 } from "../core/draw.js";
import { UI, FONT, PAL } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeSky } from "../gfx/sky.js";
import * as M from "../gfx/models.js";
import { askJSON } from "../ai/claude.js";
import { talkPrompt } from "../ai/prompts.js";
import { fallbackTalk } from "../life/fallback.js";
import { blip, ambience } from "../core/audio.js";

const THREE = window.THREE;
const QUICK = new URLSearchParams(location.search).has("quick");
const R = 78;                       // village radius
const DAY_DISTANCE = QUICK ? 600 : 1700; // how far you walk in one day
const HOME = { x: 0, z: 34 };
const PROJECT = { x: 0, z: -4 };

let built = "", view, sky, rng, root, player, villagers, quizzers, pickups, critters, projectObj, homeRing, t, real;
let dayT, mode, ui, near, today, intro, warned, photo;

// ---------- Build the village (once per life) ----------
function build() {
  const life = game.life;
  rng = makeRng(game.seed ^ 0x2545f491);
  const scene = new THREE.Scene();
  sky = makeSky(scene, rng, { clouds: 18 });
  root = new THREE.Group(); scene.add(root);
  const add = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; root.add(o); return o; };

  scene.add(M.ground(340));
  // Roads (pale stone strips)
  const road = (x, z, w, d) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 1 })); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.03, z); r.receiveShadow = true; root.add(r); };
  road(0, 10, 7, 120); road(0, -4, 150, 7);

  // Houses, poles and wires along the road, paddies, trees, theme sculptures
  const spots = [];
  const free = (x, z, r) => Math.hypot(x - HOME.x, z - HOME.z) > 12 && Math.hypot(x - PROJECT.x, z - PROJECT.z) > 14 && Math.abs(x) > 6 && Math.abs(z + 4) > 6 && spots.every(s => Math.hypot(s.x - x, s.z - z) > r + s.r);
  const scatter = (n, r, make, ry = true) => { for (let i = 0, tries = 0; i < n && tries < 400; tries++) { const a = rng() * Math.PI * 2, d = 12 + rng() * (R - 18); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (!free(x, z, r)) continue; spots.push({ x, z, r }); add(make(), x, z, ry ? rng() * Math.PI * 2 : 0); i++; } };
  const homeHouse = M.house(rng); homeHouse.scale.setScalar(1.1); add(homeHouse, HOME.x, HOME.z + 6, Math.PI / 2);
  scatter(6, 8, () => M.house(rng));
  scatter(4, 9, () => M.paddy(), false);
  scatter(16, 3, () => M.tree(rng));
  scatter(10, 3, () => M.themeProp(life.world.props, rng));
  scatter(3, 2, () => M.vending());
  const poles = [];
  for (let x = -70; x <= 70; x += 20) { const p = add(M.pole(), x, 0.5); poles.push(p.position.clone()); }
  for (let i = 0; i < poles.length - 1; i++) root.add(M.wire(poles[i], poles[i + 1]));
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; const tt = M.tree(rng); tt.scale.setScalar(1.6 + rng()); add(tt, Math.cos(a) * (R + 6), Math.sin(a) * (R + 6)); }

  // The village project in the middle: blocks stack up as people contribute
  projectObj = new THREE.Group(); projectObj.position.set(PROJECT.x, 0, PROJECT.z); root.add(projectObj);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 0.8, 8), M.mat(PAL.stone)); base.position.y = 0.4; base.receiveShadow = true; projectObj.add(base);
  projectObj.userData.blocks = [];
  for (let i = 0; i < life.world.projectNeeds; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.4 - (i % 3) * 0.6, 1.4, 3.4 - (i % 3) * 0.6), M.mat(PAL.white));
    b.position.y = 1.5 + i * 1.4; b.rotation.y = i * 0.35; b.castShadow = true; b.visible = false; projectObj.add(b); projectObj.userData.blocks.push(b);
  }
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 2), M.mat(PAL.red)); flag.visible = false; projectObj.add(flag); projectObj.userData.flag = flag;
  game.project = game.project || 0;

  homeRing = M.ring(PAL.red); homeRing.position.set(HOME.x, 0.06, HOME.z); root.add(homeRing);

  // Villagers
  villagers = life.villagers.map((v, i) => {
    const a = (i / life.villagers.length) * Math.PI * 2 + 0.5, d = 22 + rng() * 26;
    const obj = M.creature(v.body, { color: [PAL.redDark, PAL.red, PAL.redLight, PAL.redDark][i % 4], accent: PAL.redDark, scale: 1.05 });
    const hx = Math.cos(a) * d, hz = Math.sin(a) * d;
    add(obj, hx, hz);
    return { v, obj, x: hx, z: hz, hx, hz, tx: hx, tz: hz, wait: 0, met: 0, done: false };
  });

  // Talking objects (Doki Doki questions)
  quizzers = life.quiz.map((q, i) => {
    const a = (i / life.quiz.length) * Math.PI * 2 + 0.2, d = 30 + (i % 2) * 22 + rng() * 6;
    const obj = M.quizObject(q.kind); const x = Math.cos(a) * d, z = Math.sin(a) * d;
    add(obj, x, z, rng() * Math.PI * 2);
    return { q, obj, x, z, answered: false };
  });

  player = { obj: M.creature(life.creature.body, { scale: 1.1 }), x: HOME.x, z: HOME.z - 4, heading: -Math.PI / 2, moving: false };
  root.add(player.obj);
  pickups = []; critters = [];
  const camera = makeCamera(48);
  view = { scene, camera };
  built = game.runId;
}

/** Fresh resources and critters each morning. */
function spawnDay() {
  for (const p of pickups) root.remove(p.obj);
  for (const c of critters) root.remove(c.obj);
  pickups = []; critters = [];
  const life = game.life;
  life.resources.forEach((name, ri) => {
    const cx = rng.range(-50, 50), cz = rng.range(-50, 50);
    for (let i = 0; i < 9; i++) {
      const x = clamp(cx + rng.range(-22, 22), -R + 6, R - 6), z = clamp(cz + rng.range(-22, 22), -R + 6, R - 6);
      const o = new THREE.Mesh([new THREE.OctahedronGeometry(0.55, 0), new THREE.DodecahedronGeometry(0.5, 0), new THREE.TetrahedronGeometry(0.7, 0)][ri], M.mat(0xffffff, 0xffffff, 0.15));
      o.position.set(x, 0.7, z); o.castShadow = true; root.add(o);
      pickups.push({ ri, name, obj: o, x, z, taken: false });
    }
  });
  life.critters.forEach((c, ci) => {
    for (let i = 0; i < 6; i++) {
      const o = M.bug(); o.scale.setScalar(1.8); const x = rng.range(-60, 60), z = rng.range(-60, 60);
      o.position.set(x, 1.2 + ci * 1.5, z); root.add(o);
      critters.push({ ci, name: c.name, obj: o, x, z, vx: 0, vz: 0, turn: 0, caught: false, fly: ci === 1 });
    }
  });
}

// ---------- Scene ----------
export const summerScene = {
  enter(data) {
    if (built !== game.runId) { build(); game.project = 0; }
    stage.view = view;
    if (data.first || data.newDay) {
      dayT = 0; warned = false; spawnDay();
      today = { gathered: {}, caught: {}, walked: 0, still: 0, talks: 0, gifts: 0, quiz: 0, built: 0 };
      player.x = HOME.x; player.z = HOME.z - 4;
      intro = data.first ? "first" : "morning";
    }
    mode = intro ? "intro" : "free"; ui = null; t = 0; real = 0;
    ambience("summer", 1);
  },

  update(rdt) {
    real += rdt;
    const push = Math.hypot(Input.x, Input.y);
    const free = mode === "free";
    // Time only moves when you move
    const ts = free ? 0.08 + 0.92 * clamp(push * 1.15, 0, 1) : 0.08;
    const dt = rdt * ts;
    t += dt;
    sky.update(dt);

    if (mode === "intro") { if (real > 0.5 && Input.pressed()) { mode = "free"; intro = null; } }
    else if (free) freeRoam(rdt, dt, push);
    else updateOverlay();

    // World life keeps going at world speed
    updateVillagers(dt); updateCritters(dt);
    for (const p of pickups) if (!p.taken) p.obj.rotation.y += dt * 1.5;
    for (const q of quizzers) q.obj.children.forEach(c => { if (c.userData.spin) c.rotation.z += dt; });
    homeRing.material.opacity = 0.35 + Math.sin(real * 3) * 0.2;
    M.animateCreature(player.obj, real, player.moving && free);
    for (const v of villagers) M.animateCreature(v.obj, real + v.hx, false);
    sky.setTime(dayT, player);
    ambience("summer", clamp(1.2 - dayT, 0, 1));
    camera(rdt);
  },

  draw(g) {
    // Labels over nearby things
    if (mode === "free" && near) {
      const s = stage.toScreen(new THREE.Vector3(near.x, near.h || 4, near.z));
      if (s) tag(g, s.x, s.y, near.label, near.red);
    }
    drawHud(g);
    if (mode === "intro") drawIntro(g);
    if (ui) drawOverlay(g);
    if (mode === "free") hint(g, near ? `Button: ${near.verb}` : "Walk with the joystick. Time moves when you move.");
  }
};

// ---------- Moving around ----------
function freeRoam(rdt, dt, push) {
  const speed = (game.life.creature.body.features.includes("stumpTail") ? 11 : 14);
  const vx = Input.x * speed, vz = Input.y * speed;
  const nx = clamp(player.x + vx * rdt, -R, R), nz = clamp(player.z + vz * rdt, -R, R);
  const moved = Math.hypot(nx - player.x, nz - player.z);
  if (Math.hypot(nx, nz) < R) { player.x = nx; player.z = nz; }
  player.moving = push > 0.15;
  if (player.moving) player.heading = Math.atan2(vz, vx); else today.still += rdt;
  today.walked += moved;
  dayT = Math.min(1, dayT + moved / DAY_DISTANCE);
  player.obj.position.set(player.x, 0, player.z);
  player.obj.rotation.y = -player.heading;

  if (dayT > 0.85 && !warned) { warned = true; message("The sun is going down. Head home to sleep when you're ready."); return; }
  if (dayT >= 1) { message("You got sleepy and wandered home.", () => sleep()); return; }

  findNear();
  if (near && Input.pressed()) { act(near); if (ui) mode = "overlay"; }
}

function findNear() {
  near = null; let best = 4.2;
  const life = game.life;
  const consider = (o, label, verb, kind, extra = {}) => { const d = dist2(o, player); if (d < best) { best = d; near = { x: o.x, z: o.z, label, verb, kind, ref: o, ...extra }; } };
  for (const p of pickups) if (!p.taken) consider(p, p.name, `Pick up ${p.name}`, "pickup", { h: 2.4 });
  for (const c of critters) if (!c.caught) consider(c, c.name, `Catch the ${c.name}`, "critter", { h: 3.4, red: true });
  for (const v of villagers) consider(v, v.v.name, `Talk to ${v.v.name}`, "villager", { h: 5.2, red: true });
  for (const q of quizzers) consider(q, q.answered ? q.q.name : `${q.q.name} ?`, q.answered ? `Look at the ${q.q.kind}` : `Listen to the ${q.q.kind}`, "quiz", { h: 5.4, red: !q.answered });
  if (dist2(PROJECT, player) < 8.5) near = { x: PROJECT.x, z: PROJECT.z, label: life.world.project, verb: `Help build ${life.world.project}`, kind: "project", h: 4 + game.project * 1.4 };
  if (dist2(HOME, player) < 4) near = { x: HOME.x, z: HOME.z, label: "Home", verb: "Go to sleep", kind: "home", h: 4 };
}

function act(n) {
  const life = game.life;
  if (n.kind === "pickup") {
    const p = n.ref; p.taken = true; p.obj.visible = false;
    game.bag[p.ri] = (game.bag[p.ri] || 0) + 1; today.gathered[p.name] = (today.gathered[p.name] || 0) + 1;
    dayT = Math.min(1, dayT + 0.004); blip("get"); score({ driven: 0.2 });
  } else if (n.kind === "critter") {
    const c = n.ref;
    if (dist2(c, player) < 3.2) { c.caught = true; c.obj.visible = false; today.caught[c.name] = (today.caught[c.name] || 0) + 1; blip("get"); Input.signal("b"); score({ playful: 0.4, curious: 0.2 }); }
    else { c.vx *= -2; blip("bite"); }
  } else if (n.kind === "villager") startTalk(n.ref);
  else if (n.kind === "quiz") startQuiz(n.ref);
  else if (n.kind === "project") contribute();
  else if (n.kind === "home") ui = { type: "sleep", sel: 0, at: real };
}

// ---------- Villagers ----------
function updateVillagers(dt) {
  for (const v of villagers) {
    if (ui && ui.who === v) { v.obj.rotation.y = -Math.atan2(player.z - v.z, player.x - v.x); continue; }
    if (dist2(v, player) < 6) { v.obj.rotation.y = -Math.atan2(player.z - v.z, player.x - v.x); continue; }
    v.wait -= dt;
    if (v.wait <= 0 && dist2(v, { x: v.tx, z: v.tz }) < 1) { v.tx = v.hx + rng.range(-10, 10); v.tz = v.hz + rng.range(-10, 10); v.wait = rng.range(1, 4); }
    const dx = v.tx - v.x, dz = v.tz - v.z, d = Math.hypot(dx, dz);
    if (d > 0.5 && v.wait <= 0) { v.x += dx / d * 4 * dt; v.z += dz / d * 4 * dt; v.obj.rotation.y = -Math.atan2(dz, dx); }
    v.obj.position.set(v.x, 0, v.z);
  }
}

function startTalk(v) {
  v.met++; today.talks++; blip("talk");
  ui = { type: "talk", who: v, phase: "wait", sel: 0, at: real };
  const recent = game.log.slice(-5).map(l => l.text).concat(summaryLines(true));
  askJSON(talkPrompt(game.life, v.v, recent, v.met > 1), {
    tier: "quick",
    validate: c => { for (const k of ["line", "a", "b", "replyA", "replyB"]) if (typeof c[k] !== "string") throw new Error("bad"); return c; },
    fallback: () => fallbackTalk(v.v, game.life)
  }).then(r => {
    if (!ui || ui.who !== v) return;
    const c = r.value;
    const opts = [c.a, c.b];
    const have = game.bag[v.v.wants] || 0;
    if (!v.done && have >= v.v.count) opts.push(`Give ${v.v.count} ${game.life.resources[v.v.wants]}`);
    Object.assign(ui, { phase: "ask", convo: c, opts, at: real });
  });
}

// ---------- Quiz objects ----------
function startQuiz(q) {
  blip("talk");
  if (q.answered) { ui = { type: "message", text: `The ${q.q.kind} is quiet now. It seems satisfied with your answer.`, at: real }; return; }
  ui = { type: "quiz", q, phase: "ask", sel: 0, at: real };
}

// ---------- Project ----------
function contribute() {
  const life = game.life, need = life.world.projectNeeds;
  const have = Object.values(game.bag).reduce((a, b) => a + b, 0);
  if (game.project >= need) { ui = { type: "message", text: `${life.world.project} is finished. The village is proud of it, and of you.`, at: real }; return; }
  if (!have) { ui = { type: "message", text: `The village is building ${life.world.project}. Bring any ${life.resources.join(", ")} you find.`, at: real }; return; }
  const give = Math.min(have, need - game.project);
  let left = give;
  for (const k of Object.keys(game.bag)) { const take = Math.min(left, game.bag[k]); game.bag[k] -= take; left -= take; }
  game.project += give; today.built += give;
  score({ driven: 1, social: 0.5 }); blip("get"); Input.signal("b");
  ui = { type: "message", text: game.project >= need ? `You placed the last piece. ${life.world.project} is done!` : `You added ${give} piece${give > 1 ? "s" : ""}. ${need - game.project} more to go.`, at: real };
  refreshProject();
}
function refreshProject() {
  const b = projectObj.userData.blocks;
  b.forEach((m, i) => { m.visible = i < game.project; });
  const done = game.project >= game.life.world.projectNeeds;
  const f = projectObj.userData.flag; f.visible = done; f.position.set(0, 2.4 + b.length * 1.4, 1);
}

// ---------- Critters ----------
function updateCritters(dt) {
  for (const c of critters) {
    if (c.caught) continue;
    c.turn -= dt;
    if (c.turn <= 0) { c.turn = rng.range(0.6, 2); const a = rng() * Math.PI * 2; c.vx = Math.cos(a) * 3; c.vz = Math.sin(a) * 3; }
    const d = dist2(c, player);
    if (d < 6) { c.vx = (c.x - player.x) / d * 7; c.vz = (c.z - player.z) / d * 7; }
    c.x = clamp(c.x + c.vx * dt, -R + 3, R - 3); c.z = clamp(c.z + c.vz * dt, -R + 3, R - 3);
    c.obj.position.set(c.x, (c.fly ? 2.6 : 0.6) + Math.abs(Math.sin(t * (c.fly ? 6 : 4) + c.x)) * (c.fly ? 0.8 : 1.2), c.z);
    c.obj.rotation.y = -Math.atan2(c.vz, c.vx);
    c.obj.userData.wing.rotation.z = Math.sin(t * 30) * 0.5;
  }
}

// ---------- Overlays (talk, quiz, sleep, messages) ----------
function message(text, after) { ui = { type: "message", text, after, at: real }; mode = "overlay"; }

function updateOverlay() {
  if (!ui) { mode = "free"; return; }
  const tap = Input.tapped();
  const ready = real - ui.at > 0.35;
  if (ui.type === "message") { if (ready && Input.pressed()) { const after = ui.after; ui = null; mode = "free"; if (after) after(); } return; }
  if (ui.type === "sleep") {
    if (tap.x) ui.sel = tap.x > 0 ? 1 : 0;
    if (ready && Input.pressed()) { if (ui.sel === 0) sleep(); else { ui = null; mode = "free"; } }
    return;
  }
  if (ui.type === "talk") {
    if (ui.phase === "wait") return;
    if (ui.phase === "ask") {
      if (tap.x) ui.sel = clamp(ui.sel + tap.x, 0, ui.opts.length - 1);
      if (ready && Input.pressed()) {
        const v = ui.who, c = ui.convo;
        if (ui.sel === 2) {
          game.bag[v.v.wants] -= v.v.count; v.done = true; today.gifts++;
          score({ kind: 1.5, social: 0.5 }); blip("get"); Input.signal("b");
          note(`Gave ${v.v.name} ${v.v.count} ${game.life.resources[v.v.wants]} they needed`);
          ui.reply = `Oh! Thank you! ${v.v.request || "This really helps."}`.trim();
        } else {
          const axes = ui.sel === 0 ? c.axesA : c.axesB; score(axes || {});
          note(`Talked with ${v.v.name} (${v.v.role}). When they said "${c.line}", you answered "${ui.sel === 0 ? c.a : c.b}"`);
          ui.reply = ui.sel === 0 ? c.replyA : c.replyB;
        }
        ui.phase = "reply"; ui.at = real;
      }
      return;
    }
    if (ui.phase === "reply" && ready && Input.pressed()) { ui = null; mode = "free"; }
    return;
  }
  if (ui.type === "quiz") {
    if (ui.phase === "ask") {
      if (tap.x) ui.sel = clamp(ui.sel + tap.x, 0, 2);
      if (ready && Input.pressed()) {
        const q = ui.q, a = q.q.answers[ui.sel];
        q.answered = true; today.quiz++; score(a.axes); blip("page");
        game.answers.push({ day: game.day, who: q.q.name, question: q.q.question, answer: a.text });
        ui.phase = "reply"; ui.reply = a.reply; ui.at = real;
      }
      return;
    }
    if (ready && Input.pressed()) { ui = null; mode = "free"; }
  }
}

function drawOverlay(g) {
  if (ui.type === "message") { dialogue(g, null, ui.text); return; }
  if (ui.type === "sleep") {
    dialogue(g, "Home", `Go to sleep and end day ${game.day} of ${DAYS}? You'll write in your diary first.`, { h: 220 });
    choices(g, ["Sleep", "Not yet"], ui.sel, 160, 610, 520);
    return;
  }
  if (ui.type === "talk") {
    const v = ui.who.v;
    if (ui.phase === "wait") { dialogue(g, v.name, "…"); return; }
    if (ui.phase === "ask") { dialogue(g, `${v.name} · ${v.role}`, ui.convo.line, { h: 230, y: 440 }); choices(g, ui.opts, ui.sel, 160, 590, W - 320); return; }
    dialogue(g, v.name, ui.reply);
    return;
  }
  if (ui.type === "quiz") {
    const q = ui.q.q;
    if (ui.phase === "ask") {
      // Doki Doki style: a big question card
      box(g, 200, 120, W - 400, 260);
      g.fillStyle = UI.red; g.font = font(20, 900); g.textAlign = "center"; g.fillText(q.name.toUpperCase() + " ASKS", W / 2, 170);
      g.fillStyle = UI.ink; g.font = font(40, 400, FONT.title);
      wrapText(g, q.question, W / 2, 230, W - 480, 50, "center");
      choices(g, q.answers.map(a => a.text), ui.sel, 120, 470, W - 240, 72);
      hint(g, "Left / right to choose, button to answer");
      return;
    }
    dialogue(g, q.name, ui.reply);
  }
}

function drawIntro(g) {
  const life = game.life;
  const first = intro === "first";
  box(g, W / 2 - 420, 110, 840, first ? 400 : 260);
  g.textAlign = "center"; g.fillStyle = UI.red; g.font = font(58, 400, FONT.title);
  g.fillText(first ? `Summer in ${life.world.name}` : `Day ${game.day}`, W / 2, 190);
  g.fillStyle = UI.ink; g.font = font(23, 500);
  const text = first
    ? `You have ${DAYS} summer days. Wander, pick things up, catch ${life.critters[0].name}s, help the villagers, and bring materials to ${life.world.project}. Odd objects around the village have questions for you. The sun only moves when you move, so take your time. Sleep at home to end the day.`
    : `A new morning in ${life.world.name}. Fresh things to find, the same sky.`;
  wrapText(g, text, W / 2, 245, 720, 34, "center");
  g.fillStyle = UI.red; g.font = font(20, 900);
  g.fillText("PRESS THE BUTTON", W / 2, first ? 480 : 340);
}

function drawHud(g) {
  const life = game.life;
  // Day and sun arc, top right
  g.fillStyle = "rgba(247,246,242,0.85)"; g.fillRect(W - 290, 20, 266, 92);
  g.strokeStyle = UI.ink; g.lineWidth = 2; g.strokeRect(W - 290, 20, 266, 92);
  g.fillStyle = UI.ink; g.font = font(18, 900); g.textAlign = "left"; g.fillText(`DAY ${game.day} OF ${DAYS}`, W - 274, 48);
  g.strokeStyle = UI.muted; g.lineWidth = 2; g.beginPath(); g.arc(W - 157, 104, 52, Math.PI, 0); g.stroke();
  const a = Math.PI + dayT * Math.PI;
  g.fillStyle = dayT > 0.85 ? UI.red : "#f2a43a"; g.beginPath(); g.arc(W - 157 + Math.cos(a) * 52, 104 + Math.sin(a) * 52, 9, 0, Math.PI * 2); g.fill();
  // Bag, top left
  g.fillStyle = "rgba(247,246,242,0.85)"; g.fillRect(24, 20, 330, 40 + life.resources.length * 30);
  g.strokeStyle = UI.ink; g.strokeRect(24, 20, 330, 40 + life.resources.length * 30);
  g.fillStyle = UI.red; g.font = font(18, 900); g.fillText(`${life.creature.name.toUpperCase()}'S BAG`, 40, 46);
  g.fillStyle = UI.ink; g.font = font(19, 700);
  life.resources.forEach((r, i) => g.fillText(`${r}  ×${game.bag[i] || 0}`, 40, 76 + i * 30));
  // Project progress
  const need = life.world.projectNeeds;
  g.fillStyle = UI.muted; g.font = font(16, 700); g.fillText(`${life.world.project}: ${Math.min(game.project, need)}/${need}`, 24, 88 + life.resources.length * 30);
}

// ---------- End of day ----------
function summaryLines(partial = false) {
  const out = [];
  for (const [k, n] of Object.entries(today.gathered)) out.push(`Gathered ${n} ${k}`);
  for (const [k, n] of Object.entries(today.caught)) out.push(`Caught ${n} ${k}${n > 1 ? "s" : ""}`);
  if (today.built) out.push(`Added ${today.built} pieces to ${game.life.world.project}`);
  if (!partial) {
    if (today.still > 40) out.push(`Spent a long time standing still, watching the village`);
    if (today.walked > DAY_DISTANCE * 0.95) out.push("Walked until the sun went down");
    if (!today.talks) out.push("Didn't talk to anyone");
    if (game.project >= game.life.world.projectNeeds && today.built) out.push(`Helped finish ${game.life.world.project}`);
  }
  return out;
}

function sleep() {
  for (const l of summaryLines()) note(l);
  if (today.still > 40) score({ calm: 1 });
  if (!today.talks) score({ social: -1 });
  ui = null; mode = "free";
  player.obj.position.set(player.x, 0, player.z);
  photo = stage.snapshot();
  go("diary", { photo });
}

function camera(rdt) {
  const cam = view.camera;
  const want = new THREE.Vector3(player.x, 17, player.z + 21);
  cam.position.lerp(want, Math.min(1, rdt * 4));
  cam.lookAt(player.x, 2.5, player.z - 2);
}

// ?debug: let tests move the player and inspect the village.
if (new URLSearchParams(location.search).has("debug")) {
  window.evolSummer = { get mode() { return mode; }, get ui() { return ui; }, get near() { return near; }, get player() { return player; }, get villagers() { return villagers; }, get quizzers() { return quizzers; }, get pickups() { return pickups; }, setDay(v) { dayT = v; } };
}
