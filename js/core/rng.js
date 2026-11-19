// Seeded random numbers, so the same seed always builds the same pond (like a Minecraft seed).

/** Mulberry32: tiny, fast, good enough for games. Returns a function giving floats in [0, 1). */
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(next.range(lo, hi + 1));
  next.pick = arr => arr[Math.floor(next() * arr.length)];
  next.chance = p => next() < p;
  return next;
}

/** A fresh random seed for a new run. */
export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Turn any text into a number seed (used to derive stable sub-seeds). */
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
