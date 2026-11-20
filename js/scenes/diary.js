// The diary: at night you write a page, with a photo of where you fell asleep taped in
// and a Doki Doki sticker naming who you were today.

import { Input } from "../core/input.js";
import { go, game, DAYS } from "../core/game.js";
import { stage } from "../core/stage.js";
import { W, H, font, wrapText } from "../core/draw.js";
import { UI, FONT } from "../core/palette.js";
import { askJSON } from "../ai/claude.js";
import { diaryPrompt } from "../ai/prompts.js";
import { fallbackDiary } from "../life/fallback.js";
import { blip, ambience } from "../core/audio.js";

let page, img, t;

export const diaryScene = {
  enter(data) {
    stage.view = null;
    stage.renderer.clear();
    t = 0; page = null; img = null;
    if (data.photo) { img = new Image(); img.src = data.photo; }
    ambience("quiet");
    const todays = game.log.filter(l => l.day === game.day).map(l => l.text);
    const answers = game.answers.filter(a => a.day === game.day);
    askJSON(diaryPrompt(game.life, todays, answers, game.axes), {
      validate: d => { if (typeof d.entry !== "string" || typeof d.sticker !== "string") throw new Error("bad"); return { entry: d.entry.slice(0, 700), sticker: d.sticker.slice(0, 40), note: String(d.note || "").slice(0, 200) }; },
      fallback: () => fallbackDiary(game.log.filter(l => l.day === game.day))
    }).then(r => { page = r.value; game.diary.push({ day: game.day, ...page }); blip("page"); t = 0; });
  },
  update(dt) {
    t += dt;
    if (page && t > 1 && Input.pressed()) {
      if (game.day < DAYS) { game.day++; go("planet", { world: game.world }); }
      else go("reading");
    }
  },
  draw(g) {
    // Desk and an open notebook
    g.fillStyle = "#d9ab78"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#fbfaf5"; g.fillRect(90, 50, 540, 620); g.fillRect(650, 50, 540, 620);
    g.strokeStyle = "#d9d3c4"; g.lineWidth = 1;
    for (let y = 150; y < 650; y += 40) { g.beginPath(); g.moveTo(110, y); g.lineTo(610, y); g.moveTo(670, y); g.lineTo(1170, y); g.stroke(); }
    g.fillStyle = "#d6cfbd"; g.fillRect(636, 50, 8, 620);
    g.fillStyle = UI.red; g.fillRect(116, 50, 3, 620);

    g.fillStyle = UI.ink; g.textAlign = "left"; g.font = font(40, 600, FONT.hand);
    g.fillText(`Day one on ${game.life.world.name}`, 130, 115);

    // Photo of the day, taped on
    if (img && img.complete && img.naturalWidth) {
      g.save(); g.translate(150, 160); g.rotate(-0.03);
      g.fillStyle = "#fff"; g.fillRect(-10, -10, 440, 268);
      g.drawImage(img, 0, 0, 420, 236);
      g.fillStyle = "rgba(200,16,46,0.25)"; g.fillRect(170, -22, 90, 26);
      g.restore();
    }
    if (!page) {
      g.fillStyle = UI.muted; g.font = font(28, 400, FONT.hand);
      g.fillText("writing" + ".".repeat(1 + Math.floor(t * 2) % 3), 130, 470);
      return;
    }
    g.fillStyle = UI.ink; g.font = font(25, 400, FONT.hand);
    wrapText(g, page.entry, 690, 190, 470, 40);

    // Sticker
    g.save(); g.translate(215, 548); g.rotate(-0.08);
    g.fillStyle = UI.red; g.beginPath(); g.arc(0, 0, 78, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 68, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#fff"; g.textAlign = "center"; g.font = font(11, 900); g.fillText("TODAY YOU WERE", 0, -30);
    g.font = font(22, 400, FONT.title); wrapText(g, page.sticker, 0, 2, 130, 24, "center");
    g.restore();
    g.fillStyle = UI.ink; g.font = font(22, 600, FONT.hand);
    wrapText(g, page.note, 320, 500, 290, 32);

    if (t > 1) {
      g.fillStyle = UI.red; g.font = font(18, 900); g.textAlign = "right";
      g.fillText(game.day < DAYS ? "PRESS THE BUTTON TO WAKE UP" : "PRESS THE BUTTON TO TURN THE PAGE", 1170, 700);
    }
  }
};
