// A tiny planet you can walk all the way around. Ground is a felt patchwork (flat-shaded triangles in
// two biome colors with a stitched-fabric texture), props and characters stand on the surface.
// The player always stays on top; the planet turns underneath them.

import { BIOMES, prop } from "./biomes.js";

const THREE = window.THREE;
const UP = new THREE.Vector3(0, 1, 0);

let feltTex = null;
/** Felt fabric texture: speckled fibers plus a dashed stitch line, generated once. */
export function felt() {
  if (feltTex) return feltTex;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) { const v = 215 + Math.random() * 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1); }
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 2; g.setLineDash([6, 5]);
  g.strokeRect(4, 4, 120, 120);
  feltTex = new THREE.CanvasTexture(c); feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping; feltTex.repeat.set(6, 6);
  return feltTex;
}

function makeNoise(rng) {
  const waves = Array.from({ length: 6 }, () => ({ d: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), f: 1.5 + rng() * 4, p: rng() * 6.28 }));
  return v => waves.reduce((s, w) => s + Math.sin(v.dot(w.d) * w.f + w.p), 0) / waves.length;
}

export function makePlanet(key, rng, { R = 20, detail = 4, spots = [], propScale = R / 20, density = 1 } = {}) {
  const biome = BIOMES[key];
  const group = new THREE.Group();
  const noise = makeNoise(rng);
  const amp = R * 0.018;
  const heightAt = dir => R + noise(dir) * amp;

  // Ground: patchwork felt
  const geo = new THREE.IcosahedronGeometry(R, detail);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); v.multiplyScalar(heightAt(v)); pos.setXYZ(i, v.x, v.y, v.z); }
  const colors = new Float32Array(pos.count * 3), c1 = new THREE.Color(biome.ground[0]), c2 = new THREE.Color(biome.ground[1]), col = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const m = a.add(b).add(c).normalize();
    const k = noise(m.clone().multiplyScalar(2.3)) > 0 ? 1 : 0;
    col.copy(c1).lerp(c2, k).offsetHSL(0, 0, (rng() - 0.5) * 0.04);
    for (let j = 0; j < 3; j++) colors.set([col.r, col.g, col.b], (i + j) * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, map: felt() }));
  ground.receiveShadow = true;
  group.add(ground);

  const api = {
    group, R, biome, key, heightAt,
    /** Stand an object on the surface at a direction (planet-local), turned by heading. */
    place(obj, dir, heading = 0, lift = -0.05) {
      const d = dir.clone().normalize();
      obj.position.copy(d).multiplyScalar(heightAt(d) + lift);
      obj.quaternion.setFromUnitVectors(UP, d);
      if (heading) obj.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, heading));
      if (obj.parent !== group) group.add(obj);
      obj.userData.dir = d;
      return obj;
    },
    /** A random surface direction at least `gap` radians away from every reserved spot. */
    freeDir(gap = 0.22, tries = 40) {
      let best = null;
      for (let i = 0; i < tries; i++) {
        const d = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
        if (spots.every(s => s.angleTo(d) > gap)) { best = d; break; }
        best = d;
      }
      return best;
    },
    reserve(d) { spots.push(d); },
    update(dt) { if (parts) { parts.rotation.y += dt * 0.03; parts.rotation.x += dt * 0.012; } }
  };

  // Props
  for (const [name, count] of biome.props) {
    for (let i = 0; i < Math.round(count * density); i++) {
      const d = api.freeDir(name === "flower" ? 0.08 : 0.2 * 20 / R * propScale);
      const p = prop(name, rng);
      p.scale.multiplyScalar(propScale * (0.85 + rng() * 0.35));
      api.place(p, d, rng() * 6.28, name === "pond" || name === "pool" ? 0.02 : -0.1);
      if (name !== "flower") api.reserve(d);
    }
  }

  // Floating particles in a shell around the planet (fireflies, leaves, dust)
  let parts = null;
  if (biome.particles) {
    const N = 160, arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const d = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize().multiplyScalar(R + 1 + rng() * R * 0.35); arr.set([d.x, d.y, d.z], i * 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    parts = new THREE.Points(pg, new THREE.PointsMaterial({ color: biome.particles.color, size: R * 0.018, transparent: true, opacity: 0.85 }));
    group.add(parts);
  }
  return api;
}

/** Sky for a world: gradient dome, stars and a moon at night, warm light. Returns the lights. */
export function worldSky(scene, key, { radius = 400 } = {}) {
  const biome = BIOMES[key];
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(biome.sky[0]) }, hor: { value: new THREE.Color(biome.sky[1]) } },
    vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float h = clamp(vp.y*0.5+0.5, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, smoothstep(0.25, 0.95, h)), 1.0); }"
  }));
  scene.add(dome);
  // Stars everywhere (dim in daytime biomes so space still feels like space)
  const N = 500, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(radius * 0.9); arr.set([d.x, d.y, d.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: biome.night ? 0.9 : 0.25 })));
  if (biome.night) { const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff4c8 })); moon.position.set(-120, 150, -220); scene.add(moon); }

  const hemi = new THREE.HemisphereLight(biome.night ? 0xb0a0ff : 0xffffff, biome.ground[0], biome.night ? 0.75 : 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(biome.night ? 0xc8b8ff : 0xfff0dc, biome.night ? 0.55 : 0.75);
  sun.position.set(30, 60, 25); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
  scene.add(sun); scene.add(sun.target);
  return { hemi, sun };
}
