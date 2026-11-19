// Mini-game "recipe": an order appears. Use the joystick to move between ingredients and press
// the button to add them in the right order. Three orders, 45 seconds.

import { Input } from "../core/input.js";
import { W, H, UI, font, roundRect } from "../core/draw.js";
import { drawCreature } from "../life/creature.js";

export const howTo = "Move left and right to pick an ingredient, press the button to add it. Follow the order exactly.";

export function create(job, life) {
  const GAME_TIME = 45, ORDERS = 3;
  let t = 0, sel = 2, done = 0, step = 0, mistakes = 0, shake = 0, order = newOrder();
  function newOrder() {
    const pool = [...job.ingredients].sort(() => Math.random() - 0.5);
    return pool.slice(0, 3 + Math.min(done, 1));
  }
  return {
    get score() { return done; },
    maxScore: ORDERS,
    timeLeft: () => Math.max(0, GAME_TIME - t),
    update(dt) {
      t += dt; shake = Math.max(0, shake - dt);
      const tap = Input.tapped();
      if (tap.x) sel = (sel + tap.x + 5) % 5;
      if (Input.pressed()) {
        if (job.ingredients[sel] === order[step]) {
          step++; Input.signal("b");
          if (step >= order.length) { done++; step = 0; if (done < ORDERS) order = newOrder(); }
        } else { mistakes++; shake = 0.35; }
      }
      return done >= ORDERS || t >= GAME_TIME;
    },
    draw(g, t2) {
      // The order
      g.fillStyle = UI.muted; g.font = font(24, 700); g.textAlign = "center";
      g.fillText(`Order ${Math.min(done + 1, ORDERS)} of ${ORDERS}`, W / 2, 190);
      const ow = 200;
      order.forEach((ing, i) => {
        const x = W / 2 - (order.length * ow) / 2 + i * ow + ow / 2;
        g.fillStyle = i < step ? UI.good : "rgba(255,255,255,0.1)";
        roundRect(g, x - 85, 210, 170, 56, 14); g.fill();
        g.fillStyle = i < step ? "#0f2a1a" : UI.ink; g.font = font(22, 700);
        g.fillText(`${i + 1}. ${ing}`, x, 246);
      });
      // The shelf of ingredients
      const sx = Math.sin(shake * 60) * shake * 30;
      job.ingredients.forEach((ing, i) => {
        const x = 200 + i * 220 + sx, y = 380;
        g.fillStyle = i === sel ? life.world.accent : "rgba(255,255,255,0.12)";
        roundRect(g, x - 90, y, 180, 90, 18); g.fill();
        g.fillStyle = i === sel ? "#151515" : UI.ink; g.font = font(24, 700);
        g.fillText(ing, x, y + 54);
      });
      if (shake > 0) { g.fillStyle = UI.bad; g.font = font(30, 800, true); g.fillText("Wrong ingredient", W / 2, 520); }
      drawCreature(g, W / 2, 610, 1.1, life.creature.body, t2);
    },
    summary: () => `You finished ${done} of ${ORDERS} orders with ${mistakes} mistake${mistakes === 1 ? "" : "s"}.`
  };
}
