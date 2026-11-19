// The game's link to Claude. On claude.ai the page can ask Claude directly (the "sample" capability),
// so there are no API keys. If AI is unavailable (offline, or permission declined), every caller
// passes a fallback, so the game never gets stuck.

let samplePromise = null;
export const aiState = { status: "unknown" }; // "on" | "off" | "unknown"

function getSample() {
  if (!samplePromise) {
    samplePromise = (async () => {
      const c = window.claude;
      if (!c || !c.use) return null;
      try { return await c.use("sample"); } catch (e) { return null; }
    })().then(s => { aiState.status = s ? "on" : "off"; return s; });
  }
  return samplePromise;
}

/**
 * Ask Claude for JSON. `fallback()` builds an answer locally if AI fails or takes too long.
 * `validate(obj)` should return a cleaned object or throw if the answer is unusable.
 */
export async function askJSON(prompt, { fallback, validate = x => x, timeoutMs = 30000, tier = "default" } = {}) {
  const sample = await getSample();
  if (!sample) return { value: fallback(), fromAI: false };
  try {
    const value = await Promise.race([
      sample.json(prompt, { modelTier: tier }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs))
    ]);
    return { value: validate(value), fromAI: true };
  } catch (e) {
    if (e && e.code === "not_granted") aiState.status = "off";
    return { value: fallback(), fromAI: false };
  }
}

/** Start the AI connection early (call from a button press so the permission prompt feels natural). */
export function warmUp() { getSample(); }
