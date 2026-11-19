// Mini-game "catch": things fall from the sky. Move left and right to catch the good ones and dodge the bad ones.
// Joystick only; the button isn't needed.

import { Input } from "../core/input.js";
import { W, H, UI, font, roundRect, clamp } from "../core/draw.js";
import { drawCreature } from "../life/creature.js";

export const howTo = "Move left and right. Catch the good things, dodge the bad ones.";

export function create(job, life) {
  const GAME_TIME = 30;
  let t = 0, spawn = 0, score = 0, caught = 0, missed = 0, x = W / 2;
  const drops = [];
  return {
    get score() { return score; },
    maxScore: 22,
    timeLeft: () => Math.max(0, GAME_TIME - t),
    update(dt) {
      t += dt; spawn -= dt;
      x = clamp(x + Input.x * 620 * dt, 60, W - 60);
      if (spawn <= 0) {
        spawn = Math.max(0.45, 1.05 - t * 0.02);
        const good = Math.random() < 0.68;
        drops.push({ x: 80 + Math.random() * (W - 160), y: 120, v: 160 + t * 7 + Math.random() * 60, good, label: (good ? job.good : job.bad)[Math.floor(Math.random() * (good ? 3 : 2))] });
      }
      for (const d of drops) {
        d.y += d.v * dt;
        if (!d.done && d.y > H - 140 && d.y < H - 90 && Math.abs(d.x - x) < 70) {
          d.done = true;
          if (d.good) { score++; caught++; Input.signal("b"); } else { score = Math.max(0, score - 1); missed++; }
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].done || drops[i].y > H) drops.splice(i, 1);
      return t >= GAME_TIME;
    },
    draw(g, t2) {
      for (const d of drops) {
        g.font = font(20, 700);
        const w = g.measureText(d.label).width + 28;
        g.fillStyle = d.good ? life.world.accent : UI.bad;
        roundRect(g, d.x - w / 2, d.y - 18, w, 36, 18); g.fill();
        g.fillStyle = "#151515"; g.textAlign = "center"; g.fillText(d.label, d.x, d.y + 7);
      }
      drawCreature(g, x, H - 110, 1.2, life.creature.body, t2);
      g.fillStyle = UI.ink; g.font = font(24, 700); g.textAlign = "left";
      g.fillText(`Caught ${caught}`, 30, H - 30);
    },
    summary: () => `You caught ${caught} and grabbed ${missed} you shouldn't have.`
  };
}
