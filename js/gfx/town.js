// Townscaper-style building. The ground is a grid; each cell holds a stack of floors. You only ever say
// "one more floor here" or "one less". The town works out the rest from the neighbors: walls join into
// continuous facades, windows appear only where a wall faces open air, the ground floor gets a door facing
// open ground, roofs become gables that run along a row of same-height houses, a lone tall stack becomes
// a tower with a spire, enclosed tops become little roof gardens, and cells over water stand on a pier.

const THREE = window.THREE;
export const CELL = 3.2, FLOOR = 2.5, MAX_H = 7;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const cache = new Map();
const mat = (color, rough = 0.85, emissive = 0) => {
  const k = color + ":" + rough + ":" + emissive;
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: emissive ? color : 0x000000, emissiveIntensity: emissive }));
  return cache.get(k);
};
const hash = (i, j, k = 0) => { let h = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** A gable roof: ridge along x, width w (x), depth d (z), height h, with a little overhang. */
function gable(w, d, h) {
  const x = w / 2 + 0.25, z = d / 2 + 0.35;
  const v = [
    -x, 0, -z, x, 0, -z, x, h, 0, -x, 0, -z, x, h, 0, -x, h, 0, // back slope
    -x, 0, z, -x, h, 0, x, h, 0, -x, 0, z, x, h, 0, x, 0, z, // front slope
    -x + 0.25, 0, -z + 0.35, -x + 0.25, h, 0, -x + 0.25, 0, z - 0.35, // gable ends
    x - 0.25, 0, -z + 0.35, x - 0.25, 0, z - 0.35, x - 0.25, h, 0
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export function makeTown(world, palette, { onChange } = {}) {
  const group = new THREE.Group();
  const cells = new Map(); // "i,j" -> height
  const meshes = new Map(); // "i,j" -> Group
  const key = (i, j) => i + "," + j;
  const heightOf = (i, j) => cells.get(key(i, j)) || 0;
  const walls = palette.walls.map(c => new THREE.Color(c).getHex()), roofC = new THREE.Color(palette.roof).getHex();
  let glow = 0; // 0 by day, 1 at night: windows light up

  const groundAt = (i, j) => {
    // Use the lowest of the cell's corners so foundations always reach the ground
    let lo = Infinity, hi = -Infinity;
    for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]]) { const h = world.heightAt((i + a) * CELL, (j + b) * CELL); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    return { lo, hi };
  };

  function buildColumn(i, j) {
    const k0 = key(i, j);
    if (meshes.has(k0)) { group.remove(meshes.get(k0)); meshes.delete(k0); }
    const h = heightOf(i, j);
    if (!h) return;
    const g = new THREE.Group(), x = i * CELL, z = j * CELL;
    g.position.set(x, 0, z);
    const { lo, hi } = groundAt(i, j);
    const overWater = hi < 0.35;
    const base = overWater ? 0.5 : hi + 0.05;
    const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    const wallC = walls[Math.floor(hash(i, j) * walls.length)];

    if (overWater) {
      // Pier: wooden deck on posts
      add(new THREE.BoxGeometry(CELL, 0.25, CELL), mat(0xa8835e), 0, base - 0.12, 0);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.CylinderGeometry(0.14, 0.14, 3, 6), mat(0x7a5a40), a * (CELL / 2 - 0.25), base - 1.6, b * (CELL / 2 - 0.25));
    } else {
      // Stone foundation down to the lowest ground
      const fh = base - lo + 0.4;
      add(new THREE.BoxGeometry(CELL + 0.12, fh, CELL + 0.12), mat(0xcfc6b6, 0.95), 0, base - fh / 2, 0);
    }

    const lone = SIDES.every(([a, b]) => heightOf(i + a, j + b) === 0);
    const tower = lone && h >= 3;
    const w = tower ? CELL * 0.82 : CELL;
    for (let k = 0; k < h; k++) {
      const y = base + k * FLOOR;
      add(new THREE.BoxGeometry(w, FLOOR, w), mat(wallC, 0.9), 0, y + FLOOR / 2, 0);
      // Trim line between floors
      add(new THREE.BoxGeometry(w + 0.1, 0.12, w + 0.1), mat(0xf6efe4), 0, y + FLOOR - 0.04, 0);
      SIDES.forEach(([a, b], s) => {
        if (heightOf(i + a, j + b) > k) return; // wall is shared with a neighbor: no window
        const ry = [Math.PI / 2, -Math.PI / 2, 0, Math.PI][s];
        const ox = a * (w / 2 + 0.03), oz = b * (w / 2 + 0.03);
        const door = k === 0 && !overWater && hash(i, j, s + 7) < 0.45 && s === Math.floor(hash(i, j, 3) * 4);
        if (door) {
          add(new THREE.BoxGeometry(0.95, 1.6, 0.1), mat(0x6a4630), ox, y + 0.8, oz, ry);
          add(new THREE.BoxGeometry(1.2, 0.12, 0.25), mat(0xf6efe4), ox * 1.02, y + 1.68, oz * 1.02, ry);
        } else {
          const lit = glow > 0 && hash(i, j, k * 4 + s) < 0.7;
          add(new THREE.BoxGeometry(0.8, 1.05, 0.08), lit ? mat(0xffcf7a, 0.6, 0.9 * glow) : mat(0x40506e, 0.35), ox, y + 1.25, oz, ry);
          add(new THREE.BoxGeometry(1.0, 0.1, 0.18), mat(0xf6efe4), ox * 1.02, y + 0.68, oz * 1.02, ry);
          if (hash(i, j, k * 9 + s) < 0.3) add(new THREE.BoxGeometry(0.95, 0.22, 0.25), mat(0xe86a8a, 1), ox * 1.06, y + 0.55, oz * 1.06, ry); // flower box
        }
      });
    }

    // Roof
    const top = base + h * FLOOR;
    const same = SIDES.map(([a, b]) => heightOf(i + a, j + b) >= h);
    if (tower) {
      add(new THREE.ConeGeometry(w * 0.82, 3.2, 8), mat(roofC, 0.8), 0, top + 1.6, 0);
      add(new THREE.SphereGeometry(0.16, 8, 6), mat(0xffd36a, 0.4), 0, top + 3.3, 0);
    } else if (same.every(Boolean)) {
      // Enclosed: a little roof garden
      add(new THREE.BoxGeometry(CELL, 0.2, CELL), mat(0x7cb85a, 1), 0, top + 0.1, 0);
      if (hash(i, j, 5) < 0.6) add(new THREE.IcosahedronGeometry(0.55, 1), mat(0x5fa04a, 1), (hash(i, j, 6) - 0.5) * 1.5, top + 0.6, (hash(i, j, 8) - 0.5) * 1.5);
    } else {
      const alongX = (same[0] || same[1]) && !(same[2] || same[3]) ? true : (same[2] || same[3]) && !(same[0] || same[1]) ? false : hash(i, j, 2) < 0.5;
      const r = add(gable(CELL + (alongX ? 0.02 : 0), CELL, 1.6), mat(roofC, 0.75), 0, top, 0, alongX ? 0 : Math.PI / 2);
      r.material.side = THREE.DoubleSide;
      if (hash(i, j, 4) < 0.35) add(new THREE.BoxGeometry(0.4, 1.1, 0.4), mat(0xb87a5e), CELL * 0.22, top + 1.1, CELL * 0.15);
    }

    // Little garden at the base of exposed walls
    if (!overWater) SIDES.forEach(([a, b], s) => {
      if (heightOf(i + a, j + b) || hash(i, j, s + 20) > 0.4) return;
      const bush = add(new THREE.IcosahedronGeometry(0.42, 1), mat(0x6aa850, 1), a * (CELL / 2 + 0.35) + b * (hash(i, j, s) - 0.5) * 1.6, base + 0.25, b * (CELL / 2 + 0.35) + a * (hash(i, j, s + 1) - 0.5) * 1.6);
      bush.scale.y = 0.8;
    });

    g.userData.top = top;
    group.add(g); meshes.set(k0, g);
    return g;
  }

  const refresh = (i, j) => { buildColumn(i, j); for (const [a, b] of SIDES) buildColumn(i + a, j + b); };

  return {
    group, cells, heightOf,
    canBuild: (i, j) => Math.hypot(i * CELL, j * CELL) < 30 && heightOf(i, j) < MAX_H,
    topY(i, j) { const h = heightOf(i, j); const { hi } = groundAt(i, j); const base = hi < 0.35 ? 0.5 : hi + 0.05; return base + h * FLOOR; },
    /** Add a floor; returns the new column group so the scene can animate it. */
    add(i, j) {
      if (heightOf(i, j) >= MAX_H) return null;
      cells.set(key(i, j), heightOf(i, j) + 1); refresh(i, j);
      if (onChange) onChange();
      return meshes.get(key(i, j));
    },
    remove(i, j) {
      const h = heightOf(i, j); if (!h) return false;
      if (h === 1) cells.delete(key(i, j)); else cells.set(key(i, j), h - 1);
      refresh(i, j); if (onChange) onChange();
      return true;
    },
    setGlow(v) { if (Math.abs(v - glow) < 0.1) return; glow = v; for (const k of cells.keys()) { const [i, j] = k.split(",").map(Number); buildColumn(i, j); } },
    /** What the town looks like, for Dr. Wobble. */
    summary() {
      const list = [...cells.entries()].map(([k, h]) => { const [i, j] = k.split(",").map(Number); return { i, j, h }; });
      if (!list.length) return { columns: 0 };
      const seen = new Set(); let clusters = 0;
      for (const c of list) { if (seen.has(key(c.i, c.j))) continue; clusters++; const st = [c]; seen.add(key(c.i, c.j)); while (st.length) { const p = st.pop(); for (const [a, b] of SIDES) { const k = key(p.i + a, p.j + b); if (cells.has(k) && !seen.has(k)) { seen.add(k); st.push({ i: p.i + a, j: p.j + b }); } } } }
      const xs = list.map(c => c.i), zs = list.map(c => c.j);
      const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...zs) - Math.min(...zs) + 1);
      return {
        columns: list.length, floors: list.reduce((s, c) => s + c.h, 0), tallest: Math.max(...list.map(c => c.h)),
        towers: list.filter(c => c.h >= 3 && SIDES.every(([a, b]) => !cells.has(key(c.i + a, c.j + b)))).length,
        overWater: list.filter(c => groundAt(c.i, c.j).hi < 0.35).length,
        clusters, density: +(list.length / area).toFixed(2),
        distanceFromStart: +Math.max(...list.map(c => Math.hypot(c.i, c.j) * CELL)).toFixed(0)
      };
    }
  };
}
