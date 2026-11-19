// Title screen: the first state. Pressing the button starts a new life as a fish.

import { Input } from "../core/input.js";
import { go, game, newRun } from "../core/game.js";
import { W, H, UI, font, wrapText } from "../core/draw.js";
import { warmUp } from "../ai/claude.js";

let t = 0;
const bubbles = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 6, s: 20 + Math.random() * 50 }));

export const titleScene = {
  enter() { t = 0; newRun(); },
  update(dt) {
    t += dt;
    for (const b of bubbles) { b.y -= b.s * dt; if (b.y < -10) { b.y = H + 10; b.x = Math.random() * W; } }
    if (t > 0.4 && Input.pressed()) {
      warmUp(); // ask for AI permission now, while the player is clearly interacting
      go("pond");
    }
  },
  draw(g) {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#123b46"); grd.addColorStop(1, "#071417");
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,0.12)";
    for (const b of bubbles) { g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill(); }

    g.fillStyle = UI.ink;
    g.textAlign = "center";
    g.font = font(180, 800, true);
    g.fillText("EVOL", W / 2, 300);
    g.font = font(32, 600);
    g.fillStyle = UI.muted;
    wrapText(g, "You start as a fish. What you do decides what you become.", W / 2, 370, 900, 42, "center");

    const pulse = 0.6 + 0.4 * Math.sin(t * 4);
    g.globalAlpha = pulse;
    g.fillStyle = UI.accent;
    g.font = font(30, 700);
    g.fillText("Press the button to begin", W / 2, 500);
    g.globalAlpha = 1;

    if (game.history.length) {
      g.fillStyle = UI.muted;
      g.font = font(22, 600);
      g.fillText(`You have lived ${game.history.length} ${game.history.length === 1 ? "life" : "lives"} before.`, W / 2, 560);
    }
  }
};
