// Saves that survive between play sessions (in this browser). Every save is wrapped in try/catch
// because some browsers block storage; the game still works without it.

const KEY = "evol-history-v2";

/** Past runs: [{ creatureName, worldName, insights: [{title, text}], choices: [...] , at }] */
export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
}

export function saveRun(run) {
  try {
    const all = loadHistory().filter(r => r.id !== run.id);
    all.push(run);
    localStorage.setItem(KEY, JSON.stringify(all.slice(-12)));
  } catch (e) { /* storage unavailable: keep playing */ }
}
