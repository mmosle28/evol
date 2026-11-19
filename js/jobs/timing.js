// Mini-game "timing": a marker swings across a bar. Press the button when it's inside the gold zone.
// The zone shrinks and the marker speeds up each round.

import { Input } from "../core/input.js";
import { W, H, UI, font, roundRect } from "../core/draw.js";
import { drawCreature } from "../life/creature.js";

export const howTo = "Press the button when the marker is inside the gold zone.";

export function create(job, life) {
  const ROUNDS = 8;
  let round = 0, pos = 0, dir = 1, hits = 0, flash = 0, flashGood = false, zone = newZone(0);
  function newZone(r) { const w = 0.22 - r * 0.018; return { a: 0.1 + Math.random() * (0.8 - w), w }; }
  return {
    get score() { return hits; },
    maxScore: ROUNDS,
    timeLeft: () => null,
    update(dt) {
      flash = Math.max(0, flash - dt);
      pos += dir * (0.55 + round * 0.09) * dt;
      if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
      if (Input.pressed() && round < ROUNDS) {
        flashGood = pos >= zone.a && pos <= zone.a + zone.w;
        if (flashGood) { hits++; Input.signal("b"); }
        flash = 0.4; round++; zone = newZone(round);
      }
      return round >= ROUNDS && flash <= 0;
    },
    draw(g, t2) {
      const x = 190, y = 330, w = W - 380, h = 60;
      g.fillStyle = "rgba(255,255,255,0.1)"; roundRect(g, x, y, w, h, 30); g.fill();
      g.fillStyle = life.world.accent; roundRect(g, x + zone.a * w, y, zone.w * w, h, 12); g.fill();
      g.fillStyle = "#fff"; g.fillRect(x + pos * w - 4, y - 18, 8, h + 36);
      if (flash > 0) { g.fillStyle = flashGood ? UI.good : UI.bad; g.font = font(48, 800, true); g.textAlign = "center"; g.fillText(flashGood ? "Perfect!" : "Missed", W / 2, 270); }
      g.fillStyle = UI.ink; g.font = font(26, 700); g.textAlign = "center";
      g.fillText(`Round ${Math.min(round + 1, ROUNDS)} of ${ROUNDS}   ·   ${hits} hit`, W / 2, 470);
      drawCreature(g, W / 2, 580, 1.3, life.creature.body, t2);
    },
    summary: () => `You hit ${hits} of ${ROUNDS}.`
  };
}
