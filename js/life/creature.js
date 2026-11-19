// Draws any creature from its body description, so the AI (or the fallback) can invent
// creatures without anyone drawing art: shape + limbs + eyes + features, all procedural.

export function drawCreature(g, x, y, s, body, t = 0, facing = 1) {
  const bob = Math.sin(t * 3) * 3;
  g.save();
  g.translate(x, y + bob);
  g.scale(s * facing, s);
  const f = new Set(body.features);
  const rx = body.shape === "long" ? 40 : body.shape === "tall" ? 22 : 30;
  const ry = body.shape === "long" ? 20 : body.shape === "tall" ? 34 : 26;

  if (f.has("glow")) { g.shadowColor = body.accent; g.shadowBlur = 30; }

  // Limbs behind the body
  drawLimbs(g, body, rx, ry, t);

  // Stump where a tail used to be (lost to the heron)
  if (f.has("stumpTail")) { g.fillStyle = shade(body.color, -30); roundBlob(g, -rx - 6, 2, 10, 8); g.fill(); }

  // Body
  g.fillStyle = body.color;
  if (body.shape === "blob") {
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2, r = 1 + Math.sin(a * 3 + t * 2) * 0.08;
      g.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r);
    }
    g.fill();
  } else {
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill();
  }
  g.shadowBlur = 0;
  if (body.shape === "spiky" || f.has("spikes")) {
    g.fillStyle = body.accent;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + 0.35 + i * 0.42;
      const bx = Math.cos(a) * rx * 0.95, by = Math.sin(a) * ry * 0.95;
      g.beginPath(); g.moveTo(bx - 5, by); g.lineTo(bx + Math.cos(a) * 14, by + Math.sin(a) * 14); g.lineTo(bx + 5, by); g.fill();
    }
  }
  // Belly
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.beginPath(); g.ellipse(0, ry * 0.35, rx * 0.6, ry * 0.4, 0, 0, Math.PI * 2); g.fill();

  // Features
  if (f.has("shell")) { g.fillStyle = body.accent; g.beginPath(); g.ellipse(-rx * 0.15, -ry * 0.55, rx * 0.75, ry * 0.55, 0, Math.PI, 0); g.fill(); g.strokeStyle = shade(body.accent, -40); g.lineWidth = 2; g.stroke(); }
  if (f.has("armor")) { g.strokeStyle = shade(body.color, -45); g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * rx * 0.4, -ry * 0.1, ry * 0.7, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } }
  if (f.has("gears")) { drawGear(g, -rx * 0.35, ry * 0.05, 10, t, body.accent); drawGear(g, rx * 0.05, ry * 0.3, 7, -t * 1.4, shade(body.accent, -25)); }
  if (f.has("frills")) { g.fillStyle = body.accent; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-rx * 0.2 + i * 6, -ry - 4, 5, 10, -0.3 + i * 0.2, 0, Math.PI * 2); g.fill(); } }
  if (f.has("horns")) { g.fillStyle = "#efe6d2"; [[rx * 0.35, -ry * 0.8], [rx * 0.65, -ry * 0.6]].forEach(([hx, hy]) => { g.beginPath(); g.moveTo(hx - 5, hy + 4); g.lineTo(hx + 6, hy - 16); g.lineTo(hx + 6, hy + 4); g.fill(); }); }
  if (f.has("antennae")) { g.strokeStyle = shade(body.color, -40); g.lineWidth = 2; g.fillStyle = body.accent; [[rx * 0.3, 1], [rx * 0.55, 0.6]].forEach(([ax, k]) => { g.beginPath(); g.moveTo(ax, -ry * 0.8); g.quadraticCurveTo(ax + 10, -ry - 20 * k, ax + 18, -ry - 26 * k + Math.sin(t * 4) * 3); g.stroke(); g.beginPath(); g.arc(ax + 18, -ry - 26 * k + Math.sin(t * 4) * 3, 4, 0, Math.PI * 2); g.fill(); }); }

  // Eyes on the front of the face
  const eyes = body.eyes;
  for (let i = 0; i < eyes; i++) {
    const ex = rx * 0.45 + (i % 2) * 9 - (eyes > 2 ? 4 : 0), ey = -ry * 0.25 - Math.floor(i / 2) * 11 + (i % 2) * 3;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#151515"; g.beginPath(); g.arc(ex + 2, ey, 3, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function drawLimbs(g, body, rx, ry, t) {
  const n = body.limbs;
  if (!n || body.limbType === "none") return;
  g.strokeStyle = shade(body.color, -35);
  g.fillStyle = shade(body.color, -20);
  g.lineWidth = 5; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1) - 0.5;
    const lx = k * rx * 1.4;
    const swing = Math.sin(t * 6 + i) * 5;
    if (body.limbType === "legs") { g.beginPath(); g.moveTo(lx, ry * 0.7); g.lineTo(lx + swing, ry + 16); g.stroke(); g.beginPath(); g.ellipse(lx + swing + 3, ry + 17, 6, 3, 0, 0, Math.PI * 2); g.fill(); }
    else if (body.limbType === "fins") { g.beginPath(); g.moveTo(lx, ry * 0.5); g.lineTo(lx - 14, ry + 10 + swing * 0.5); g.lineTo(lx + 6, ry * 0.8); g.fill(); }
    else if (body.limbType === "tentacles") { g.beginPath(); g.moveTo(lx, ry * 0.6); g.bezierCurveTo(lx + swing, ry + 10, lx - swing, ry + 20, lx + swing, ry + 30); g.stroke(); }
    else if (body.limbType === "wings") { g.save(); g.globalAlpha = 0.8; g.beginPath(); g.ellipse(lx * 0.6, -ry * 0.7, 10, 24, -0.5 + Math.sin(t * 10 + i) * 0.3, 0, Math.PI * 2); g.fill(); g.restore(); }
  }
}

function drawGear(g, x, y, r, a, color) {
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = color;
  for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillRect(-2, -r - 4, 4, 6); }
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(0, 0, r * 0.35, 0, Math.PI * 2); g.fill();
  g.restore();
}

function roundBlob(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }

/** Lighten (+) or darken (-) a #rrggbb color. */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  const r = c(n >> 16), gg = c((n >> 8) & 255), b = c(n & 255);
  return "#" + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
