// Entry point: builds the stage and the car, then runs the render loop.
import { createStage } from './scene.js';
import { buildCar } from './car/buildCar.js';
import { updateRig } from './car/rig.js';

const stage = createStage(document.getElementById('viewport'));
const car = buildCar();
stage.scene.add(car.root);

// Temporary slow turntable so the car can be inspected before the arcball exists (M5).
let angle = 0.75;
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1); // seconds since last frame, clamped after tab switches
  last = now;
  angle += dt * 0.15;
  stage.camera.position.set(Math.cos(angle) * 6.6, 2.2, Math.sin(angle) * 6.6);
  stage.camera.lookAt(0, 0.35, 0);
  updateRig(car.root, 0);
  stage.renderer.render(stage.scene, stage.camera);
}
stage.renderer.setAnimationLoop(tick);

// Exposed for debugging in the browser console.
window.app = { stage, car };
