// Life in your world: little creatures that wander the land, hidden treasures to find, and the gear your
// alien builder can wear. Treasures sparkle somewhere in the world; steer your builder to one and it's
// equipped right away (a new hat replaces the hard hat, a cape goes on your back, and so on).

const THREE = window.THREE;
const mat = (c, r = 0.8, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, emissive: e ? c : 0x000000, emissiveIntensity: e });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; };

// ---------- Gear ----------
// Each piece is built around (0,0,0) = the top of the head (head slot), or the body center (body/back).
export const GEAR = {
  hardhat: { name: "a hard hat", slot: "head", build: () => { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(0.42, 14, 8, 0, 6.29, 0, 1.57), mat(0xffc93a, 0.5), 0, 0, 0), mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 18), mat(0xffc93a, 0.5), 0, 0.02, 0)); return g; } },
  tophat: { name: "a top hat", slot: "head", build: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 14), mat(0x2b2340, 0.6), 0, 0.3, 0), mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 18), mat(0x2b2340, 0.6)), mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 14), mat(0xe8544a), 0, 0.1, 0)); return g; } },
  crown: { name: "a crown", slot: "head", build: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8, 1, true), mat(0xffd34a, 0.3, 0.2), 0, 0.12, 0)); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; g.add(mesh(new THREE.ConeGeometry(0.08, 0.22, 4), mat(0xffd34a, 0.3, 0.2), Math.cos(a) * 0.33, 0.32, Math.sin(a) * 0.33)); } return g; } },
  flowers: { name: "a flower crown", slot: "head", build: () => { const g = new THREE.Group(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; g.add(mesh(new THREE.IcosahedronGeometry(0.1, 0), mat([0xff9fb8, 0xffffff, 0xffd84a][i % 3]), Math.cos(a) * 0.34, 0.05, Math.sin(a) * 0.34)); } return g; } },
  goggles: { name: "builder goggles", slot: "face", build: () => { const g = new THREE.Group(); for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.14, 0.05, 6, 12), mat(0x5a4030), s * 0.18, 0, 0)); g.add(mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), mat(0x5a4030), 0, 0, -0.05)); return g; } },
  cape: { name: "a hero's cape", slot: "back", build: () => { const c = mesh(new THREE.BoxGeometry(0.9, 1.1, 0.05), mat(0xd8343a, 0.9)); c.position.set(0, -0.1, -0.1); c.rotation.x = 0.25; const g = new THREE.Group(); g.add(c); return g; } },
  backpack: { name: "a toolbox backpack", slot: "back", build: () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 0.3), mat(0x3f8fd0)), mesh(new THREE.BoxGeometry(0.5, 0.15, 0.32), mat(0xffc93a), 0, 0.2, 0)); return g; } },
  armor: { name: "shiny armor", slot: "body", build: () => { const g = new THREE.Group(); const a = mesh(new THREE.SphereGeometry(0.62, 14, 8, 0, 6.29, 0.9, 1.3), mat(0xc8d0dc, 0.25)); a.material.metalness = 0.6; g.add(a); return g; } },
  scarf: { name: "a cozy scarf", slot: "body", build: () => { const g = new THREE.Group(); g.add(mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 16), mat(0x2fa86a)), mesh(new THREE.BoxGeometry(0.16, 0.5, 0.06), mat(0x2fa86a), 0.2, -0.25, 0.4)); g.children[0].rotation.x = Math.PI / 2; return g; } }
};

/** Dress a creature (from models.creature): gear sits on its body, which faces +x. */
export function outfit(creature) {
  const A = creature.userData.anchor || { top: 2.4, mid: 1.4, front: 1, sy: 1 };
  const hx = A.headX || 0;
  const anchors = { head: [hx, A.top - 0.12, 0], face: [hx + (A.headX != null ? 0.5 : A.front * 0.92), A.headX != null ? A.top - 0.42 : A.mid + A.sy * 0.25, 0], back: [-A.front * 0.95, A.mid, 0], body: [0, A.mid, 0] };
  const scale = A.headX != null ? { head: 1.25, face: 1.1, back: 1.2, body: 1.2 } : { head: 1.5, face: 1.4, back: 1.3, body: 1.65 };
  const worn = {};
  return {
    wear(id) {
      const g = GEAR[id]; if (!g) return;
      if (worn[g.slot]) creature.remove(worn[g.slot]);
      const o = g.build(); o.position.set(...anchors[g.slot]); o.scale.setScalar(scale[g.slot]);
      o.rotation.y = Math.PI / 2; // gear is modeled facing +z; creatures face +x
      o.userData.id = id; creature.add(o); worn[g.slot] = o;
    },
    worn: () => Object.values(worn).map(o => o.userData.id)
  };
}

// ---------- Treasures ----------
export function makeTreasures(world, rng, count = 8) {
  const group = new THREE.Group(), list = [];
  const pool = Object.keys(GEAR).filter(k => k !== "hardhat").sort(() => rng() - 0.5).slice(0, count);
  for (const id of pool) {
    let x = 0, z = 0;
    for (let tries = 0; tries < 50; tries++) { const a = rng() * 6.28, r = 14 + rng() * 70; x = Math.cos(a) * r; z = Math.sin(a) * r; if (world.heightAt(x, z) > 0.6) break; }
    const g = new THREE.Group();
    const chest = mesh(new THREE.BoxGeometry(1, 0.7, 0.7), mat(0xb07a3a, 0.7)); chest.position.y = 0.35; g.add(chest);
    const lid = mesh(new THREE.BoxGeometry(1.05, 0.25, 0.75), mat(0xffc93a, 0.4, 0.3)); lid.position.y = 0.8; g.add(lid);
    const glow = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: 0xfff2a0 })); glow.position.y = 2; g.add(glow);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 8, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 4.5; g.add(beam);
    g.position.set(x, world.heightAt(x, z), z);
    group.add(g); list.push({ id, g, glow, x, z, found: false });
  }
  return {
    group, list,
    update(t) { for (const tr of list) if (!tr.found) { tr.glow.rotation.y = t * 2; tr.glow.position.y = 2 + Math.sin(t * 3 + tr.x) * 0.25; } },
    /** Returns the treasure the builder just reached, if any. */
    check(x, z) { for (const tr of list) if (!tr.found && Math.hypot(tr.x - x, tr.z - z) < 3.2) { tr.found = true; group.remove(tr.g); return tr; } return null; },
    left: () => list.filter(t => !t.found).length
  };
}

// ---------- Wandering creatures ----------
export function makeCritters(world, rng, makeBody, count = 16) {
  const group = new THREE.Group(), list = [];
  const colors = [0xffffff, 0xf2c98a, 0xb8a090, 0xff9fb8, 0x9fd0ff, 0xd0b8ff];
  for (let i = 0; i < count; i++) {
    let x = 0, z = 0;
    for (let tries = 0; tries < 40; tries++) { const a = rng() * 6.28, r = 12 + rng() * 75; x = Math.cos(a) * r; z = Math.sin(a) * r; if (world.heightAt(x, z) > 0.6) break; }
    const o = makeBody(colors[i % colors.length], rng);
    group.add(o);
    list.push({ o, x, z, h: rng() * 6.28, t: rng() * 3, hop: 0 });
  }
  return {
    group,
    update(dt, avoid) {
      for (const c of list) {
        c.t -= dt;
        if (c.t < 0) { c.t = 1.5 + rng() * 3; c.h += (rng() - 0.5) * 2.5; c.hop = 1; }
        // run from the builder if it gets close
        const dx = c.x - avoid.x, dz = c.z - avoid.z, d = Math.hypot(dx, dz);
        if (d < 5) c.h = Math.atan2(dx, dz);
        const sp = c.hop > 0 ? (d < 5 ? 6 : 2.2) : 0;
        const nx = c.x + Math.sin(c.h) * sp * dt, nz = c.z + Math.cos(c.h) * sp * dt;
        if (world.heightAt(nx, nz) > 0.4 && Math.hypot(nx, nz) < 95) { c.x = nx; c.z = nz; } else c.h += Math.PI;
        c.hop = Math.max(0, c.hop - dt * 1.6);
        c.o.position.set(c.x, world.heightAt(c.x, c.z) + Math.abs(Math.sin(c.hop * Math.PI * 3)) * 0.5, c.z);
        c.o.rotation.y = c.h;
      }
    }
  };
}
