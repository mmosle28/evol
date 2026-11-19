// The reading: after three summer days, the game tells you who you were this life, Doki Doki style.
// It reads the pond, the village, and your odd answers, and never repeats an archetype from past lives.

import { Input } from "../core/input.js";
import { go, game, newRun } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, box, choices, hint, clamp } from "../core/draw.js";
import { UI, FONT, PAL } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makeSky } from "../gfx/sky.js";
import * as M from "../gfx/models.js";
import { askJSON } from "../ai/claude.js";
import { readingPrompt } from "../ai/prompts.js";
import { describeTraits } from "../life/traits.js";
import { fallbackReading } from "../life/fallback.js";
import { saveRun } from "../core/store.js";
import { blip } from "../core/audio.js";

const THREE = window.THREE;
let view, sky, me, reading, t, sel;

export const readingScene = {
  enter() {
    const scene = new THREE.Scene();
    sky = makeSky(scene, makeRng(game.seed + 3), { clouds: 14 });
    sky.setTime(0.95, { x: 0, z: 0 });
    scene.add(M.ground(260));
    me = M.creature(game.life.creature.body, { scale: 1.8 }); me.position.set(5, 0, 0); scene.add(me);
    const camera = makeCamera(40); camera.position.set(-3, 7, 26); camera.lookAt(-3, 3.5, 0);
    view = { scene, camera }; stage.view = view;
    t = 0; sel = 0; reading = null;
    askJSON(readingPrompt(game.life, describeTraits(game.traits), game.log, game.answers, game.axes, game.history), {
      validate: r => { if (typeof r.archetype !== "string" || !Array.isArray(r.lines)) throw new Error("bad"); return { archetype: r.archetype.slice(0, 50), lines: r.lines.slice(0, 3).map(l => String(l).slice(0, 220)), question: String(r.question || "").slice(0, 200) }; },
      fallback: () => fallbackReading(game.axes)
    }).then(r => {
      reading = r.value; t = 0; blip("get");
      saveRun({ id: game.runId, creatureName: game.life.creature.name, worldName: game.life.world.name, reading, diary: game.diary.map(d => ({ day: d.day, sticker: d.sticker })), at: Date.now() });
    });
  },
  update(dt) {
    t += dt; sky.update(dt);
    me.rotation.y = -0.5 + Math.sin(t * 0.6) * 0.3; M.animateCreature(me, t, false);
    if (!reading || t < 1.5) return;
    const tap = Input.tapped();
    if (tap.x) sel = tap.x > 0 ? 1 : 0;
    if (Input.pressed()) { if (sel === 0) { newRun(); go("pond"); } else go("title"); }
  },
  draw(g) {
    box(g, 60, 40, 700, 640);
    g.textAlign = "left";
    if (!reading) {
      g.fillStyle = UI.ink; g.font = font(26, 700);
      g.fillText("Looking back over your summer" + ".".repeat(1 + Math.floor(t * 2) % 3), 100, 140);
      return;
    }
    const k = clamp(t / 0.8, 0, 1);
    g.globalAlpha = k;
    g.fillStyle = UI.ink; g.font = font(18, 900); g.fillText(`THIS LIFE, AS ${game.life.creature.name.toUpperCase()}, YOU WERE`, 100, 100);
    g.fillStyle = UI.red; g.font = font(54, 400, FONT.title);
    let y = wrapText(g, reading.archetype, 100, 160, 620, 58);
    g.font = font(20, 500);
    for (const l of reading.lines) { g.fillStyle = UI.red; g.fillRect(100, y + 4, 6, 6); g.fillStyle = UI.ink; y = wrapText(g, l, 120, y + 14, 600, 28) + 6; }
    g.fillStyle = UI.muted; g.font = font(20, 700);
    wrapText(g, reading.question, 100, y + 8, 620, 28);
    g.globalAlpha = 1;
    if (t > 1.5) { choices(g, ["Live another life", "Back to the title"], sel, 100, 606, 620, 52); hint(g, "Left / right to choose, button to go"); }
  }
};
