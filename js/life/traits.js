// Pond numbers -> plain sentences (what the AI and the player see) and starting personality scores.

export function describeTraits(tr) {
  const out = [];
  const diet = [];
  if (tr.plants) diet.push(`${tr.plants} bite${tr.plants > 1 ? "s" : ""} of pondweed`);
  if (tr.bugs) diet.push(`${tr.bugs} water bug${tr.bugs > 1 ? "s" : ""}`);
  if (tr.minnows) diet.push(`${tr.minnows} minnow${tr.minnows > 1 ? "s" : ""}`);
  if (tr.crayfish) diet.push(`${tr.crayfish} crayfish`);
  if (tr.eggsEaten) diet.push(`${tr.eggsEaten} fish egg${tr.eggsEaten > 1 ? "s" : ""}`);
  out.push(diet.length ? `Ate ${diet.join(", ")}` : "Never ate anything");
  if (tr.tailLost) out.push("Lost its tail to a heron and swam slowly after that");
  if (tr.pikeBitten) out.push(`Bit the pike ${tr.pikeBitten} time${tr.pikeBitten > 1 ? "s" : ""} and made it flee`);
  if (tr.scars) out.push(`Got hurt ${tr.scars} time${tr.scars > 1 ? "s" : ""}`);
  if (tr.pikeEscapes) out.push(`Escaped the pike ${tr.pikeEscapes} time${tr.pikeEscapes > 1 ? "s" : ""}`);
  if (tr.items.length) out.push(`Picked up ${tr.items.map(i => "a " + i).join(", ")}`);
  if (tr.freedFish) out.push("Freed a fish tangled in fishing line, and it followed you after");
  if (tr.ignoredTrapped) out.push("Swam past a fish tangled in fishing line without helping");
  if (tr.eggsGuarded) out.push("Stayed by a clutch of fish eggs and kept them safe");
  if (tr.frogBitten) out.push("Bit a frog");
  if (tr.turtleTime > 5) out.push(`Hid under a turtle for ${tr.turtleTime} seconds`);
  if (tr.turtleBitten) out.push("Bit the turtle");
  if (tr.netCaught) out.push("Got scooped up by a kid's net and let go");
  if (tr.hooked) out.push(tr.escapedHook ? "Bit a baited hook and tore free" : "Bit a baited hook and got pulled out of the water, then thrown back");
  if (tr.rainBugs) out.push(`Feasted on ${tr.rainBugs} bugs during the rain`);
  out.push(`Explored ${Math.round(tr.explored * 100)}% of the pond`);
  if (tr.hideTime > 12) out.push(`Hid for ${tr.hideTime} seconds`);
  if (tr.stillTime > 20) out.push(`Stayed perfectly still for ${tr.stillTime} seconds while time stopped`);
  if (tr.dangerTime > 12) out.push(`Spent ${tr.dangerTime} seconds near the pike`);
  if (tr.schoolTime > 10) out.push(`Swam with the minnows for ${tr.schoolTime} seconds`);
  if (tr.deepTime > tr.shallowTime * 1.5) out.push("Preferred the deep middle of the pond");
  else if (tr.shallowTime > tr.deepTime * 2) out.push("Stayed in the bright shallows");
  return out.slice(0, 15);
}

/** Starting personality scores from the pond. */
export function pondAxes(tr) {
  const a = { curious: 0, kind: 0, bold: 0, calm: 0, social: 0, playful: 0, driven: 0 };
  a.curious += Math.round(tr.explored * 4) + tr.items.length;
  a.kind += (tr.freedFish ? 3 : 0) + (tr.eggsGuarded ? 2 : 0) - (tr.ignoredTrapped ? 2 : 0) - Math.min(2, tr.eggsEaten);
  a.bold += tr.pikeBitten * 2 + (tr.dangerTime > 12 ? 2 : 0) + tr.frogBitten + tr.turtleBitten - (tr.hideTime > 20 ? 2 : 0);
  a.calm += Math.round(tr.stillTime / 12) + (tr.hideTime > 15 ? 1 : 0);
  a.social += Math.round(tr.schoolTime / 10) + (tr.freedFish ? 1 : 0);
  a.playful += tr.hooked + tr.netCaught + (tr.items.includes("bottle cap") ? 1 : 0) + (tr.bites > 40 ? 2 : 0);
  a.driven += Math.round((tr.plants + tr.bugs + tr.minnows + tr.crayfish) / 4) + tr.escapedHook;
  return a;
}

export function traitTags(tr) {
  const tags = new Set();
  const diet = [["plants", tr.plants], ["bugs", tr.bugs], ["meat", tr.minnows + tr.crayfish + tr.eggsEaten]].sort((a, b) => b[1] - a[1]);
  tags.add(diet[0][1] === 0 ? "fasting" : diet[0][0] === "plants" ? "grazer" : diet[0][0] === "bugs" ? "hunter" : "predator");
  if (tr.tailLost) tags.add("tailless");
  if (tr.pikeBitten) tags.add("fighter");
  if (tr.items.includes("stick") || tr.items.includes("bottle cap")) tags.add("toolmaker");
  if (tr.items.includes("glowing stone")) tags.add("mystic");
  if (tr.freedFish || tr.eggsGuarded) tags.add("guardian");
  if (tr.explored > 0.5) tags.add("explorer");
  if (tr.hideTime > 15 || tr.turtleTime > 5) tags.add("cautious");
  if (tr.stillTime > 20) tags.add("patient");
  if (tr.schoolTime > 10) tags.add("social");
  return [...tags];
}
