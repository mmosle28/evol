// The planet: a tiny world you can walk all the way around in under a minute (Doki Doki Universe).
// Every resident has an identity card (likes, dislikes, favorite greeting, one request). You learn it by
// talking to them and to their neighbors (gossip), then you can greet them, slap a sticker on the moment
// (summon, LittleBigPlanet style), pick them up and throw them, or carry them to meet someone.
// Two quiz moths float nearby with odd picture questions. Everything you do quietly feeds the final reading.
//
// Modes (overlays inside this scene): walk, menu, greet, stickers, card, talk, carry, quiz, home.

import { Input } from "../core/input.js";
import { go, game, score, note } from "../core/game.js";
import { stage, makeCamera } from "../core/stage.js";
import { W, H, font, wrapText, hint, box, dialogue, sticker, clamp, rect } from "../core/draw.js";
import { UI, FONT, BODY_COLORS } from "../core/palette.js";
import { makeRng } from "../core/rng.js";
import { makePlanet, worldSky } from "../gfx/planet.js";
import { BIOMES, lookOf, STICKERS, STICKER_IDS, GREETINGS, GREETING_IDS, prop } from "../gfx/biomes.js";
import * as M from "../gfx/models.js";
import { blip, music, ambience } from "../core/audio.js";

const THREE = window.THREE;
const UP = new THREE.Vector3(0, 1, 0);
const QUICK = new URLSearchParams(location.search).has("quick");
const DAY_SECONDS = QUICK ? 90 : 300;
const R = 15, SPEED = 8, REACH = 5;

let view, planet, world, rng, player, npcs, moths, home, t, dayT, mode, sel, near, lines, quiz, carried, flights, pops, toast, lastWarn;

// ---------- Building ----------

/** Wrap a creature so it faces +z (models face +x). */
function wrapCreature(body, color, scale) {
  const outer = new THREE.Group(), inner = M.creature(body, { scale, color, accent: new THREE.Color(color).multiplyScalar(0.7).getHex() });
  inner.rotation.y = -Math.PI / 2; outer.add(inner); outer.userData.inner = inner;
  return outer;
}

function orient(obj, dir, heading, lift = 0, spin = 0) {
  obj.position.copy(dir).multiplyScalar(planet.heightAt(dir) + lift);
  obj.quaternion.setFromUnitVectors(UP, dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, heading));
  if (spin) obj.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), spin));
}

function build() {
  const scene = new THREE.Scene();
  rng = makeRng(game.seed ^ 0x9e3779b9);
  // Keep space around where you land and where residents stand
  const spawn = new THREE.Vector3(0, 1, 0);
  const spots = [spawn.clone()];
  const npcDirs = world.npcs.map((_, i) => { const a = i / world.npcs.length * Math.PI * 2 + 0.4; const d = new THREE.Vector3(Math.cos(a) * Math.sin(0.55 + i * 0.25), Math.cos(0.55 + i * 0.25), Math.sin(a) * Math.sin(0.55 + i * 0.25)).normalize(); spots.push(d); return d; });
  const mothDirs = [new THREE.Vector3(0.6, -0.2, 0.7).normalize(), new THREE.Vector3(-0.7, 0.1, -0.6).normalize()];
  const homeDir = new THREE.Vector3(0.18, 1, 0.12).normalize();
  spots.push(...mothDirs, homeDir);
  planet = makePlanet(world.biome, rng, { R, detail: 4, spots, propScale: 1.2, density: 1.3, look: world.look });
  scene.add(planet.group);
  worldSky(scene, world.biome, { look: world.look });

  // You
  player = { obj: wrapCreature(game.life.creature.body, BODY_COLORS[game.life.creature.color], 0.75), heading: 0, moving: false, bounce: 0, act: 0 };
  scene.add(player.obj);

  // Residents
  npcs = world.npcs.map((d, i) => {
    const obj = wrapCreature(d.body, BODY_COLORS[d.color], 0.68);
    planet.group.add(obj);
    return { d, i, obj, dir: npcDirs[i], heading: rng() * 6.28, hearts: 1, met: false, talks: 0, done: false, acted: false, cardRead: false,
      known: { likes: new Set(), dislikes: new Set(), greeting: false, request: false }, emote: null, state: "idle", wanderT: rng() * 3, flight: null };
  });
  // Quiz moths: tiny monks on floating rocks
  moths = world.quiz.map((q, i) => {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), M.mat(0xb0a0c8)); rock.scale.y = 0.6; g.add(rock);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 6), M.mat(0x8a5ad0)); body.position.y = 1.4; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), M.mat(0xfff1dc)); head.position.y = 2.3; g.add(head);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.8, 6), new THREE.MeshStandardMaterial({ color: 0xffd84a, side: THREE.DoubleSide, flatShading: true })); w.position.set(s * 0.7, 1.7, -0.2); w.rotation.y = s * 0.6; g.add(w); g.userData[s < 0 ? "wl" : "wr"] = w; }
    planet.group.add(g);
    return { q, i, obj: g, dir: mothDirs[i], done: false };
  });
  // Your little home (a tent in your color)
  home = { obj: prop("tent", rng), dir: homeDir };
  home.obj.scale.setScalar(1.3);
  home.obj.traverse(m => { if (m.isMesh) m.material = M.mat(BODY_COLORS[game.life.creature.color]); });
  planet.place(home.obj, homeDir, 0.5);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 3), M.mat(0xffffff)); flag.position.y = 2.3; flag.rotation.z = -Math.PI / 2; home.obj.add(flag);

  const camera = makeCamera(46);
  camera.position.set(0, R + 10, 21); camera.lookAt(0, R - 2.5, -3);
  view = { scene, camera };
}

// ---------- Helpers ----------

const localUp = () => UP.clone().applyQuaternion(planet.group.quaternion.clone().invert());
const worldPos = obj => obj.getWorldPosition(new THREE.Vector3());
const playerPos = () => player.obj.position.clone().add(new THREE.Vector3(0, 1, 0));
const headOf = (obj, h = 4.2) => obj.localToWorld(new THREE.Vector3(0, h, 0));
const sname = id => STICKERS[id][1];
const stats = () => game.stats;

function say(who, text, after) { lines = { who, list: Array.isArray(text) ? text : [text], i: 0, after }; mode = "talk"; blip("talk"); }
function emote(n, glyph, s = 2.2) { n.emote = { glyph, t: s }; }
function setToast(text) { toast = { text, t: 3.2 }; }

function heart(n, delta) {
  n.hearts = clamp(n.hearts + delta, 0, 5);
  if (delta > 0) blip("heart");
  pops.push({ obj: n.obj, glyph: delta > 0 ? "💖" : "💔", t: 0 });
}

function faceToward(n, targetLocal) {
  const qUp = new THREE.Quaternion().setFromUnitVectors(UP, n.dir);
  const b0 = new THREE.Vector3(0, 0, 1).applyQuaternion(qUp), b1 = new THREE.Vector3(1, 0, 0).applyQuaternion(qUp);
  const d = targetLocal.clone().sub(n.dir.clone().multiplyScalar(targetLocal.dot(n.dir)));
  if (d.lengthSq() > 1e-6) n.heading = Math.atan2(d.dot(b1), d.dot(b0));
}

function firstAct(n) {
  if (!n.acted) { n.acted = true; if (n.cardRead) stats().cardsBeforeActing++; }
}

/** One of the residents finishes their request: hearts, thanks, and a present (two new stickers). */
function complete(n, how) {
  if (n.done) return;
  n.done = true; stats().requestsDone++;
  heart(n, 2); emote(n, "🥳", 3); blip("yay");
  const fresh = STICKER_IDS.filter(s => !game.stickers.includes(s)).sort(() => rng() - 0.5).slice(0, 2);
  game.stickers.push(...fresh);
  note(`Made ${n.d.name}'s day (${how}) and got a present.`);
  score({ kind: 1, driven: 1 });
  say(n.d.name, [n.d.lines.thanks, fresh.length ? `🎁 Present! New stickers: ${fresh.map(s => STICKERS[s][0] + " " + sname(s)).join(", ")}` : "🎁 A present! It's... a rock. They seem proud of it."]);
}

function requestText(n) {
  const r = n.d.request;
  if (r.type === "sticker") return `Show them ${sname(r.target)} ${STICKERS[r.target][0]}`;
  if (r.type === "bring") return `Carry ${world.npcs[r.target].name} over to meet them`;
  if (r.type === "fly") return "Throw them into the sky";
  return `Greet them with a ${GREETINGS[r.target][1].toLowerCase()} ${GREETINGS[r.target][0]}`;
}

/** Gossip: a resident tells you something true about a neighbor (fills in that neighbor's card). */
function gossip(n) {
  const others = npcs.filter(o => o !== n);
  const options = [];
  for (const o of others) {
    for (const s of o.d.likes) if (!o.known.likes.has(s)) options.push([o, "likes", s]);
    for (const s of o.d.dislikes) if (!o.known.dislikes.has(s)) options.push([o, "dislikes", s]);
    if (!o.known.greeting) options.push([o, "greeting"]);
  }
  if (!options.length) return "I think you know everyone here better than I do now.";
  const [o, kind, s] = options[Math.floor(rng() * options.length)];
  stats().gossip++;
  if (kind === "likes") { o.known.likes.add(s); return `Psst. ${o.d.name} goes absolutely nuts for ${sname(s)}. You didn't hear it from me.`; }
  if (kind === "dislikes") { o.known.dislikes.add(s); return `Whatever you do, never show ${o.d.name} ${sname(s)}. Trust me on this one.`; }
  o.known.greeting = true; return `${o.d.name}? Only respects a good ${GREETINGS[o.d.greeting][1].toLowerCase()}. Weird, but true.`;
}

// ---------- Actions ----------

function doTalk(n) {
  n.talks++; stats().talks++;
  const L = n.d.lines;
  if (!n.met) {
    n.met = true; n.known.request = true;
    note(`Met ${n.d.name} the ${n.d.role}.`);
    say(n.d.name, [L.hello, n.done ? "Anyway, good to meet you!" : L.ask]);
    score({ social: 1 });
    return;
  }
  const extra = n.talks % 3 === 0 && !n.known.greeting ? (n.known.greeting = true, `Me? I'm a ${GREETINGS[n.d.greeting][1].toLowerCase()} kind of creature.`) : gossip(n);
  say(n.d.name, n.done ? [extra] : [extra, `Oh, and ${L.ask[0].toLowerCase() + L.ask.slice(1)}`]);
  score({ curious: 1 });
}

function doGreet(n, gid) {
  firstAct(n); player.act = 1;
  const right = gid === n.d.greeting;
  if (right) {
    n.known.greeting = true; stats().greetRight++; heart(n, 1); emote(n, "😊");
    note(`Greeted ${n.d.name} with a ${GREETINGS[gid][1].toLowerCase()}. They loved it.`);
    if (n.d.request.type === "greet" && !n.done) return complete(n, "a proper greeting");
    say(n.d.name, "Finally! Someone around here with manners.");
  } else {
    stats().greetWrong++; emote(n, "😕");
    note(`Tried a ${GREETINGS[gid][1].toLowerCase()} on ${n.d.name}. Awkward.`);
    say(n.d.name, rng.pick(["Uh... hi?", "Okay. That was a choice.", "We don't do that here.", "Was that... for me?"]));
  }
}

function doSticker(n, sid) {
  firstAct(n); player.act = 1;
  pops.push({ obj: n.obj, glyph: STICKERS[sid][0], t: 0, big: true });
  blip("pop");
  if (n.d.likes.includes(sid)) {
    n.known.likes.add(sid); stats().liked++; heart(n, 1); emote(n, "😍");
    note(`Showed ${n.d.name} ${sname(sid)}. Pure joy.`);
    if (n.d.request.type === "sticker" && n.d.request.target === sid && !n.done) return complete(n, `showed ${sname(sid)}`);
    say(n.d.name, n.d.lines.liked); score({ kind: 1 });
  } else if (n.d.dislikes.includes(sid)) {
    const onPurpose = n.known.dislikes.has(sid);
    n.known.dislikes.add(sid); heart(n, -1); emote(n, "🤢"); blip("yuck");
    if (onPurpose) { stats().pranks++; note(`Showed ${n.d.name} ${sname(sid)} on purpose, knowing they hate it.`); score({ playful: 2, kind: -1 }); }
    else { stats().oops++; note(`Showed ${n.d.name} ${sname(sid)}. They hate it. Oops.`); score({ bold: 1 }); }
    say(n.d.name, n.d.lines.disliked);
  } else {
    stats().neutral++; emote(n, "😐");
    say(n.d.name, rng.pick([`Huh. ${sname(sid)[0].toUpperCase() + sname(sid).slice(1)}. Okay.`, "I don't get it, but thanks?", "Neat. I guess."]));
  }
}

function doLift(n) {
  firstAct(n); carried = n; n.state = "lifted"; mode = "carry"; stats().carries++;
  view.scene.attach(n.obj); emote(n, n.d.lovesFlying ? "😆" : "😨"); blip("pop");
}

function release() {
  const n = carried; carried = null; mode = "walk";
  // Carried next to someone? Introduce them instead of throwing.
  const other = npcs.filter(o => o !== n).map(o => ({ o, dd: worldPos(o.obj).distanceTo(playerPos()) })).sort((a, b) => a.dd - b.dd)[0];
  if (other && other.dd < REACH + 1) {
    planet.group.attach(n.obj);
    const p = planet.group.worldToLocal(worldPos(player.obj).add(new THREE.Vector3(Math.sin(player.heading) * 2.5, 0, Math.cos(player.heading) * 2.5))).normalize();
    n.dir = p; n.state = "idle"; stats().intros++;
    const o = other.o;
    note(`Carried ${n.d.name} over to meet ${o.d.name}.`);
    if (n.d.request.type === "bring" && n.d.request.target === o.i && !n.done) { heart(o, 1); return complete(n, `met ${o.d.name}`); }
    if (o.d.request.type === "bring" && o.d.request.target === n.i && !o.done) { heart(n, 1); return complete(o, `met ${n.d.name}`); }
    emote(n, "👋"); emote(o, "👋");
    say(o.d.name, `Oh. Hi, ${n.d.name}. Did they just... carry you here?`);
    return;
  }
  // Throw!
  stats().tosses++; player.act = 1; blip("whoosh");
  const a = 0.55, fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  const target = new THREE.Vector3(Math.sin(a) * fx, Math.cos(a), Math.sin(a) * fz).applyQuaternion(planet.group.quaternion.clone().invert()).normalize();
  planet.group.attach(n.obj);
  n.state = "flying"; n.flight = { from: localUp(), to: target, k: 0 };
}

function land(n) {
  n.state = "idle"; n.dir = n.flight.to; n.flight = null;
  if (n.d.lovesFlying) { stats().tossLoved++; heart(n, 1); emote(n, "🤩"); note(`Threw ${n.d.name} into the sky. They loved it.`); score({ playful: 1, bold: 1 }); }
  else { stats().tossHated++; heart(n, -1); emote(n, "😵"); note(`Threw ${n.d.name} into the sky. They did not love it.`); score({ playful: 1, kind: -1 }); }
  if (n.d.request.type === "fly" && !n.done) return complete(n, "a trip to the sky");
  if (mode === "walk") say(n.d.name, n.d.lines.tossed);
}

function menuItems() {
  return [["💬", "Talk"], ["👋", "Greet"], ["✨", "Sticker"], ["🤲", "Pick up"], ["🪪", "Card"], ["✖️", "Leave"]];
}

// ---------- Scene ----------

export const planetScene = {
  enter(data) {
    world = data.world || game.world;
    game.world = world;
    game.life.world = { ...game.life.world, name: world.name, description: world.description };
    game.stats = game.stats || { talks: 0, gossip: 0, cardsRead: 0, cardsBeforeActing: 0, greetRight: 0, greetWrong: 0, liked: 0, pranks: 0, oops: 0, neutral: 0, tosses: 0, tossLoved: 0, tossHated: 0, carries: 0, intros: 0, requestsDone: 0, quizzes: 0 };
    build();
    // Starting stickers: everything someone asks for, plus a few random ones (some loved, some hated)
    const asked = world.npcs.filter(v => v.request.type === "sticker").map(v => v.request.target);
    game.stickers = [...new Set([...asked, ...[...STICKER_IDS].sort(() => rng() - 0.5)])].slice(0, 7);
    stage.view = view;
    t = 0; dayT = 0; mode = "walk"; sel = 0; near = null; lines = null; quiz = null; carried = null; pops = []; toast = null; lastWarn = 0;
    music(BIOMES[world.biome].notes); ambience("quiet");
    setToast(`Welcome to ${world.name}!`);
    if (new URLSearchParams(location.search).has("debug")) window.evolPlanet = { get mode() { return mode; }, get near() { return near; }, npcs: () => npcs, moths: () => moths, act: (name, ...a) => ({ doTalk, doGreet, doSticker, doLift, release, complete })[name](...a), setDay: v => { dayT = v; }, goTo: i => { const d = (i < npcs.length ? npcs[i].dir : moths[i - npcs.length].dir).clone(); const off = new THREE.Vector3(0, 0, 1).sub(d.clone().multiplyScalar(d.z)).normalize(); planet.group.quaternion.setFromUnitVectors(d.clone().addScaledVector(off, -0.12).normalize(), UP); } };
  },
  exit() { music(null); },
  update(dt) {
    t += dt; planet.update(dt);
    if (mode === "walk" || mode === "carry") dayT = Math.min(1, dayT + dt / DAY_SECONDS);
    if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
    for (const p of pops) p.t += dt;
    pops = pops.filter(p => p.t < 1.6);

    // ----- Movement: the planet turns under you -----
    const mx = Input.x, mz = Input.y, mag = Math.hypot(mx, mz);
    player.moving = false;
    if ((mode === "walk" || mode === "carry") && mag > 0.15) {
      const d = new THREE.Vector3(mx, 0, mz).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(d.clone().cross(UP).normalize(), SPEED * Math.min(1, mag) * dt / R);
      planet.group.quaternion.premultiply(q);
      const target = Math.atan2(d.x, d.z);
      let diff = target - player.heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.heading += diff * Math.min(1, dt * 12);
      player.moving = true;
    }
    const up = localUp();
    player.obj.position.set(0, planet.heightAt(up), 0);
    player.obj.rotation.set(0, player.heading, 0);
    player.bounce += dt * (player.moving ? 14 : 3);
    player.act = Math.max(0, player.act - dt * 2);
    const inner = player.obj.userData.inner;
    inner.position.y = Math.abs(Math.sin(player.bounce)) * (player.moving ? 0.35 : 0.06) + Math.sin(player.act * Math.PI) * 1.2;
    inner.rotation.z = player.act * Math.PI * 2 * 0;
    player.obj.rotation.y += player.act * 6.28 * (1 - player.act);
    M.animateCreature(inner, t, player.moving);

    // ----- Residents wander, turn to face you, fly when thrown -----
    const pLocal = up.clone();
    for (const n of npcs) {
      if (n.emote) { n.emote.t -= dt; if (n.emote.t <= 0) n.emote = null; }
      M.animateCreature(n.obj.userData.inner, t + n.i, n.state === "idle");
      if (n.state === "lifted") {
        n.obj.position.set(0, player.obj.position.y + 3.1 + Math.sin(t * 6) * 0.15, 0);
        n.obj.quaternion.setFromAxisAngle(UP, player.heading + Math.sin(t * 3) * 0.3);
        continue;
      }
      if (n.state === "flying") {
        const f = n.flight; f.k = Math.min(1, f.k + dt / 1.2);
        const dir = f.from.clone().lerp(f.to, f.k).normalize();
        orient(n.obj, dir, n.heading, Math.sin(Math.PI * f.k) * 9 + 3 * (1 - f.k), f.k * Math.PI * 4);
        if (f.k >= 1) land(n);
        continue;
      }
      const close = n.dir.angleTo(pLocal) * R < 7;
      if (close) faceToward(n, pLocal);
      else {
        n.wanderT -= dt;
        if (n.wanderT < 0) { n.wanderT = 2 + rng() * 4; n.heading += (rng() - 0.5) * 2.4; }
        const qUp = new THREE.Quaternion().setFromUnitVectors(UP, n.dir).multiply(new THREE.Quaternion().setFromAxisAngle(UP, n.heading));
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qUp);
        n.dir.addScaledVector(fwd, dt * 1.1 / R).normalize();
      }
      orient(n.obj, n.dir, n.heading);
    }
    for (const m of moths) {
      orient(m.obj, m.dir, t * 0.4, 3.5 + Math.sin(t * 1.5 + m.i) * 0.5);
      m.obj.userData.wl.rotation.y = 0.6 + Math.sin(t * 9) * 0.5; m.obj.userData.wr.rotation.y = -0.6 - Math.sin(t * 9) * 0.5;
    }

    // ----- What's in reach -----
    const pp = playerPos();
    near = null; let best = REACH;
    for (const n of npcs) if (n.state === "idle") { const d = worldPos(n.obj).distanceTo(pp); if (d < best) { best = d; near = { kind: "npc", n }; } }
    for (const m of moths) { const d = worldPos(m.obj).distanceTo(pp) - 3.5; if (d < best) { best = d; near = { kind: "moth", m }; } }
    if (worldPos(home.obj).distanceTo(pp) < REACH && !near) near = { kind: "home" };

    if (dayT > 0.85 && !lastWarn) { lastWarn = 1; setToast("The sun's going down. Head home to your tent to sleep."); }
    if (dayT >= 1 && (mode === "walk" || mode === "carry")) { if (carried) release(); return sleep(); }

    // ----- Modes -----
    const tap = Input.tapped(), press = Input.pressed();
    if (mode === "walk") {
      if (press && near) {
        if (near.kind === "npc") { mode = "menu"; sel = 0; blip("pop"); }
        else if (near.kind === "moth") { if (near.m.done) say(near.m.q.name, "Shh. I'm thinking about your answers."); else { quiz = { m: near.m, qi: 0, sel: 1, reply: null }; mode = "quiz"; blip("talk"); } }
        else { mode = "home"; sel = 1; }
      }
    } else if (mode === "carry") {
      if (press) release();
    } else if (mode === "menu") {
      const n = near && near.n;
      if (!n) { mode = "walk"; return; }
      if (tap.x) { sel = (sel + tap.x + 6) % 6; blip("talk"); }
      if (press) {
        if (sel === 0) doTalk(n);
        else if (sel === 1) { mode = "greet"; sel = 0; }
        else if (sel === 2) { mode = "stickers"; sel = 0; }
        else if (sel === 3) doLift(n);
        else if (sel === 4) { mode = "card"; if (!n.cardRead) { n.cardRead = true; stats().cardsRead++; score({ curious: 1, calm: 1 }); } }
        else mode = "walk";
      }
    } else if (mode === "greet" || mode === "stickers") {
      const n = near && near.n, list = mode === "greet" ? GREETING_IDS : game.stickers;
      if (!n) { mode = "walk"; return; }
      if (tap.x) { sel = (sel + tap.x + list.length + 1) % (list.length + 1); blip("talk"); }
      if (press) {
        if (sel === list.length) { sel = mode === "greet" ? 1 : 2; mode = "menu"; return; }
        mode === "greet" ? doGreet(n, list[sel]) : doSticker(n, list[sel]);
      }
    } else if (mode === "card") {
      if (press || tap.x || tap.y) { mode = "menu"; sel = 4; }
    } else if (mode === "talk") {
      if (press) {
        lines.i++;
        if (lines.i >= lines.list.length) { const after = lines.after; lines = null; mode = "walk"; if (after) after(); }
        else blip("talk");
      }
    } else if (mode === "quiz") {
      const Q = quiz.m.q.questions[quiz.qi];
      if (!quiz.reply) {
        if (tap.x) { quiz.sel = clamp(quiz.sel + tap.x, 0, 2); blip("talk"); }
        if (press) {
          const a = Q.answers[quiz.sel];
          score(a.axes); quiz.reply = a.reply; blip("pop");
          game.answers.push({ day: game.day, who: quiz.m.q.name, question: Q.q, answer: a.text });
        }
      } else if (press) {
        quiz.reply = null; quiz.qi++; quiz.sel = 1;
        if (quiz.qi >= 3) { quiz.m.done = true; stats().quizzes++; note(`Answered ${quiz.m.q.name}'s three questions.`); const name = quiz.m.q.name; quiz = null; say(name, "Hmm. Hmmmm. I'll pass these along to Dr. Wobble."); }
      }
    } else if (mode === "home") {
      if (tap.x) sel = tap.x > 0 ? 1 : 0;
      if (press) { if (sel === 0) sleep(); else mode = "walk"; }
    }
  },

  draw(g) {
    const b = lookOf(world.biome, world.look);
    // ----- HUD: world sticker, day bar, friends -----
    g.fillStyle = "rgba(43,35,64,0.72)"; rect(g, 24, 20, 320, 96, 26); g.fill();
    sticker(g, 70, 66, 64, "🪐", { tilt: -0.1 });
    g.textAlign = "left"; g.fillStyle = UI.white; g.font = font(28, 700, FONT.title);
    g.fillText(world.name, 112, 56); g.font = font(14, 600); g.fillStyle = "rgba(255,255,255,0.75)"; g.fillText(b.label.toUpperCase() + "  ·  DAY", 113, 78);
    g.fillStyle = "rgba(255,255,255,0.25)"; rect(g, 112, 90, 200, 12, 6); g.fill();
    g.fillStyle = dayT > 0.85 ? "#ff8a5a" : UI.yellow; rect(g, 112, 90, 200 * (1 - dayT) + 0.01, 12, 6); g.fill();
    g.font = font(18, 700); g.fillStyle = UI.white; g.textAlign = "right";
    const friends = npcs.filter(n => n.hearts >= 4).length, done = npcs.filter(n => n.done).length;
    const hud = `💖 Friends ${friends}/${npcs.length}    🎁 Requests ${done}/${npcs.length}    ✨ Stickers ${game.stickers.length}`;
    const hw = g.measureText(hud).width + 40; g.fillStyle = "rgba(43,35,64,0.72)"; rect(g, W - 24 - hw, 20, hw, 46, 23); g.fill(); g.fillStyle = UI.white;
    g.save();
    g.fillText(hud, W - 44, 50);
    g.restore();

    // ----- World-space labels: names, hearts, emotes, sticker pops -----
    for (const n of npcs) {
      const s = stage.toScreen(headOf(n.obj, 3.6)); if (!s) continue;
      const isNear = near && near.n === n;
      if (n.emote) sticker(g, s.x + 34, s.y - 30, 52, n.emote.glyph, { tilt: 0.15 });
      if (isNear || n.met) {
        g.textAlign = "center"; g.font = font(isNear ? 20 : 15, 700);
        const label = n.met ? n.d.name : "???";
        const w = g.measureText(label).width + 24;
        g.fillStyle = isNear ? UI.red : "rgba(43,35,64,0.6)"; rect(g, s.x - w / 2, s.y - 16, w, isNear ? 30 : 24, 12); g.fill();
        g.fillStyle = UI.white; g.fillText(label, s.x, s.y + (isNear ? 5 : 2));
        if (isNear) { g.font = font(16, 500); g.fillText("♥".repeat(Math.round(n.hearts)) + "♡".repeat(5 - Math.round(n.hearts)), s.x, s.y + 34); if (n.done) g.fillText("✓ helped", s.x, s.y + 54); }
      }
    }
    for (const m of moths) {
      const s = stage.toScreen(headOf(m.obj, 3.4)); if (!s || !(near && near.m === m)) continue;
      g.textAlign = "center"; g.font = font(20, 700); const lab = m.done ? `${m.q.name} ✓` : `${m.q.name} has questions`;
      const w = g.measureText(lab).width + 24; g.fillStyle = "#8a5ad0"; rect(g, s.x - w / 2, s.y - 16, w, 30, 12); g.fill(); g.fillStyle = UI.white; g.fillText(lab, s.x, s.y + 5);
    }
    for (const p of pops) {
      const s = stage.toScreen(headOf(p.obj, 4)); if (!s) continue;
      const k = p.t / 1.6, sz = (p.big ? 120 : 46) * Math.min(1, p.t * 6) * (1 - Math.max(0, k - 0.7) * 3);
      if (sz > 4) sticker(g, s.x + (p.big ? 0 : -30), s.y - 40 - k * 60, sz, p.glyph, { tilt: Math.sin(p.t * 9) * 0.15 });
    }
    if (toast) { g.globalAlpha = clamp(toast.t, 0, 1); box(g, W / 2 - 330, 110, 660, 58, UI.yellow); g.fillStyle = UI.ink; g.font = font(22, 600); g.textAlign = "center"; g.fillText(toast.text, W / 2, 147); g.globalAlpha = 1; }

    // ----- Mode overlays -----
    if (mode === "walk") {
      if (near) hint(g, near.kind === "npc" ? `Button: ${near.n.met ? near.n.d.name : "say hi"}` : near.kind === "moth" ? "Button: answer the moth" : "Button: your tent");
      else hint(g, "Joystick: walk around the planet");
    } else if (mode === "carry") {
      hint(g, "Carrying " + carried.d.name + ".  Button: throw (or set down next to someone)");
    } else if (mode === "menu") {
      row(g, menuItems().map(([e, l]) => ({ glyph: e, label: l })), sel, near.n.d.name);
    } else if (mode === "greet") {
      row(g, [...GREETING_IDS.map(id => ({ glyph: GREETINGS[id][0], label: GREETINGS[id][1] })), { glyph: "↩️", label: "Back" }], sel, "Greet " + near.n.d.name);
    } else if (mode === "stickers") {
      row(g, [...game.stickers.map(id => ({ glyph: STICKERS[id][0], label: sname(id).replace(/^an? /, "") })), { glyph: "↩️", label: "Back" }], sel, "Summon a sticker for " + near.n.d.name);
    } else if (mode === "card") {
      drawCard(g, near.n);
    } else if (mode === "talk" && lines) {
      dialogue(g, lines.who, lines.list[lines.i], { y: 500, h: 170 });
      hint(g, "Button: next");
    } else if (mode === "quiz" && quiz) {
      drawQuiz(g);
    } else if (mode === "home") {
      box(g, W / 2 - 300, 230, 600, 230);
      g.fillStyle = UI.ink; g.textAlign = "center"; g.font = font(34, 700, FONT.title); g.fillText("Call it a day?", W / 2, 300);
      g.font = font(20, 500); g.fillText("You'll write in your diary, then meet Dr. Wobble.", W / 2, 340);
      pill(g, W / 2 - 230, 375, 210, 56, "Sleep", sel === 0); pill(g, W / 2 + 20, 375, 210, 56, "Not yet", sel === 1);
    }
    if (!world.fromAI) { g.fillStyle = "rgba(255,255,255,0.7)"; g.font = font(14, 500); g.textAlign = "left"; g.fillText("AI unavailable: residents built offline", 20, H - 16); }
  }
};

function pill(g, x, y, w, h, text, on) {
  g.fillStyle = on ? UI.red : UI.white; rect(g, x, y, w, h, h / 2); g.fill();
  g.strokeStyle = UI.ink; g.lineWidth = 2; g.stroke();
  g.fillStyle = on ? UI.white : UI.ink; g.font = font(22, 700); g.textAlign = "center"; g.fillText(text, x + w / 2, y + h / 2 + 8);
}

/** A popit-style row of stickers along the bottom (LittleBigPlanet's sticker menu). */
function row(g, items, selected, title) {
  const n = items.length, size = n > 9 ? 70 : 84, gap = n > 9 ? 22 : 34;
  const total = n * size + (n - 1) * gap, x0 = W / 2 - total / 2 + size / 2;
  box(g, W / 2 - total / 2 - 40, 515, total + 80, 190, UI.card);
  g.fillStyle = UI.ink; g.font = font(22, 700); g.textAlign = "center"; g.fillText(title, W / 2, 552); g.fillStyle = UI.muted; g.font = font(14, 600); g.fillText("◀ ▶ pick   ·   button: use", W / 2, 572);
  items.forEach((it, i) => {
    const on = i === selected, x = x0 + i * (size + gap);
    sticker(g, x, 625 - (on ? 8 : 0), on ? size * 1.12 : size, it.glyph, { tilt: on ? Math.sin(t * 5) * 0.08 : (i % 2 ? 0.06 : -0.06), ring: on ? UI.red : null });
    g.fillStyle = on ? UI.red : UI.ink; g.font = font(on ? 16 : 14, on ? 700 : 500); g.fillText(it.label, x, 684);
  });
}

/** The identity card (Doki Doki Universe): fills in as you learn about someone. */
function drawCard(g, n) {
  const x = W / 2 - 340, y = 90, w = 680, h = 520;
  box(g, x, y, w, h, UI.card);
  g.fillStyle = UI.paper; rect(g, x + 30, y + 30, w - 60, h - 60, 16); g.fill();
  g.textAlign = "left"; g.fillStyle = UI.red; g.font = font(44, 700, FONT.title); g.fillText(n.met ? n.d.name : "???", x + 60, y + 95);
  g.fillStyle = UI.muted; g.font = font(20, 600); g.fillText(n.d.role.toUpperCase(), x + 62, y + 124);
  g.fillStyle = UI.ink; g.font = font(20, 500); wrapText(g, n.d.personality, x + 62, y + 160, w - 300, 28);
  g.font = font(30, 500); g.textAlign = "right"; g.fillStyle = UI.red; g.fillText("♥".repeat(Math.round(n.hearts)) + "♡".repeat(5 - Math.round(n.hearts)), x + w - 60, y + 95);
  const slot = (label, ids, knownSet, yy) => {
    g.textAlign = "left"; g.fillStyle = UI.ink; g.font = font(20, 700); g.fillText(label, x + 62, yy + 8);
    ids.forEach((id, i) => sticker(g, x + 250 + i * 90, yy, 64, knownSet.has(id) ? STICKERS[id][0] : "❔", { tilt: i ? 0.08 : -0.08, bg: knownSet.has(id) ? "#fff" : "#eee" }));
  };
  slot("LIKES", n.d.likes, n.known.likes, y + 250);
  slot("DISLIKES", n.d.dislikes, n.known.dislikes, y + 335);
  g.textAlign = "left"; g.fillStyle = UI.ink; g.font = font(20, 700); g.fillText("GREETING", x + 62, y + 420);
  sticker(g, x + 250, y + 412, 64, n.known.greeting ? GREETINGS[n.d.greeting][0] : "❔", { bg: n.known.greeting ? "#fff" : "#eee" });
  g.fillText("WANTS", x + 360, y + 420);
  g.font = font(18, 500); wrapText(g, n.done ? "✓ Done! They gave you a present." : n.known.request ? requestText(n) : "Talk to them to find out.", x + 450, y + 412, 200, 24);
  g.fillStyle = UI.muted; g.font = font(16, 500); g.textAlign = "center"; g.fillText("Talk to their neighbors to fill in the ❔", W / 2, y + h - 44);
  hint(g, "Button: close card");
}

function drawQuiz(g) {
  const m = quiz.m, Q = m.q.questions[quiz.qi];
  box(g, 140, 70, W - 280, 600, "#efe2ff");
  g.textAlign = "left"; g.fillStyle = "#8a5ad0"; g.font = font(20, 700); g.fillText(`${m.q.name.toUpperCase()}  ·  QUESTION ${quiz.qi + 1} OF 3`, 190, 120);
  g.fillStyle = UI.ink; g.font = font(34, 700, FONT.title); wrapText(g, Q.q, 190, 170, 620, 42);
  sticker(g, W - 300, 190, 150, Q.pic, { tilt: 0.08 });
  Q.answers.forEach((a, i) => {
    const x = 220 + i * 290, on = i === quiz.sel && !quiz.reply;
    sticker(g, x + 110, 400, on ? 130 : 110, a.pic, { tilt: (i - 1) * 0.08, ring: on ? "#8a5ad0" : null });
    g.fillStyle = on ? "#8a5ad0" : UI.ink; g.font = font(20, on ? 700 : 500); g.textAlign = "center";
    wrapText(g, a.text, x + 110, 500, 240, 26, "center");
  });
  if (quiz.reply) { box(g, 240, 560, W - 480, 80, UI.paper); g.fillStyle = UI.ink; g.font = font(22, 600); g.textAlign = "center"; g.fillText(quiz.reply, W / 2, 608); hint(g, "Button: next"); }
  else hint(g, "Without thinking too hard: left / right, button");
}

function sleep() {
  mode = "sleeping";
  const photo = stage.snapshot();
  note(`Went to sleep with ${npcs.filter(n => n.hearts >= 4).length} friends and ${npcs.filter(n => n.done).length} requests done.`);
  go("diary", { photo });
}
