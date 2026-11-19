// A job: instructions, then a mini-game (catch, timing or recipe), then pay, then a small dilemma
// written by the AI for this world. The dilemma answer is saved for the Oracle.

import { Input } from "../core/input.js";
import { go, game } from "../core/game.js";
import { W, H, UI, font, wrapText, panel, choiceButtons, hint } from "../core/draw.js";
import { askJSON } from "../ai/claude.js";
import { dilemmaPrompt } from "../ai/prompts.js";
import { fallbackDilemma } from "../life/fallbacks.js";
import * as Catch from "../jobs/catch.js";
import * as Timing from "../jobs/timing.js";
import * as Recipe from "../jobs/recipe.js";

const TEMPLATES = { catch: Catch, timing: Timing, recipe: Recipe };
let job, mod, play, phase, t, pay, dilemma, sel, phaseT;

const cleanDilemma = d => {
  if (!d || typeof d.prompt !== "string" || typeof d.a !== "string" || typeof d.b !== "string") throw new Error("bad dilemma");
  return { prompt: d.prompt.slice(0, 200), a: d.a.slice(0, 40), b: d.b.slice(0, 40) };
};

export const jobScene = {
  enter(data) {
    job = data.job; mod = TEMPLATES[job.template];
    play = mod.create(job, game.life);
    phase = "howto"; t = 0; phaseT = 0; sel = 0; dilemma = null;
    // Ask for the dilemma now so it's ready when the shift ends
    askJSON(dilemmaPrompt(game.life, job, game.choices), {
      validate: cleanDilemma,
      fallback: () => fallbackDilemma(game.choices.length),
      tier: "quick"
    }).then(r => { dilemma = r.value; });
  },
  update(dt) {
    t += dt; phaseT += dt;
    if (phase === "howto") { if (phaseT > 0.4 && Input.pressed()) { phase = "play"; phaseT = 0; } return; }
    if (phase === "play") {
      if (play.update(dt)) {
        pay = Math.max(1, Math.round(job.pay * Math.min(1, play.score / play.maxScore) * 1.2));
        game.coins += pay; game.jobsDone++;
        phase = "result"; phaseT = 0;
      }
      return;
    }
    if (phase === "result") { if (phaseT > 0.8 && Input.pressed() && dilemma) { phase = "dilemma"; phaseT = 0; } return; }
    if (phase === "dilemma") {
      const tap = Input.tapped();
      if (tap.x) sel = tap.x > 0 ? 1 : 0;
      if (phaseT > 0.5 && Input.pressed()) {
        const picked = sel === 0 ? dilemma.a : dilemma.b, other = sel === 0 ? dilemma.b : dilemma.a;
        game.choices.push({ where: `the ${job.name} job`, prompt: dilemma.prompt, picked, other });
        go("world");
      }
    }
  },
  draw(g) {
    const wd = game.life.world;
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, wd.ground2); grd.addColorStop(1, wd.ground);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // Header
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, 0, W, 70);
    g.textAlign = "left"; g.fillStyle = UI.ink; g.font = font(28, 800, true); g.fillText(job.name, 24, 46);
    if (phase === "play") {
      const tl = play.timeLeft();
      g.textAlign = "right"; g.font = font(26, 700); g.fillStyle = wd.accent;
      g.fillText(tl === null ? "" : `${Math.ceil(tl)}s left`, W - 24, 46);
      play.draw(g, t);
      return;
    }
    if (phase === "howto") {
      panel(g, W / 2 - 360, H / 2 - 150, 720, 300);
      g.textAlign = "center"; g.fillStyle = UI.ink; g.font = font(40, 800, true); g.fillText(job.name, W / 2, H / 2 - 80);
      g.font = font(24, 500); g.fillStyle = UI.muted;
      let y = wrapText(g, job.blurb, W / 2, H / 2 - 30, 600, 32, "center");
      g.fillStyle = UI.ink; g.font = font(24, 700);
      wrapText(g, mod.howTo, W / 2, y + 10, 600, 32, "center");
      g.fillStyle = UI.accent; g.fillText("Press the button to start", W / 2, H / 2 + 120);
      return;
    }
    if (phase === "result") {
      panel(g, W / 2 - 340, H / 2 - 130, 680, 260);
      g.textAlign = "center"; g.fillStyle = wd.accent; g.font = font(54, 800, true);
      g.fillText(`+${pay} ${wd.currency}`, W / 2, H / 2 - 40);
      g.fillStyle = UI.ink; g.font = font(26, 600); g.fillText(play.summary(), W / 2, H / 2 + 10);
      g.fillStyle = UI.muted; g.font = font(22, 600);
      g.fillText(dilemma ? "Press the button" : "Wrapping up the shift…", W / 2, H / 2 + 85);
      return;
    }
    // Dilemma
    panel(g, 160, 180, W - 320, 360);
    g.textAlign = "center"; g.fillStyle = wd.accent; g.font = font(24, 800, true); g.fillText("Before you head out…", W / 2, 240);
    g.fillStyle = UI.ink; g.font = font(32, 600);
    wrapText(g, dilemma.prompt, W / 2, 300, W - 440, 42, "center");
    choiceButtons(g, [dilemma.a, dilemma.b], sel, 220, 430, W - 440, 76);
    hint(g, "Joystick left / right to choose, button to decide");
  }
};
