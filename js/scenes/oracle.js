// The Oracle: the AI reads the whole life (pond behavior, what you became, every choice) plus
// insights from earlier lives, and offers something new each time. Saved so the next life goes deeper.

import { Input } from "../core/input.js";
import { go, game, newRun } from "../core/game.js";
import { W, H, UI, font, wrapText, panel, choiceButtons, hint } from "../core/draw.js";
import { askJSON } from "../ai/claude.js";
import { oraclePrompt } from "../ai/prompts.js";
import { describeTraits } from "../life/traits.js";
import { fallbackInsight } from "../life/fallbacks.js";
import { saveRun } from "../core/store.js";

let reading, phase, sel, t;

const cleanInsight = x => {
  if (!x || typeof x.insight !== "string") throw new Error("bad insight");
  return { title: String(x.title || "A new thought").slice(0, 60), insight: x.insight.slice(0, 420), question: String(x.question || "").slice(0, 200) };
};

export const oracleScene = {
  enter() {
    reading = null; phase = "wait"; sel = 0; t = 0;
    askJSON(oraclePrompt(game.life, describeTraits(game.traits), game.choices, game.history), {
      validate: cleanInsight,
      fallback: () => fallbackInsight(game.traits, game.choices)
    }).then(r => {
      reading = r.value; phase = "read"; t = 0;
      game.insights.push({ title: reading.title, text: reading.insight });
      saveRun({ id: game.runId, creatureName: game.life.creature.name, worldName: game.life.world.name, insights: game.insights, choices: game.choices, at: Date.now() });
    });
  },
  update(dt) {
    t += dt;
    if (phase !== "read") return;
    const tap = Input.tapped();
    if (tap.x) sel = tap.x > 0 ? 1 : 0;
    if (t > 1 && Input.pressed()) {
      if (sel === 0) go("world");
      else { newRun(); go("pond"); }
    }
  },
  draw(g) {
    const wd = game.life.world;
    g.fillStyle = "#07090b"; g.fillRect(0, 0, W, H);
    g.save(); g.shadowColor = wd.accent; g.shadowBlur = 80 + Math.sin(t * 1.5) * 30;
    g.fillStyle = wd.accent; g.beginPath(); g.arc(W / 2, 150, 50 + Math.sin(t * 1.5) * 4, 0, Math.PI * 2); g.fill(); g.restore();
    g.textAlign = "center"; g.fillStyle = UI.muted; g.font = font(22, 600);
    g.fillText(`${game.life.oracle.name}, ${game.life.oracle.form}`, W / 2, 245);

    if (phase === "wait") {
      g.fillStyle = UI.ink; g.font = font(30, 600);
      g.fillText("The Oracle is looking back over your life" + ".".repeat(1 + Math.floor(t * 2) % 3), W / 2, 380);
      return;
    }
    g.fillStyle = wd.accent; g.font = font(48, 800, true); g.fillText(reading.title, W / 2, 315);
    g.fillStyle = UI.ink; g.font = font(28, 500);
    let y = wrapText(g, reading.insight, W / 2, 370, 900, 40, "center");
    g.fillStyle = UI.muted; g.font = font(26, 600);
    wrapText(g, reading.question, W / 2, y + 16, 900, 36, "center");
    if (t > 1) {
      choiceButtons(g, ["Return to the world", "Begin a new life"], sel, W / 2 - 380, 600, 760, 64);
      hint(g, "Left / right to choose, button to go");
    }
  }
};
