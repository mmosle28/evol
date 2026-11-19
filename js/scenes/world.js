// The world after evolving: a sandbox hub. Walk around, take jobs (mini-games), talk to NPCs,
// and visit the Oracle. Everything here (names, colors, scenery, NPCs, jobs) came from the AI.

import { Input } from "../core/input.js";
import { go, game } from "../core/game.js";
import { makeRng } from "../core/rng.js";
import { W, H, UI, font, wrapText, panel, roundRect, hint, clamp, dist } from "../core/draw.js";
import { drawCreature, shade } from "../life/creature.js";
import { drawProp } from "../life/props.js";

let t, player, spots, npcs, props, showIntro, near, built = "";

/** Build the layout once per life (kept when the player comes back from a job or a chat). */
function build() {
  const life = game.life;
  const rng = makeRng(game.seed ^ 0x9e3779b9);
  spots = [
    ...life.jobs.map((job, i) => ({ kind: "job", job, x: [220, W - 220, 220][i], y: [190, 190, 560][i], label: job.name })),
    { kind: "oracle", x: W - 220, y: 560, label: life.oracle.name }
  ];
  npcs = life.npcs.map((npc, i) => ({ npc, x: 480 + i * 160, y: 330 + (i % 2) * 90, tx: 640, ty: 380, wait: 0, facing: 1, met: 0 }));
  props = [];
  for (let i = 0; i < 40 && props.length < 18; i++) {
    const p = { x: rng.range(40, W - 40), y: rng.range(90, H - 40), s: rng.range(0.8, 1.3) };
    if (spots.every(s => dist(s, p) > 150) && dist(p, { x: W / 2, y: H / 2 }) > 120) props.push(p);
  }
  player = { x: W / 2, y: H / 2 + 40, facing: 1 };
  built = game.runId;
}

export const worldScene = {
  enter(data) {
    t = 0;
    if (built !== game.runId) build();
    showIntro = !!data.first;
  },
  update(dt) {
    t += dt;
    if (showIntro) { if (t > 0.5 && Input.pressed()) showIntro = false; return; }

    // Move
    const sp = 240;
    player.x = clamp(player.x + Input.x * sp * dt, 40, W - 40);
    player.y = clamp(player.y + Input.y * sp * dt, 110, H - 50);
    if (Math.abs(Input.x) > 0.2) player.facing = Input.x > 0 ? 1 : -1;

    // NPCs wander, and pause to face you when you come close
    for (const n of npcs) {
      if (dist(n, player) < 110) { n.facing = player.x > n.x ? 1 : -1; continue; }
      n.wait -= dt;
      if (n.wait <= 0 && dist(n, { x: n.tx, y: n.ty }) < 8) { n.tx = 360 + Math.random() * 560; n.ty = 260 + Math.random() * 240; n.wait = 1 + Math.random() * 2; }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
      if (d > 4 && n.wait <= 0) { n.x += dx / d * 60 * dt; n.y += dy / d * 60 * dt; n.facing = dx > 0 ? 1 : -1; }
    }

    // What's close enough to use?
    near = null;
    let best = 95;
    for (const s of spots) { const d = dist(s, player); if (d < best) { best = d; near = s; } }
    for (const n of npcs) { const d = dist(n, player); if (d < best) { best = d; near = { kind: "npc", n, label: n.npc.name }; } }

    if (near && Input.pressed()) {
      Input.signal("b");
      if (near.kind === "job") go("job", { job: near.job });
      else if (near.kind === "oracle") go("oracle");
      else { near.n.met++; go("talk", { npc: near.n.npc, met: near.n.met > 1 }); }
    }
  },
  draw(g) {
    const life = game.life, wd = life.world;
    // Ground
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, wd.ground2); grd.addColorStop(1, wd.ground);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,0.03)";
    for (let i = 0; i < 12; i++) g.fillRect(0, 100 + i * 52, W, 2);

    // Paths from the middle to each place
    g.strokeStyle = shade(wd.ground2, 18); g.lineWidth = 28; g.lineCap = "round";
    for (const s of spots) { g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(s.x, s.y); g.stroke(); }

    for (const p of props) drawProp(g, wd.props, p.x, p.y, p.s, wd.accent, t);

    // Job buildings and the Oracle
    for (const s of spots) {
      if (s.kind === "oracle") {
        g.save(); g.shadowColor = wd.accent; g.shadowBlur = 40 + Math.sin(t * 2) * 15;
        g.fillStyle = wd.accent; g.beginPath(); g.arc(s.x, s.y - 20, 34 + Math.sin(t * 2) * 3, 0, Math.PI * 2); g.fill(); g.restore();
        g.fillStyle = shade(wd.ground, -20); g.fillRect(s.x - 40, s.y + 10, 80, 18);
      } else {
        g.fillStyle = shade(wd.ground2, 35); roundRect(g, s.x - 80, s.y - 50, 160, 90, 14); g.fill();
        g.fillStyle = wd.accent; g.beginPath(); g.moveTo(s.x - 95, s.y - 46); g.lineTo(s.x, s.y - 100); g.lineTo(s.x + 95, s.y - 46); g.fill();
        g.fillStyle = shade(wd.ground, -25); roundRect(g, s.x - 18, s.y - 6, 36, 46, 8); g.fill();
      }
      g.fillStyle = UI.ink; g.font = font(20, 700); g.textAlign = "center";
      g.fillText(s.label, s.x, s.y + 66);
    }

    // NPCs and the player
    for (const n of npcs) {
      drawCreature(g, n.x, n.y, 0.9, n.npc.body, t + n.x, n.facing);
      g.fillStyle = UI.ink; g.font = font(17, 700); g.textAlign = "center"; g.fillText(n.npc.name, n.x, n.y - 48);
    }
    drawCreature(g, player.x, player.y, 1.15, life.creature.body, t, player.facing);

    // HUD
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, 0, W, 64);
    g.textAlign = "left"; g.fillStyle = UI.ink; g.font = font(26, 800, true);
    g.fillText(`${life.creature.name} in ${wd.name}`, 24, 42);
    g.textAlign = "right"; g.font = font(24, 700); g.fillStyle = wd.accent;
    g.fillText(`${game.coins} ${wd.currency}  ·  ${game.jobsDone} job${game.jobsDone === 1 ? "" : "s"} done  ·  ${game.choices.length} choice${game.choices.length === 1 ? "" : "s"} made`, W - 24, 42);

    if (near && !showIntro) {
      const verb = near.kind === "job" ? `Work as ${near.label}` : near.kind === "oracle" ? `Visit ${near.label}` : `Talk to ${near.label}`;
      hint(g, `Button: ${verb}`);
    } else if (!showIntro) hint(g, "Walk up to a building, a local, or the glowing Oracle");

    if (showIntro) {
      panel(g, W / 2 - 400, H / 2 - 170, 800, 340);
      g.textAlign = "center"; g.fillStyle = UI.ink; g.font = font(44, 800, true);
      g.fillText(`Welcome to ${wd.name}`, W / 2, H / 2 - 95);
      g.font = font(25, 500); g.fillStyle = UI.muted;
      wrapText(g, `Live here however you want. Take jobs to earn ${wd.currency}, talk to the locals, and visit ${life.oracle.name} whenever you want to learn something about yourself. Every choice you make is remembered.`, W / 2, H / 2 - 35, 680, 36, "center");
      g.fillStyle = UI.accent; g.font = font(25, 700);
      g.fillText("Press the button to explore", W / 2, H / 2 + 130);
    }
  }
};
