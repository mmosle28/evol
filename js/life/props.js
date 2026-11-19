// Scenery for each kind of world. The AI picks the prop type; these functions draw it.

import { shade } from "./creature.js";

export function drawProp(g, type, x, y, s, accent, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  switch (type) {
    case "gears":
      g.fillStyle = shade(accent, -60);
      g.rotate(t * 0.4);
      for (let i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.fillRect(-4, -30, 8, 10); }
      g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
      break;
    case "pipes":
      g.strokeStyle = shade(accent, -50); g.lineWidth = 10; g.lineCap = "round";
      g.beginPath(); g.moveTo(-30, 20); g.lineTo(-30, -10); g.lineTo(20, -10); g.lineTo(20, -30); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.arc(20, -40 - (t * 20 % 20), 4, 0, Math.PI * 2); g.fill();
      break;
    case "mushrooms":
      g.fillStyle = "#e9e1cf"; g.fillRect(-5, -10, 10, 26);
      g.fillStyle = accent; g.beginPath(); g.ellipse(0, -12, 24, 14, 0, Math.PI, 0); g.fill();
      g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(-8, -18, 3, 0, Math.PI * 2); g.arc(6, -20, 2.5, 0, Math.PI * 2); g.fill();
      break;
    case "crystals":
      g.fillStyle = accent; g.globalAlpha = 0.85; g.shadowColor = accent; g.shadowBlur = 14 + Math.sin(t * 2) * 6;
      [[-12, 0, 28], [6, 4, 40], [18, 6, 22]].forEach(([cx, cy, h]) => { g.beginPath(); g.moveTo(cx - 7, cy + 10); g.lineTo(cx, cy - h); g.lineTo(cx + 7, cy + 10); g.fill(); });
      break;
    case "coral":
      g.strokeStyle = accent; g.lineWidth = 6; g.lineCap = "round";
      [[0, -40], [-18, -26], [16, -30]].forEach(([dx, dy], i) => { g.beginPath(); g.moveTo(0, 14); g.quadraticCurveTo(dx * 0.4 + Math.sin(t + i) * 3, dy * 0.5, dx, dy); g.stroke(); });
      break;
    case "bones":
      g.strokeStyle = "#e8e0cc"; g.lineWidth = 7; g.lineCap = "round";
      g.beginPath(); g.moveTo(-22, 6); g.lineTo(22, -6); g.stroke();
      g.fillStyle = "#e8e0cc"; [[-24, 2], [-20, 10], [24, -10], [20, -2]].forEach(([bx, by]) => { g.beginPath(); g.arc(bx, by, 6, 0, Math.PI * 2); g.fill(); });
      break;
    case "lanterns":
      g.strokeStyle = "#2a2a2a"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 20); g.lineTo(0, -30); g.stroke();
      g.fillStyle = accent; g.shadowColor = accent; g.shadowBlur = 20 + Math.sin(t * 3) * 8; g.beginPath(); g.arc(0, -36, 10, 0, Math.PI * 2); g.fill();
      break;
    default: // trees
      g.fillStyle = "#5a4330"; g.fillRect(-5, -6, 10, 24);
      g.fillStyle = shade(accent, -70); g.beginPath(); g.arc(0, -22, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = shade(accent, -40); g.beginPath(); g.arc(-8, -28, 12, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
