// Tiny synthesized sound: water hum, blips and a music-box loop per planet. No audio files needed.
// Browsers only allow sound after the player presses something, so start() is called on the first press.

let ctx = null, master = null, cicadaGain = null, waterGain = null;

export function startAudio() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // Cicadas: high band-passed noise pulsing in slow waves
    const c = ctx.createBufferSource(); c.buffer = noise; c.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 5200; bp.Q.value = 6;
    const trem = ctx.createGain(); trem.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 38; const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG); lfoG.connect(trem.gain);
    cicadaGain = ctx.createGain(); cicadaGain.gain.value = 0;
    c.connect(bp); bp.connect(trem); trem.connect(cicadaGain); cicadaGain.connect(master);
    c.start(); lfo.start();

    // Water: low, soft rumble
    const w = ctx.createBufferSource(); w.buffer = noise; w.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
    waterGain = ctx.createGain(); waterGain.gain.value = 0;
    w.connect(lp); lp.connect(waterGain); waterGain.connect(master);
    w.start();
  } catch (e) { ctx = null; }
}

/** Fade ambience: "pond", "summer" or "quiet". `strength` 0..1 (cicadas fade out at dusk). */
export function ambience(kind, strength = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  cicadaGain.gain.setTargetAtTime(kind === "summer" ? 0.05 * strength : 0, t, 0.8);
  waterGain.gain.setTargetAtTime(kind === "pond" ? 0.18 : 0, t, 0.8);
}

/** Short tones: "bite", "get", "hurt", "talk", "page". */
export function blip(kind) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  const spec = { bite: [520, 260, 0.08, "square"], get: [660, 990, 0.14, "triangle"], hurt: [180, 90, 0.25, "sawtooth"], talk: [440, 470, 0.05, "sine"], page: [300, 420, 0.2, "sine"], pop: [300, 900, 0.09, "triangle"], yay: [523, 1046, 0.3, "triangle"], yuck: [220, 110, 0.35, "square"], whoosh: [900, 200, 0.4, "sine"], heart: [784, 1175, 0.18, "sine"] }[kind] || [440, 440, 0.1, "sine"];
  o.type = spec[3]; o.frequency.setValueAtTime(spec[0], t); o.frequency.exponentialRampToValueAtTime(spec[1], t + spec[2]);
  g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + spec[2] + 0.05);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + spec[2] + 0.06);
}

// A tiny music-box loop for planets. Each biome passes its own scale so worlds sound different.
let musicTimer = null;
export function music(notes) {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!notes || !ctx) return;
  let i = 0;
  musicTimer = setInterval(() => {
    if (!ctx) return;
    const t = ctx.currentTime, f = notes[i++ % notes.length];
    if (!f) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.045, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 1);
  }, 330);
}
