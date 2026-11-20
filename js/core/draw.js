// 2D overlay drawing: text, dialogue boxes, choices, prompts. The overlay is 1280x720 and sits on top of the 3D view.

import { UI, FONT } from "./palette.js";

export const W = 1280, H = 720;

export function font(size, weight = 500, family = FONT.ui) { return `${weight} ${size}px ${family}`; }

/** Draw wrapped text. Returns the y after the last line. */
export function wrapText(g, text, x, y, maxW, lineH, align = "left") {
  g.textAlign = align;
  const words = String(text || "").split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lineH; }
    else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lineH; }
  return y;
}

export function countLines(g, text, maxW) {
  const words = String(text || "").split(/\s+/);
  let line = "", n = 0;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) { n++; line = w; } else line = test;
  }
  return n + (line ? 1 : 0);
}

export function rect(g, x, y, w, h, r = 0) {
  g.beginPath();
  if (!r) { g.rect(x, y, w, h); return; }
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** A felt/cardboard panel with a stitched edge (LittleBigPlanet craft style). */
export function box(g, x, y, w, h, fill = UI.paper) {
  g.fillStyle = UI.shadow; rect(g, x + 5, y + 7, w, h, 22); g.fill();
  g.fillStyle = fill; rect(g, x, y, w, h, 22); g.fill();
  g.save(); g.setLineDash([9, 7]); g.strokeStyle = "rgba(43,35,64,0.35)"; g.lineWidth = 2.5;
  rect(g, x + 9, y + 9, w - 18, h - 18, 15); g.stroke(); g.restore();
}

/** A sticker: white die-cut border, slight tilt, drop shadow. Draws an emoji or short text. */
export function sticker(g, x, y, size, glyph, { tilt = 0, bg = "#ffffff", ring = null } = {}) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.fillStyle = UI.shadow; g.beginPath(); g.arc(3, 5, size * 0.56, 0, Math.PI * 2); g.fill();
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, size * 0.56, 0, Math.PI * 2); g.fill();
  if (ring) { g.strokeStyle = ring; g.lineWidth = 5; g.stroke(); }
  const count = Math.max(1, [...glyph].filter(c => c.codePointAt(0) > 0x2100 && c !== "\uFE0F" && c !== "\u200D").length);
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${Math.round(size * 0.62 / Math.max(1, count * 0.62))}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  g.fillStyle = UI.ink; g.fillText(glyph, 0, size * 0.04);
  g.restore(); g.textBaseline = "alphabetic";
}

/** Dialogue box along the bottom with a red name tag. */
export function dialogue(g, name, text, opts = {}) {
  const x = 120, w = W - 240, y = opts.y || 470, h = opts.h || 200;
  box(g, x, y, w, h);
  if (name) {
    g.font = font(22, 900);
    const nw = g.measureText(name).width + 36;
    g.fillStyle = opts.tagColor || UI.red; rect(g, x + 24, y - 20, nw, 40, 20); g.fill();
    g.fillStyle = UI.white; g.textAlign = "left"; g.fillText(name, x + 42, y + 8);
  }
  g.fillStyle = UI.ink; g.font = font(opts.size || 27, 500);
  return wrapText(g, text, x + 40, y + 62, w - 80, 38);
}

/** A row of choices; the selected one is filled red. */
export function choices(g, options, selected, x, y, w, h = 58, gap = 16) {
  const bw = (w - gap * (options.length - 1)) / options.length;
  options.forEach((opt, i) => {
    const bx = x + i * (bw + gap), on = i === selected;
    g.fillStyle = on ? UI.red : UI.white;
    g.fillRect(bx, y, bw, h);
    g.strokeStyle = on ? UI.red : UI.ink; g.lineWidth = 2; g.strokeRect(bx, y, bw, h);
    g.fillStyle = on ? UI.white : UI.ink;
    g.font = font(opts(opt, bw, g), 700);
    const lines = countLines(g, opt, bw - 28);
    wrapText(g, opt, bx + bw / 2, y + h / 2 + 8 - (lines - 1) * 12, bw - 28, 24, "center");
  });
}
function opts(text, bw, g) { return text.length > 34 && bw < 400 ? 18 : 20; }

/** Small prompt chip, bottom right. */
export function hint(g, text) {
  g.font = font(18, 700);
  const w = g.measureText(text).width + 36;
  g.fillStyle = "rgba(27,27,29,0.78)"; g.fillRect(W - w - 24, H - 58, w, 36);
  g.fillStyle = UI.white; g.textAlign = "left"; g.fillText(text, W - w - 6, H - 34);
}

/** A floating label above something in the 3D world (screen position from the stage). */
export function tag(g, x, y, text, red = false) {
  g.font = font(18, 900);
  const w = g.measureText(text).width + 26;
  g.fillStyle = red ? UI.red : UI.ink; g.fillRect(x - w / 2, y - 34, w, 32);
  g.beginPath(); g.moveTo(x - 7, y - 2); g.lineTo(x + 7, y - 2); g.lineTo(x, y + 7); g.fill();
  g.fillStyle = UI.white; g.textAlign = "center"; g.fillText(text, x, y - 12);
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
