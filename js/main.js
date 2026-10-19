// Entry point: builds the stage and the car, wires up the modules, runs the render loop.
import { createStage } from './scene.js';
import { buildCar } from './car/buildCar.js';
import { updateRig } from './car/rig.js';
import { createKinematics } from './kinematics.js';
import { createUI } from './ui.js';

const stage = createStage(document.getElementById('viewport'));
const car = buildCar();
stage.scene.add(car.root);

const app = { stage, car, kinematics: createKinematics(car.parts) };
app.ui = createUI(app);

let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1); // seconds since last frame, clamped after tab switches
  last = now;
  app.kinematics.update(dt);
  updateRig(car.root, 0);
  stage.renderer.render(stage.scene, stage.camera);
}
stage.renderer.setAnimationLoop(tick);

// Exposed for debugging in the browser console.
window.app = app;
