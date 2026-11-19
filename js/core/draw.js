// Drawing helpers shared by every scene: fonts, text wrapping, panels, easing.

export const W = 1280, H = 720;
export const FONT_DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';
export const FONT_BODY = '"Figtree", system-ui, sans-serif';

export const UI = {
  ink: "#eef2ee",
  muted: "#9fb1ab",
  accent: "#f2b91c",
  panel: "rgba(10, 16, 18, 0.86)",
  panelLine: "rgba(255, 255, 255, 0.12)",
  good: "#6fd39b",
  bad: "#f08a80"
};

export function font(size, weight = 600, display = false) {
  return `${weight} ${size}px ${display ? FONT_DISPLAY : FONT_BODY}`;
}

/** Draw text wrapped to a width. Returns the y after the last line. */
export function wrapText(g, text, x, y, maxW, lineH, align = "left") {
  g.textAlign = align;
  const words = String(text || "").split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = w; y += lineH;
    } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lineH; }
  return y;
}

/** Count the lines wrapText would use (for sizing panels). */
export function countLines(g, text, maxW) {
  const words = String(text || "").split(/\s+/);
  let line = "", n = 0;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) { n++; line = w; } else line = test;
  }
  return n + (line ? 1 : 0);
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function panel(g, x, y, w, h, r = 18) {
  g.fillStyle = UI.panel;
  roundRect(g, x, y, w, h, r);
  g.fill();
  g.strokeStyle = UI.panelLine;
  g.lineWidth = 2;
  g.stroke();
}

/** A row of choice buttons; the selected one is highlighted. */
export function choiceButtons(g, options, selected, x, y, w, h = 64, gap = 18) {
  const bw = (w - gap * (options.length - 1)) / options.length;
  options.forEach((opt, i) => {
    const bx = x + i * (bw + gap);
    g.fillStyle = i === selected ? UI.accent : "rgba(255,255,255,0.08)";
    roundRect(g, bx, y, bw, h, 14);
    g.fill();
    g.fillStyle = i === selected ? "#1b1606" : UI.ink;
    g.font = font(22, 700);
    const lines = countLines(g, opt, bw - 32);
    wrapText(g, opt, bx + bw / 2, y + h / 2 - (lines - 1) * 13 + 8, bw - 32, 26, "center");
  });
}

/** Little prompt in the corner telling the player which control to use. */
export function hint(g, text) {
  g.font = font(20, 600);
  const w = g.measureText(text).width + 40;
  g.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(g, W - w - 24, H - 60, w, 40, 20);
  g.fill();
  g.fillStyle = UI.ink;
  g.textAlign = "left";
  g.fillText(text, W - w - 4, H - 33);
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
