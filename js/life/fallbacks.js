// Offline answers for the live AI moments (dilemmas, NPC chats, the Oracle), used only if the AI can't respond.

const DILEMMAS = [
  { prompt: "Your boss overpaid you by mistake. Nobody would ever notice.", a: "Give it back", b: "Keep it quietly" },
  { prompt: "A coworker wants to split your tips evenly, but you did most of the work today.", a: "Split it evenly", b: "Keep what you earned" },
  { prompt: "A stranger asks you to cover their shift tomorrow. It's your only day off.", a: "Cover for them", b: "Protect your day off" },
  { prompt: "You found a faster way to do the job, but it breaks a rule nobody checks.", a: "Use the shortcut", b: "Do it the long way" },
  { prompt: "A rival is about to make a mistake you could warn them about.", a: "Warn them", b: "Let it happen" }
];

export function fallbackDilemma(i) { return DILEMMAS[i % DILEMMAS.length]; }

export function fallbackTalk(npc) {
  return {
    line: `I'm ${npc.name}. People here say you're new. What brought you to this side of the world?`,
    a: "I'm looking for a fresh start",
    b: "I just go where life takes me",
    replyA: "Fresh starts are rare. Don't waste yours.",
    replyB: "Drifting works, until you want to land somewhere."
  };
}

export function fallbackInsight(traits, choices) {
  const kind = choices.filter(c => /give|help|warn|cover|split/i.test(c.picked)).length;
  const bold = traits.dangerTime > 12 || traits.escapes > 1;
  const curious = traits.items.length > 0 || traits.explored > 0.5;
  const title = bold ? "You move toward the storm" : curious ? "You collect the world" : "You build your own shelter";
  const insight = `${bold ? "As a fish you swam near the thing that could eat you." : curious ? "As a fish you went looking and picked things up." : "As a fish you stayed where it felt safe."} ${kind ? "Since then you've kept choosing other people, even when it cost you." : "Since then you've kept choosing yourself, and that kept you moving."} Both say something about what you think you owe the world.`;
  return { title, insight, question: "When did you last choose the harder option on purpose?" };
}
