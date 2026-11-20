// The city: what's on every grid cell (road, house, shop, office, park), how it grows, and the traffic.
// You lay roads and zone the land; buildings only grow if they touch a road, and they grow taller when the
// neighborhood has what people want (houses want shops and parks, shops want houses, offices want workers).
// Buildings are drawn by the Townscaper-style town builder, so whole blocks join into proper streets.

import { makeTown, CELL } from "./town.js";

const THREE = window.THREE;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const TOOLS = [
  { id: "road", icon: "🛣️", label: "Road" }, { id: "house", icon: "🏠", label: "Homes" }, { id: "shop", icon: "🏪", label: "Shops" },
  { id: "office", icon: "🏢", label: "Offices" }, { id: "park", icon: "🌳", label: "Park" }, { id: "bulldoze", icon: "🚜", label: "Bulldoze" }
];
const MAX_LEVEL = { house: 3, shop: 2, office: 6 };
const START_LEVEL = { house: 1, shop: 1, office: 2 };
const SHOP_COLORS = [0xffd9a8, 0xffc4c4, 0xd4ecc4, 0xfff0b0], AWNINGS = [0xe8544a, 0x3f8fd0, 0x2fa86a, 0xf0a030];
const OFFICE_COLORS = [0xa8bccf, 0xb9c6d4, 0x9fb0c0];

const mats = new Map();
const mat = (c, r = 0.9) => { const k = c + ":" + r; if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r })); return mats.get(k); };
const hash = (i, j, k = 0) => { let h = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function makeCity(world, palette, { onGrow } = {}) {
  const cells = new Map(); // key -> { type, level }
  const key = (i, j) => i + "," + j;
  const get = (i, j) => cells.get(key(i, j));
  const is = (i, j, type) => (get(i, j) || {}).type === type;
  const town = makeTown(world, palette, {
    style: (i, j) => {
      const c = get(i, j) || {};
      if (c.type === "shop") return { wall: SHOP_COLORS[Math.floor(hash(i, j) * 4)], awning: AWNINGS[Math.floor(hash(i, j, 3) * 4)], flat: true, noSpire: true };
      if (c.type === "office") return { wall: OFFICE_COLORS[Math.floor(hash(i, j) * 3)], flat: true, noSpire: true };
      return { noSpire: true };
    }
  });
  const group = new THREE.Group(); group.add(town.group);
  const flats = new Map(); // roads and parks: key -> mesh group

  const groundY = (i, j) => { let hi = -Infinity; for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]]) hi = Math.max(hi, world.heightAt((i + a) * CELL, (j + b) * CELL)); return hi; };
  const isWater = (i, j) => groundY(i, j) < 0.35;

  function drawFlat(i, j) {
    const k = key(i, j);
    if (flats.has(k)) { group.remove(flats.get(k)); flats.delete(k); }
    const c = get(i, j);
    if (!c || (c.type !== "road" && c.type !== "park")) return;
    const g = new THREE.Group(), y = Math.max(groundY(i, j), 0.45);
    g.position.set(i * CELL, y, j * CELL);
    const add = (geo, m, x, yy, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, yy, z); o.rotation.y = ry; o.receiveShadow = true; o.castShadow = true; g.add(o); return o; };
    if (c.type === "road") {
      if (groundY(i, j) < 0.35) { // bridge over water
        add(new THREE.BoxGeometry(CELL, 0.3, CELL * 0.9), mat(0xd8d0c4), 0, -0.1, 0);
        add(new THREE.CylinderGeometry(0.25, 0.3, 3, 8), mat(0xc8c0b4), 0, -1.6, 0);
      } else add(new THREE.BoxGeometry(CELL + 0.02, 0.5, CELL + 0.02), mat(0xcfc6b6, 0.95), 0, -0.25, 0); // curb base
      add(new THREE.BoxGeometry(CELL, 0.1, CELL), mat(0x5d6068, 0.95), 0, 0.06, 0);
      SIDES.forEach(([a, b]) => {
        if (is(i + a, j + b, "road")) {
          // lane stripe toward the connected neighbor
          add(new THREE.BoxGeometry(a ? CELL / 2 : 0.12, 0.02, b ? CELL / 2 : 0.12), mat(0xf4f0e0, 0.6), a * CELL / 4, 0.12, b * CELL / 4);
        } else {
          // sidewalk on the open side
          add(new THREE.BoxGeometry(a ? 0.5 : CELL, 0.16, b ? 0.5 : CELL), mat(0xe2dccf), a * (CELL / 2 - 0.25), 0.12, b * (CELL / 2 - 0.25));
        }
      });
    } else {
      add(new THREE.BoxGeometry(CELL, 0.2, CELL), mat(0x78bf5a, 1), 0, 0.0, 0);
      const n = 1 + Math.floor(hash(i, j) * 2);
      for (let t = 0; t < n; t++) {
        const x = (hash(i, j, t + 1) - 0.5) * 1.6, z = (hash(i, j, t + 5) - 0.5) * 1.6;
        add(new THREE.CylinderGeometry(0.12, 0.16, 1, 6), mat(0x7a5a42), x, 0.6, z);
        add(new THREE.IcosahedronGeometry(0.75, 1), mat(t ? 0x5fa04a : 0x6fb050, 1), x, 1.45, z);
      }
      if (hash(i, j, 9) < 0.5) add(new THREE.BoxGeometry(1, 0.12, 0.35), mat(0xa8835e), 0.6, 0.45, -0.9);
      else add(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 14), mat(0x6ec8dc, 0.2), 0.5, 0.13, 0.6);
      for (let f = 0; f < 5; f++) add(new THREE.IcosahedronGeometry(0.1, 0), mat([0xffffff, 0xffd84a, 0xff9fb8][f % 3]), (hash(i, j, f + 20) - 0.5) * 2.6, 0.18, (hash(i, j, f + 30) - 0.5) * 2.6);
    }
    group.add(g); flats.set(k, g);
  }

  const refresh = (i, j) => { drawFlat(i, j); for (const [a, b] of SIDES) drawFlat(i + a, j + b); };
  const hasRoad = (i, j) => SIDES.some(([a, b]) => is(i + a, j + b, "road"));
  const near = (i, j, type, r) => { let n = 0; for (const [k, c] of cells) { if (c.type !== type) continue; const [x, z] = k.split(",").map(Number); if (Math.abs(x - i) <= r && Math.abs(z - j) <= r) n += c.level || 1; } return n; };

  // ----- Traffic: little cars wander the road network -----
  const cars = [];
  const carGroup = new THREE.Group(); group.add(carGroup);
  const CAR_COLORS = [0xe8544a, 0x3f8fd0, 0xf0c040, 0xffffff, 0x2fa86a, 0x8a5ad0];
  function spawnCar() {
    const roads = [...cells.entries()].filter(([, c]) => c.type === "road");
    if (!roads.length) return;
    const [k] = roads[Math.floor(Math.random() * roads.length)], [i, j] = k.split(",").map(Number);
    const m = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.2), mat(CAR_COLORS[cars.length % CAR_COLORS.length], 0.5)); body.position.y = 0.32; body.castShadow = true; m.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), mat(0xe8eef4, 0.3)); cab.position.set(0, 0.62, -0.05); m.add(cab);
    carGroup.add(m);
    cars.push({ m, from: [i, j], to: [i, j], k: 1, speed: 4 + Math.random() * 2 });
  }
  function updateCars(dt) {
    const roadCount = [...cells.values()].filter(c => c.type === "road").length;
    const want = Math.min(28, Math.floor(roadCount / 2.5) + Math.floor(stats().population / 25));
    while (cars.length < want) spawnCar();
    while (cars.length > want) { const c = cars.pop(); carGroup.remove(c.m); }
    for (const c of cars) {
      if (!is(c.to[0], c.to[1], "road")) { c.from = c.to; c.k = 1; }
      c.k += dt * c.speed / CELL;
      if (c.k >= 1) {
        const [i, j] = c.to, back = c.from;
        const opts = SIDES.map(([a, b]) => [i + a, j + b]).filter(([x, z]) => is(x, z, "road"));
        const fwd = opts.filter(([x, z]) => !(x === back[0] && z === back[1]));
        const next = (fwd.length ? fwd : opts)[Math.floor(Math.random() * Math.max(1, (fwd.length ? fwd : opts).length))];
        c.from = [i, j]; c.to = next || [i, j]; c.k = 0;
      }
      const [fi, fj] = c.from, [ti, tj] = c.to, dx = ti - fi, dz = tj - fj;
      const x = (fi + dx * c.k) * CELL, z = (fj + dz * c.k) * CELL;
      const lane = 0.55; // drive on the right
      const y = Math.max(groundY(Math.round(x / CELL), Math.round(z / CELL)), 0.45) + 0.1;
      c.m.position.set(x + (dz ? -Math.sign(dz) * lane : 0), y, z + (dx ? Math.sign(dx) * lane : 0));
      if (dx || dz) c.m.rotation.y = Math.atan2(dx, dz);
    }
  }

  // ----- The numbers -----
  function stats() {
    let population = 0, jobs = 0, roads = 0, homes = 0, shops = 0, offices = 0, parks = 0, unconnected = 0, happyHomes = 0, bridges = 0;
    for (const [k, c] of cells) {
      const [i, j] = k.split(",").map(Number);
      if (c.type === "road") { roads++; if (isWater(i, j)) bridges++; continue; }
      if (c.type === "park") { parks++; continue; }
      const linked = hasRoad(i, j);
      if (!linked) { unconnected++; continue; }
      if (c.type === "house") { homes++; population += c.level * 4; if (near(i, j, "park", 4)) happyHomes++; }
      if (c.type === "shop") { shops++; jobs += c.level * 3; }
      if (c.type === "office") { offices++; jobs += c.level * 5; }
    }
    const happiness = homes ? Math.round(55 + 45 * happyHomes / homes - Math.max(0, population - jobs * 1.6) / 4) : 0;
    return { population, jobs, roads, homes, shops, offices, parks, unconnected, bridges, happiness: Math.max(0, Math.min(100, happiness)) };
  }

  return {
    group, cells, town, get, stats, isWater, groundY,
    topY: (i, j) => { const c = get(i, j); if (c && c.level) return town.topY(i, j); return Math.max(groundY(i, j), 0.45) + (c ? 0.2 : 0); },
    /** Put something on a cell. Returns a short reason if it can't go there. */
    place(i, j, type) {
      if (Math.hypot(i * CELL, j * CELL) > 30) return "Build closer to the middle.";
      const c = get(i, j);
      if (type === "bulldoze") { if (!c) return "Nothing here."; this.clear(i, j); return null; }
      if (c && c.type === type) return null;
      if (type !== "road" && isWater(i, j)) return "Only roads can cross water (bridges).";
      if (c) this.clear(i, j);
      const level = START_LEVEL[type] || 0;
      cells.set(key(i, j), { type, level, age: 0 });
      if (level) town.set(i, j, level); else refresh(i, j);
      // neighbors' roads and buildings may change shape
      for (const [a, b] of SIDES) drawFlat(i + a, j + b);
      return null;
    },
    clear(i, j) { const c = get(i, j); if (!c) return; cells.delete(key(i, j)); if (c.level) town.set(i, j, 0); refresh(i, j); },
    /** One step of growth: buildings with what they need get a floor taller. */
    grow() {
      const st = stats();
      for (const [k, c] of cells) {
        if (!MAX_LEVEL[c.type] || c.level >= MAX_LEVEL[c.type]) continue;
        const [i, j] = k.split(",").map(Number);
        if (!hasRoad(i, j) || Math.random() > 0.3) continue;
        let ok = false;
        if (c.type === "house") ok = c.level === 1 ? near(i, j, "shop", 5) + near(i, j, "office", 6) > 0 : near(i, j, "park", 4) > 0 && st.jobs * 1.6 > st.population * 0.8;
        if (c.type === "shop") ok = near(i, j, "house", 4) >= 4;
        if (c.type === "office") ok = st.population > st.jobs * 0.7;
        if (!ok) continue;
        c.level++;
        const g = town.set(i, j, c.level);
        if (onGrow) onGrow(i, j, c, g);
        return; // one building at a time looks nicer
      }
    },
    update(dt) { updateCars(dt); },
    needsRoad: (i, j) => { const c = get(i, j); return c && MAX_LEVEL[c.type] && !hasRoad(i, j); },
    summary() { return { ...stats(), ...town.summary() }; }
  };
}
