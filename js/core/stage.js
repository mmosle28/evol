// The 3D stage: one WebGL renderer shared by every scene. A scene sets `stage.view = { scene, camera }`
// and the game loop renders it. Also projects 3D points to overlay coordinates and takes snapshots.

import { W, H } from "./draw.js";

const THREE = window.THREE;

export const stage = {
  renderer: null,
  view: null, // { scene, camera }
  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      this.renderer.setSize(r.width, r.height, false);
      if (this.view) { this.view.camera.aspect = r.width / r.height; this.view.camera.updateProjectionMatrix(); }
    };
    window.addEventListener("resize", resize);
    this.resize = resize;
    resize();
  },
  render() {
    if (!this.view) return;
    const c = this.view.camera, r = this.renderer.domElement.getBoundingClientRect();
    if (Math.abs(c.aspect - r.width / r.height) > 0.01) { c.aspect = r.width / r.height; c.updateProjectionMatrix(); }
    this.renderer.render(this.view.scene, c);
  },
  /** 3D world point -> overlay pixel (1280x720). Returns null if behind the camera. */
  toScreen(v3) {
    if (!this.view) return null;
    const p = v3.clone().project(this.view.camera);
    if (p.z > 1) return null;
    return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H };
  },
  /** Render once and return a small JPEG of the view (used for the diary's photo of the day). */
  snapshot() {
    this.render();
    try { return this.renderer.domElement.toDataURL("image/jpeg", 0.8); } catch (e) { return null; }
  }
};

/** A perspective camera sized to the stage. */
export function makeCamera(fov = 50) {
  const r = stage.renderer.domElement.getBoundingClientRect();
  return new THREE.PerspectiveCamera(fov, r.width / Math.max(1, r.height), 0.1, 600);
}
