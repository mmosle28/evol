// The pond: 75 seconds as a fish. Nothing here is scripted. A seed lays out the pond, and the game
// quietly records what the player does (what they eat, what hurts them, where they go, what they pick up).
// Those traits are all the AI gets when it decides what the fish evolves into.

import { Input } from "../core/input.js";
import { go, game } from "../core/game.js";
import { makeRng } from "../core/rng.js";
import { W, H, UI, font, wrapText, panel, hint, clamp, dist } from "../core/draw.js";

// Add ?quick to the URL for a 25 second pond (handy for testing and short demos).
const LIFE_SECONDS = new URLSearchParams(location.search).has("quick") ? 25 : 75;
const SURFACE_Y = 230, BOTTOM_Y = 500;
const GRID_X = 8, GRID_Y = 5; // for measuring how much of the pond was explored

let rng, t, phase, fish, plants, bugs, school, pike, heron, items, reeds, rocks, pads, log, traits, visited, biteCooldown, endTimer;

function freshTraits() {
  return {
    plants: 0, bugs: 0, minnows: 0, bites: 0,
    tailLost: false, scars: 0, caughtTwice: false,
    items: [], explored: 0,
    surfaceTime: 0, bottomTime: 0, hideTime: 0, schoolTime: 0, idleTime: 0, dangerTime: 0,
    escapes: 0, events: []
  };
}

function say(text) {
  log.unshift({ text, age: 0 });
  log.length = Math.min(log.length, 4);
  traits.events.push(`${Math.round(t)}s: ${text}`);
}

export const pondScene = {
  enter() {
    rng = makeRng(game.seed);
    t = 0; phase = "intro"; endTimer = 0; biteCooldown = 0;
    log = []; traits = freshTraits();
    visited = new Set();
    fish = { x: W / 2, y: 380, vx: 0, vy: 0, angle: 0, carrying: null, hurtFlash: 0 };

    // Lay out the pond from the seed
    reeds = Array.from({ length: rng.int(2, 3) }, () => ({ x: rng.range(120, W - 120), y: rng.range(300, 560), r: rng.range(70, 100) }));
    rocks = Array.from({ length: 7 }, () => ({ x: rng.range(40, W - 40), y: rng.range(600, 700), r: rng.range(20, 50) }));
    pads = Array.from({ length: 6 }, () => ({ x: rng.range(60, W - 60), y: rng.range(40, 170), r: rng.range(26, 44) }));
    plants = Array.from({ length: 9 }, () => ({ x: rng.range(60, W - 60), y: rng.range(430, 640), bites: 2, sway: rng.range(0, 6) }));
    bugs = Array.from({ length: 7 }, () => ({ x: rng.range(60, W - 60), y: rng.range(60, SURFACE_Y), vx: 0, vy: 0, alive: true, turn: 0 }));
    const sc = { x: rng.range(200, W - 200), y: rng.range(260, 460) };
    school = { x: sc.x, y: sc.y, vx: 60, vy: 0, fish: Array.from({ length: 7 }, (_, i) => ({ ox: rng.range(-50, 50), oy: rng.range(-30, 30), alive: true })) };
    pike = { x: rng.pick([80, W - 80]), y: rng.range(300, 520), vx: 0, vy: 0, mode: "patrol", target: { x: W / 2, y: 400 }, cooldown: 0 };
    heron = { next: rng.range(12, 18), warn: 0, x: 0, y: 0, r: 70 };
    const itemKinds = [
      { kind: "stick", label: "a floating stick", color: "#8a6a3d" },
      { kind: "shell", label: "an empty snail shell", color: "#d8c7a8" },
      { kind: "glowing stone", label: "a strange glowing stone", color: "#9ef0e0" }
    ];
    items = [];
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const k = itemKinds[(game.seed + i) % itemKinds.length];
      items.push({ ...k, x: rng.range(100, W - 100), y: k.kind === "stick" ? rng.range(40, 120) : rng.range(300, 660), taken: false });
    }
  },

  update(dt) {
    if (phase === "intro") { if (Input.pressed()) phase = "live"; return; }
    if (phase === "end") {
      endTimer += dt;
      if (endTimer > 1 && Input.pressed()) { game.traits = traits; go("evolving"); }
      return;
    }
    t += dt;
    for (const l of log) l.age += dt;

    // ----- Fish movement (losing your tail makes you slow) -----
    const top = traits.tailLost ? 150 : 230;
    fish.vx += (Input.x * top - fish.vx) * Math.min(1, dt * 6);
    fish.vy += (Input.y * top - fish.vy) * Math.min(1, dt * 6);
    fish.x = clamp(fish.x + fish.vx * dt, 20, W - 20);
    fish.y = clamp(fish.y + fish.vy * dt, 20, H - 20);
    const speed = Math.hypot(fish.vx, fish.vy);
    if (speed > 20) fish.angle = Math.atan2(fish.vy, fish.vx);
    fish.hurtFlash = Math.max(0, fish.hurtFlash - dt);

    // ----- Where the fish spends its time -----
    const hiding = reeds.some(r => dist(r, fish) < r.r);
    if (hiding) traits.hideTime += dt;
    if (fish.y < SURFACE_Y) traits.surfaceTime += dt;
    if (fish.y > BOTTOM_Y) traits.bottomTime += dt;
    if (speed < 25) traits.idleTime += dt;
    if (dist(school, fish) < 130) traits.schoolTime += dt;
    visited.add(Math.floor(fish.x / (W / GRID_X)) + "," + Math.floor(fish.y / (H / GRID_Y)));

    // ----- Biting: eat or pick up whatever is closest -----
    biteCooldown -= dt;
    if (Input.pressed() && biteCooldown <= 0) { biteCooldown = 0.3; bite(); }

    // ----- Bugs skitter near the surface and flee when you get close -----
    for (const b of bugs) {
      if (!b.alive) continue;
      b.turn -= dt;
      if (b.turn <= 0) { b.turn = rng.range(0.4, 1.2); const a = rng.range(0, Math.PI * 2); b.vx = Math.cos(a) * 70; b.vy = Math.sin(a) * 40; }
      const d = dist(b, fish);
      if (d < 110) { b.vx = (b.x - fish.x) / d * 165; b.vy = (b.y - fish.y) / d * 165; }
      b.x = clamp(b.x + b.vx * dt, 20, W - 20);
      b.y = clamp(b.y + b.vy * dt, 30, SURFACE_Y + 40);
    }

    // ----- A school of minnows drifts around -----
    school.x += school.vx * dt; school.y += Math.sin(t * 0.7) * 20 * dt;
    if (school.x < 150 || school.x > W - 150) school.vx *= -1;

    // ----- The pike patrols, then chases anything in the open -----
    pike.cooldown -= dt;
    const pd = dist(pike, fish);
    const towardPike = (pike.x - fish.x) * fish.vx + (pike.y - fish.y) * fish.vy > 0;
    if (pd < 260 && !hiding) { traits.dangerTime += dt; if (towardPike && speed > 60) traits.dangerTime += dt; }
    if (pike.mode === "patrol") {
      if (dist(pike, pike.target) < 30) pike.target = { x: rng.range(80, W - 80), y: rng.range(260, 600) };
      steer(pike, pike.target, 80, dt);
      if (pd < 230 && !hiding && pike.cooldown <= 0) { pike.mode = "chase"; say("A pike spotted you"); }
    } else {
      steer(pike, fish, 185, dt);
      if (hiding || pd > 380) { pike.mode = "patrol"; traits.escapes++; say(hiding ? "You hid in the reeds" : "You outswam the pike"); }
      if (pd < 46) {
        pike.mode = "patrol"; pike.cooldown = 4;
        fish.hurtFlash = 0.6;
        traits.scars++;
        fish.vx += (fish.x - pike.x) * 6; fish.vy += (fish.y - pike.y) * 6;
        if (traits.scars >= 2) { traits.caughtTwice = true; say("The pike got you again. You barely escaped"); }
        else say("The pike bit you. You'll have a scar");
      }
    }

    // ----- Every so often a heron's shadow appears near you, then it strikes -----
    heron.next -= dt;
    if (heron.next <= 0 && heron.warn <= 0) {
      heron.warn = 1.6;
      heron.x = clamp(fish.x + rng.range(-80, 80), 80, W - 80);
      heron.y = clamp(fish.y + rng.range(-60, 60), 80, H - 80);
    }
    if (heron.warn > 0) {
      heron.warn -= dt;
      if (heron.warn <= 0) {
        heron.next = rng.range(14, 20);
        if (dist(heron, fish) < heron.r && !hiding) {
          fish.hurtFlash = 0.8;
          if (!traits.tailLost) { traits.tailLost = true; say("A heron struck! You lost your tail"); }
          else { traits.scars++; say("The heron struck again"); }
        } else say("You dodged a heron");
      }
    }

    if (t >= LIFE_SECONDS) finish();
  },

  draw(g) {
    drawPond(g);
    // HUD: time left
    const left = Math.max(0, LIFE_SECONDS - t);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(0, 0, W, 8);
    g.fillStyle = left < 15 ? UI.bad : UI.accent;
    g.fillRect(0, 0, W * (left / LIFE_SECONDS), 8);
    // Event feed, so players see cause and effect
    g.textAlign = "left";
    log.forEach((l, i) => {
      g.globalAlpha = clamp(1 - (l.age - 3) / 1.5, 0, 1) * (1 - i * 0.18);
      g.font = font(24, 700);
      g.fillStyle = UI.ink;
      g.fillText(l.text, 28, 50 + i * 34);
    });
    g.globalAlpha = 1;
    if (phase === "live") hint(g, "Move: joystick   Bite / pick up: button");

    if (phase === "intro") {
      panel(g, W / 2 - 380, H / 2 - 170, 760, 340);
      g.fillStyle = UI.ink; g.textAlign = "center"; g.font = font(48, 800, true);
      g.fillText("You are a small fish", W / 2, H / 2 - 90);
      g.font = font(26, 500); g.fillStyle = UI.muted;
      wrapText(g, `You have ${LIFE_SECONDS} seconds. Swim, eat, explore, pick things up, avoid what hunts you. There's no right way to live. Whatever you do shapes what you become.`, W / 2, H / 2 - 30, 640, 36, "center");
      g.fillStyle = UI.accent; g.font = font(26, 700);
      g.fillText("Press the button to start", W / 2, H / 2 + 125);
    }
    if (phase === "end") {
      g.fillStyle = "rgba(4,10,12,0.55)"; g.fillRect(0, 0, W, H);
      g.fillStyle = UI.ink; g.textAlign = "center"; g.font = font(56, 800, true);
      g.fillText("Something is changing…", W / 2, H / 2 - 20);
      g.font = font(26, 600); g.fillStyle = UI.muted;
      g.fillText("Your time as a fish is over. Press the button to evolve.", W / 2, H / 2 + 30);
    }
  }
};

function steer(o, target, maxSpeed, dt) {
  const dx = target.x - o.x, dy = target.y - o.y, d = Math.hypot(dx, dy) || 1;
  o.vx += (dx / d * maxSpeed - o.vx) * Math.min(1, dt * 2.5);
  o.vy += (dy / d * maxSpeed - o.vy) * Math.min(1, dt * 2.5);
  o.x = clamp(o.x + o.vx * dt, 30, W - 30);
  o.y = clamp(o.y + o.vy * dt, 200, H - 40);
}

function bite() {
  traits.bites++;
  const reach = 44;
  // Items first: picking something up is a big deal
  for (const it of items) {
    if (!it.taken && dist(it, fish) < reach + 10) {
      it.taken = true; fish.carrying = it; traits.items.push(it.kind);
      say(`You picked up ${it.label}`);
      return;
    }
  }
  for (const b of bugs) {
    if (b.alive && dist(b, fish) < reach) { b.alive = false; traits.bugs++; say("You caught a water bug"); return; }
  }
  for (const m of school.fish) {
    if (m.alive && dist({ x: school.x + m.ox, y: school.y + m.oy }, fish) < reach) { m.alive = false; traits.minnows++; say("You ate a minnow"); return; }
  }
  for (const p of plants) {
    if (p.bites > 0 && dist(p, fish) < reach + 6) { p.bites--; traits.plants++; say("You nibbled some pondweed"); return; }
  }
}

function finish() {
  phase = "end";
  traits.explored = Math.round((visited.size / (GRID_X * GRID_Y)) * 100) / 100;
  for (const k of ["surfaceTime", "bottomTime", "hideTime", "schoolTime", "idleTime", "dangerTime"]) traits[k] = Math.round(traits[k]);
}

// ---------- Drawing ----------
function drawPond(g) {
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#2f8a8a"); grd.addColorStop(0.45, "#1d5c66"); grd.addColorStop(1, "#0c2a30");
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // light ripples
  g.strokeStyle = "rgba(255,255,255,0.06)"; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    for (let x = 0; x <= W; x += 40) g.lineTo(x, 60 + i * 70 + Math.sin(x / 90 + t * 1.5 + i) * 8);
    g.stroke();
  }
  // rocks
  g.fillStyle = "#26363a";
  for (const r of rocks) { g.beginPath(); g.ellipse(r.x, r.y, r.r * 1.3, r.r * 0.8, 0, 0, Math.PI * 2); g.fill(); }
  // plants
  for (const p of plants) {
    g.strokeStyle = p.bites > 0 ? "#5fbf6a" : "#2f5f38"; g.lineWidth = 5;
    for (let k = -1; k <= 1; k++) {
      g.beginPath(); g.moveTo(p.x + k * 8, p.y + 20);
      g.quadraticCurveTo(p.x + k * 14 + Math.sin(t * 2 + p.sway) * 8, p.y - 10, p.x + k * 6 + Math.sin(t * 2 + p.sway) * 12, p.y - 34);
      g.stroke();
    }
  }
  // reeds (hiding spots)
  for (const r of reeds) {
    g.fillStyle = "rgba(40,90,50,0.35)"; g.beginPath(); g.arc(r.x, r.y, r.r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#3f7d47"; g.lineWidth = 4;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2, rr = r.r * (0.3 + (k % 3) * 0.22);
      const bx = r.x + Math.cos(a) * rr, by = r.y + Math.sin(a) * rr * 0.6;
      g.beginPath(); g.moveTo(bx, by + 30); g.lineTo(bx + Math.sin(t + k) * 5, by - 40); g.stroke();
    }
  }
  // lily pads at the surface
  for (const p of pads) { g.fillStyle = "#3c8f4a"; g.beginPath(); g.arc(p.x, p.y, p.r, 0.3, Math.PI * 2 - 0.1); g.lineTo(p.x, p.y); g.fill(); }
  // items
  for (const it of items) {
    if (it.taken) continue;
    g.fillStyle = it.color;
    if (it.kind === "stick") { g.save(); g.translate(it.x, it.y); g.rotate(0.3); g.fillRect(-34, -5, 68, 10); g.restore(); }
    else if (it.kind === "shell") { g.beginPath(); g.arc(it.x, it.y, 13, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#8a7a60"; g.lineWidth = 2; g.beginPath(); g.arc(it.x, it.y, 6, 0, Math.PI * 1.5); g.stroke(); }
    else { g.shadowColor = it.color; g.shadowBlur = 18 + Math.sin(t * 3) * 8; g.beginPath(); g.arc(it.x, it.y, 11, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0; }
  }
  // bugs
  g.fillStyle = "#f2d16b";
  for (const b of bugs) if (b.alive) { g.beginPath(); g.ellipse(b.x, b.y, 9, 5, 0, 0, Math.PI * 2); g.fill(); }
  // minnow school
  g.fillStyle = "#c9e3e6";
  for (const m of school.fish) if (m.alive) {
    const x = school.x + m.ox + Math.sin(t * 3 + m.oy) * 6, y = school.y + m.oy;
    g.beginPath(); g.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - (school.vx > 0 ? 10 : -10), y); g.lineTo(x - (school.vx > 0 ? 17 : -17), y - 4); g.lineTo(x - (school.vx > 0 ? 17 : -17), y + 4); g.fill();
  }
  // heron warning shadow
  if (heron.warn > 0) {
    const k = 1 - heron.warn / 1.6;
    g.fillStyle = `rgba(0,0,0,${0.15 + k * 0.35})`;
    g.beginPath(); g.ellipse(heron.x, heron.y, heron.r * (0.6 + k * 0.4), heron.r * 0.5 * (0.6 + k * 0.4), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = UI.bad; g.font = font(34, 800, true); g.textAlign = "center"; g.fillText("!", heron.x, heron.y + 12);
  }
  // pike
  drawFish(g, pike.x, pike.y, Math.atan2(pike.vy, pike.vx), 3.2, pike.mode === "chase" ? "#4d3a34" : "#3d4a44", false);
  // player fish
  drawFish(g, fish.x, fish.y, fish.angle, 1.5, fish.hurtFlash > 0 && Math.floor(fish.hurtFlash * 12) % 2 ? "#ffffff" : "#f2a13c", traits.tailLost);
  if (fish.carrying) { g.fillStyle = fish.carrying.color; g.beginPath(); g.arc(fish.x + Math.cos(fish.angle) * 32, fish.y + Math.sin(fish.angle) * 32, 7, 0, Math.PI * 2); g.fill(); }
}

function drawFish(g, x, y, angle, scale, color, noTail) {
  g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale);
  g.fillStyle = color;
  g.beginPath(); g.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2); g.fill();
  if (noTail) { g.fillRect(-24, -3, 6, 6); }
  else { g.beginPath(); g.moveTo(-16, 0); g.lineTo(-32, -11); g.lineTo(-32, 11); g.closePath(); g.fill(); }
  g.fillStyle = "#111"; g.beginPath(); g.arc(10, -3, 2.6, 0, Math.PI * 2); g.fill();
  g.restore();
}
