// Evolving: shows the player what they did in the pond while the AI turns it into a new life,
// then reveals the creature. If the AI is unavailable, the offline generator steps in.

import { Input } from "../core/input.js";
import { go, game } from "../core/game.js";
import { W, H, UI, font, wrapText, hint, easeOut, clamp } from "../core/draw.js";
import { askJSON } from "../ai/claude.js";
import { lifePrompt } from "../ai/prompts.js";
import { describeTraits } from "../life/traits.js";
import { fallbackLife } from "../life/fallback.js";
import { cleanLife } from "../life/schema.js";
import { drawCreature } from "../life/creature.js";

let t, lines, result, revealAt, fromAI;

export const evolvingScene = {
  enter() {
    t = 0; result = null; revealAt = 0; fromAI = false;
    lines = describeTraits(game.traits);
    const past = game.history.flatMap(r => [r.creatureName, r.worldName]).filter(Boolean);
    askJSON(lifePrompt(lines, game.seed, past), {
      validate: cleanLife,
      fallback: () => cleanLife(fallbackLife(game.traits, game.seed)),
      timeoutMs: 45000
    }).then(r => { result = r.value; fromAI = r.fromAI; });
  },
  update(dt) {
    t += dt;
    // Reveal once the AI has answered AND the player has had time to read their pond recap
    if (result && !revealAt && t > 1.2 + lines.length * 0.7) { revealAt = t; game.life = result; }
    if (revealAt && t - revealAt > 1.5 && Input.pressed()) go("world", { first: true });
  },
  draw(g) {
    const grd = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 800);
    grd.addColorStop(0, "#1e3c44"); grd.addColorStop(1, "#070d0f");
    g.fillStyle = grd; g.fillRect(0, 0, W, H);

    if (!revealAt) {
      // Pond recap, one line at a time
      g.textAlign = "left"; g.fillStyle = UI.accent; g.font = font(30, 800, true);
      g.fillText("What you did as a fish", 120, 120);
      lines.forEach((l, i) => {
        const a = clamp((t - 0.6 - i * 0.7) / 0.4, 0, 1);
        g.globalAlpha = a; g.fillStyle = UI.ink; g.font = font(30, 600);
        g.fillText("•  " + l, 130 + (1 - a) * 20, 180 + i * 48);
      });
      g.globalAlpha = 1;
      // Cocoon pulsing on the right
      const p = 1 + Math.sin(t * 5) * 0.05;
      g.save(); g.translate(1010, 380); g.scale(p, p);
      g.fillStyle = "#c9b98f"; g.beginPath(); g.ellipse(0, 0, 70, 110, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#a8996f"; g.lineWidth = 3;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(0, i * 26, 70 * Math.sqrt(1 - (i / 4.3) ** 2), 10, 0, 0, Math.PI); g.stroke(); }
      g.restore();
      g.fillStyle = UI.muted; g.font = font(24, 600); g.textAlign = "center";
      g.fillText(result ? "Ready…" : "Evolving" + ".".repeat(1 + Math.floor(t * 2) % 3), 1010, 560);
      return;
    }

    const k = easeOut(clamp((t - revealAt) / 1.2, 0, 1));
    const life = game.life;
    // Burst
    g.globalAlpha = 1 - k; g.fillStyle = "#fff"; g.beginPath(); g.arc(380, 360, 60 + k * 500, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    drawCreature(g, 380, 360, 2.8 + k * 1.2, life.creature.body, t);

    g.globalAlpha = k;
    g.textAlign = "left"; g.fillStyle = UI.accent; g.font = font(28, 800, true);
    g.fillText("You evolved into", 700, 170);
    g.fillStyle = UI.ink; g.font = font(72, 800, true);
    g.fillText(life.creature.name, 700, 245);
    g.font = font(28, 500); g.fillStyle = UI.ink;
    let y = wrapText(g, life.creature.description, 700, 300, 500, 38);
    g.fillStyle = UI.accent; g.font = font(26, 700);
    y = wrapText(g, life.creature.because, 700, y + 14, 500, 36);
    g.fillStyle = UI.muted; g.font = font(24, 600);
    wrapText(g, `Your world: ${life.world.name}. ${life.world.description}`, 700, y + 18, 500, 32);
    g.globalAlpha = 1;
    if (!fromAI) { g.fillStyle = UI.muted; g.font = font(18, 600); g.textAlign = "left"; g.fillText("AI unavailable: built offline from your traits", 30, H - 30); }
    if (t - revealAt > 1.5) hint(g, "Press the button to enter your world");
  }
};
