// Talking to an NPC. The AI writes what they say, in character, based on who the player
// became and what they've chosen so far. The player's reply is saved for the Oracle.

import { Input } from "../core/input.js";
import { go, game } from "../core/game.js";
import { W, H, UI, font, wrapText, panel, choiceButtons, hint } from "../core/draw.js";
import { askJSON } from "../ai/claude.js";
import { talkPrompt } from "../ai/prompts.js";
import { fallbackTalk } from "../life/fallbacks.js";
import { drawCreature } from "../life/creature.js";

let npc, convo, phase, sel, t;

const cleanTalk = c => {
  for (const k of ["line", "a", "b", "replyA", "replyB"]) if (typeof c[k] !== "string") throw new Error("bad talk");
  return c;
};

export const talkScene = {
  enter(data) {
    npc = data.npc; convo = null; phase = "wait"; sel = 0; t = 0;
    askJSON(talkPrompt(game.life, npc, game.choices, data.met), { validate: cleanTalk, fallback: () => fallbackTalk(npc), tier: "quick" })
      .then(r => { convo = r.value; phase = "ask"; t = 0; });
  },
  update(dt) {
    t += dt;
    if (phase === "ask") {
      const tap = Input.tapped();
      if (tap.x) sel = tap.x > 0 ? 1 : 0;
      if (t > 0.5 && Input.pressed()) {
        game.choices.push({ where: `a talk with ${npc.name}`, prompt: convo.line, picked: sel ? convo.b : convo.a, other: sel ? convo.a : convo.b });
        phase = "reply"; t = 0;
      }
    } else if (phase === "reply" && t > 0.5 && Input.pressed()) go("world");
  },
  draw(g) {
    const wd = game.life.world;
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, wd.ground2); grd.addColorStop(1, wd.ground);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    drawCreature(g, 300, 330, 3, npc.body, t, 1);
    drawCreature(g, 1110, 560, 1.4, game.life.creature.body, t, -1);
    g.textAlign = "left"; g.fillStyle = UI.ink; g.font = font(40, 800, true); g.fillText(npc.name, 80, 90);
    g.fillStyle = UI.muted; g.font = font(22, 600); g.fillText(npc.role, 80, 124);

    panel(g, 520, 120, 680, 300);
    g.fillStyle = UI.ink; g.font = font(30, 600);
    if (phase === "wait") { g.textAlign = "center"; g.fillText("…", 860, 280); return; }
    const said = phase === "ask" ? convo.line : (sel ? convo.replyB : convo.replyA);
    wrapText(g, said, 560, 180, 600, 42);
    if (phase === "ask") {
      choiceButtons(g, [convo.a, convo.b], sel, 120, 590, 760, 76);
      hint(g, "Joystick left / right to choose, button to answer");
    } else hint(g, "Button: back to the world");
  }
};
