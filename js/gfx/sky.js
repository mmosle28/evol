// Summer sky: a gradient dome, drifting low-poly clouds, and sunlight that follows the time of day.
// t = 0 (morning) .. 0.5 (noon) .. 1 (dusk).

import { PAL } from "../core/palette.js";

const THREE = window.THREE;

const KEYS = [
  { t: 0.0, top: 0x6fb2e8, hor: 0xf3e6d8, sun: 0xffe2c2, sunI: 0.62 },
  { t: 0.35, top: 0x3f97e0, hor: 0xd8eef9, sun: 0xfff4e0, sunI: 0.72 },
  { t: 0.7, top: 0x4a8fd2, hor: 0xf6e3c0, sun: 0xffe0a8, sunI: 0.66 },
  { t: 0.9, top: 0x5a6fb8, hor: 0xffb48a, sun: 0xff9a6a, sunI: 0.55 },
  { t: 1.0, top: 0x2e3f7a, hor: 0xf08a7a, sun: 0xff7a5a, sunI: 0.4 }
];

function sampleKeys(t) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1];
    if (t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      const mix = (c1, c2) => new THREE.Color(c1).lerp(new THREE.Color(c2), k);
      return { top: mix(a.top, b.top), hor: mix(a.hor, b.hor), sun: mix(a.sun, b.sun), sunI: a.sunI + (b.sunI - a.sunI) * k };
    }
  }
  const z = KEYS[KEYS.length - 1];
  return { top: new THREE.Color(z.top), hor: new THREE.Color(z.hor), sun: new THREE.Color(z.sun), sunI: z.sunI };
}

export function makeSky(scene, rng, { radius = 300, clouds = 14, cloudHeight = 55 } = {}) {
  // Gradient dome
  const geo = new THREE.SphereGeometry(radius, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PAL.skyTop) }, hor: { value: new THREE.Color(PAL.skyHorizon) } },
    vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float h = clamp(vp.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(hor, top, pow(h, 0.8)), 1.0); }"
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);

  // Lights
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xb8b2a6, 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PAL.sun, 1.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const s = 70;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 300 });
  sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  // Big puffy low-poly clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 });
  const cloudGroup = new THREE.Group();
  for (let i = 0; i < clouds; i++) {
    const c = new THREE.Group();
    const puffs = 4 + Math.floor(rng() * 4);
    for (let j = 0; j < puffs; j++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + rng() * 6, 0), cloudMat);
      p.position.set((j - puffs / 2) * 5 + rng() * 3, rng() * 4, rng() * 4);
      c.add(p);
    }
    const a = rng() * Math.PI * 2, d = 90 + rng() * 120;
    c.position.set(Math.cos(a) * d, cloudHeight + rng() * 30, Math.sin(a) * d);
    c.scale.setScalar(1 + rng() * 1.2);
    c.userData.speed = 0.6 + rng() * 0.8;
    cloudGroup.add(c);
  }
  scene.add(cloudGroup);
  scene.fog = new THREE.Fog(PAL.skyHorizon, 110, 300);

  return {
    sun, hemi, dome,
    /** Set the time of day and keep the sun's shadow box centered on `focus`. */
    setTime(t, focus) {
      const k = sampleKeys(Math.max(0, Math.min(1, t)));
      mat.uniforms.top.value.copy(k.top); mat.uniforms.hor.value.copy(k.hor);
      scene.fog.color.copy(k.hor);
      sun.color.copy(k.sun); sun.intensity = k.sunI;
      const ang = Math.PI * (0.15 + t * 0.7); // sun crosses the sky as the day passes
      const fx = focus ? focus.x : 0, fz = focus ? focus.z : 0;
      sun.position.set(fx + Math.cos(ang) * 80, 20 + Math.sin(ang) * 70, fz + 40);
      sun.target.position.set(fx, 0, fz);
      dome.position.set(fx, 0, fz);
    },
    update(dt) {
      for (const c of cloudGroup.children) { c.position.x += c.userData.speed * dt; if (c.position.x > 220) c.position.x = -220; }
    }
  };
}
