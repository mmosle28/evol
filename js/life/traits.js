// Turn the raw pond numbers into plain sentences. The AI reads these, the evolving screen shows them,
// and the Oracle uses them, so the player can see why they became what they became.

export function describeTraits(tr) {
  const out = [];
  const diet = [];
  if (tr.plants) diet.push(`${tr.plants} bite${tr.plants > 1 ? "s" : ""} of pondweed`);
  if (tr.bugs) diet.push(`${tr.bugs} water bug${tr.bugs > 1 ? "s" : ""}`);
  if (tr.minnows) diet.push(`${tr.minnows} minnow${tr.minnows > 1 ? "s" : ""}`);
  out.push(diet.length ? `Ate ${diet.join(", ")}` : "Never ate anything");
  if (tr.tailLost) out.push("Lost its tail to a heron, so it swam slowly after that");
  if (tr.scars) out.push(`Was bitten by the pike ${tr.scars} time${tr.scars > 1 ? "s" : ""}`);
  if (tr.items.length) out.push(`Picked up ${tr.items.map(i => "a " + i).join(" and ")}`);
  out.push(`Explored ${Math.round(tr.explored * 100)}% of the pond`);
  if (tr.hideTime > 15) out.push(`Hid in the reeds for ${tr.hideTime} seconds`);
  if (tr.dangerTime > 12) out.push(`Spent ${tr.dangerTime} seconds close to the pike`);
  if (tr.escapes) out.push(`Escaped the pike ${tr.escapes} time${tr.escapes > 1 ? "s" : ""}`);
  if (tr.schoolTime > 15) out.push(`Swam with the minnow school for ${tr.schoolTime} seconds`);
  if (tr.surfaceTime > 25) out.push("Stayed near the surface");
  if (tr.bottomTime > 25) out.push("Stayed near the bottom");
  if (tr.idleTime > 25) out.push(`Stayed still for ${tr.idleTime} seconds`);
  return out;
}

/** Short tags the offline generator uses to pick parts. */
export function traitTags(tr) {
  const tags = new Set();
  const diet = [["plants", tr.plants], ["bugs", tr.bugs], ["minnows", tr.minnows]].sort((a, b) => b[1] - a[1]);
  tags.add(diet[0][1] === 0 ? "fasting" : diet[0][0] === "plants" ? "grazer" : diet[0][0] === "bugs" ? "hunter" : "predator");
  if (tr.tailLost) tags.add("tailless");
  if (tr.scars) tags.add("scarred");
  if (tr.items.includes("stick")) tags.add("toolmaker");
  if (tr.items.includes("glowing stone")) tags.add("mystic");
  if (tr.items.includes("shell")) tags.add("collector");
  if (tr.explored > 0.5) tags.add("explorer");
  if (tr.explored < 0.2) tags.add("homebody");
  if (tr.hideTime > 15) tags.add("cautious");
  if (tr.dangerTime > 12) tags.add("daring");
  if (tr.schoolTime > 15) tags.add("social");
  if (tr.surfaceTime > 25) tags.add("skyward");
  if (tr.bottomTime > 25) tags.add("deep");
  return [...tags];
}
