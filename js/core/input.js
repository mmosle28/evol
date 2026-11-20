// One input layer for every controller: keyboard, gamepad, and the Arduino joystick over USB (Web Serial).
// Scenes only read `Input.x`, `Input.y` (-1..1) and `Input.pressed()` (button went down this frame).

const DEADZONE = 0.25;
const keys = new Set();
let tapLatch = false; // a key press so quick it went up before the next frame still counts
let serialAxes = { x: 0, y: 0, btn: false, live: false };
let serialPort = null, serialWriter = null;
let prevBtn = false, btnNow = false;
let prevDir = { x: 0, y: 0 };
let dirLatch = null, dirLatchSeen = false; // quick arrow taps between frames still count

export const Input = {
  x: 0, y: 0,
  /** Button is held down right now. */
  held() { return btnNow; },
  /** Button went from up to down this frame. */
  pressed() { return btnNow && !prevBtn; },
  /** Joystick was just pushed in a direction this frame (for menus). Returns -1, 0 or 1 per axis. */
  tapped() {
    if (dirLatch) return dirLatch;
    const tx = Input.x > 0.6 ? 1 : Input.x < -0.6 ? -1 : 0;
    const ty = Input.y > 0.6 ? 1 : Input.y < -0.6 ? -1 : 0;
    return { x: tx !== prevDir.x ? tx : 0, y: ty !== prevDir.y ? ty : 0 };
  },
  /** Call once per frame, before scenes update. */
  update() {
    if (dirLatchSeen) { dirLatch = null; dirLatchSeen = false; } else if (dirLatch) dirLatchSeen = true;
    prevBtn = btnNow;
    prevDir = {
      x: this.x > 0.6 ? 1 : this.x < -0.6 ? -1 : 0,
      y: this.y > 0.6 ? 1 : this.y < -0.6 ? -1 : 0
    };
    let x = 0, y = 0, b = false;
    // Keyboard
    if (keys.has("ArrowLeft") || keys.has("a")) x -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) x += 1;
    if (keys.has("ArrowUp") || keys.has("w")) y -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) y += 1;
    if (keys.has(" ") || keys.has("enter") || keys.has("Enter") || tapLatch) b = true;
    tapLatch = false;
    // Gamepad (free bonus: any USB or Bluetooth controller works too)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      if (Math.abs(p.axes[0]) > DEADZONE) x = p.axes[0];
      if (Math.abs(p.axes[1]) > DEADZONE) y = p.axes[1];
      if (p.buttons[0] && p.buttons[0].pressed) b = true;
    }
    // Arduino joystick
    if (serialAxes.live) {
      if (serialAxes.x || serialAxes.y) { x = serialAxes.x; y = serialAxes.y; }
      if (serialAxes.btn) b = true;
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.x = x; this.y = y; btnNow = b;
  },
  /** Send a one-letter event to the Arduino (it buzzes or lights an LED). Safe to call when not connected. */
  async signal(letter) {
    if (!serialWriter) return;
    try { await serialWriter.write(new TextEncoder().encode(letter)); } catch (e) { /* controller unplugged */ }
  },
  isSerialConnected() { return serialAxes.live; }
};

window.addEventListener("keydown", e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.add(k);
  if ((e.key === " " || e.key === "Enter") && !e.repeat) tapLatch = true;
  const dx = { ArrowLeft: -1, a: -1, ArrowRight: 1, d: 1 }[k] || 0, dy = { ArrowUp: -1, w: -1, ArrowDown: 1, s: 1 }[k] || 0;
  if ((dx || dy) && !e.repeat) { dirLatch = { x: dx, y: dy }; dirLatchSeen = false; }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
window.addEventListener("blur", () => keys.clear());

/**
 * Connect to the Arduino over Web Serial. The sketch sends lines like "512,498,1\n":
 * joystick X (0-1023), joystick Y (0-1023), button (1 = pressed).
 */
export async function connectSerial(onStatus) {
  if (!("serial" in navigator)) {
    onStatus("This browser can't open USB serial here. Run bridge/serial_to_keys.py instead (see README).");
    return false;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });
    serialWriter = serialPort.writable.getWriter();
    serialAxes.live = true;
    onStatus("Joystick connected");
    readLoop(onStatus);
    return true;
  } catch (e) {
    onStatus(e && e.name === "SecurityError"
      ? "USB access is blocked on this page. Run bridge/serial_to_keys.py instead (see README)."
      : "No joystick connected. Plug in the Arduino and try again.");
    return false;
  }
}

const RADIAL_DZ = 0.12;
const cal = { x: 0, y: 0, n: 0, cx: 512, cy: 512 };
// Map a raw 0-1023 reading to -1..1, using each side's own span from the resting point
function norm(v, c) { return v >= c ? Math.min(1, (v - c) / Math.max(60, 1023 - c)) : Math.max(-1, (v - c) / Math.max(60, c)); }

async function readLoop(onStatus) {
  cal.x = 0; cal.y = 0; cal.n = 0;
  const decoder = new TextDecoderStream();
  serialPort.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        const [rx, ry, rb] = line.split(",").map(Number);
        if (Number.isFinite(rx) && Number.isFinite(ry)) {
          // Learn the stick's real resting point from the first readings (cheap modules rest far from 512)
          if (cal.n < 15) { cal.x += rx; cal.y += ry; cal.n++; if (cal.n === 15) { cal.cx = cal.x / 15; cal.cy = cal.y / 15; } continue; }
          let ax = norm(rx, cal.cx), ay = norm(ry, cal.cy);
          // Round dead zone, then rescale so small pushes still move smoothly at any angle
          const m = Math.hypot(ax, ay);
          if (m < RADIAL_DZ) { ax = 0; ay = 0; }
          else { const k = Math.min(1, (m - RADIAL_DZ) / (1 - RADIAL_DZ)) / m; ax *= k; ay *= k; }
          serialAxes.x += (ax - serialAxes.x) * 0.5; serialAxes.y += (ay - serialAxes.y) * 0.5;
          if (Math.abs(serialAxes.x) < 0.02) serialAxes.x = 0; if (Math.abs(serialAxes.y) < 0.02) serialAxes.y = 0;
          serialAxes.btn = rb === 1;
        }
      }
    }
  } catch (e) { /* unplugged */ }
  serialAxes.live = false;
  onStatus("Joystick disconnected. Keyboard still works.");
}
