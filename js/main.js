// Entry point: builds the stage and the car, wires up the modules, runs the render loop.
import { createStage } from './scene.js';
import { buildCar } from './car/buildCar.js';
import { updateRig } from './car/rig.js';
import { createKinematics } from './kinematics.js';
import { createExplode } from './explode.js';
import { createArcball } from './arcball.js';
import { createUI } from './ui.js';

const stage = createStage(document.getElementById('viewport'));
const car = buildCar();
stage.scene.add(car.root);

const app = {
  stage,
  car,
  kinematics: createKinematics(car.parts),
  explode: createExplode(),
  arcball: createArcball({ camera: stage.camera, dom: stage.renderer.domElement, overlay: document.getElementById('arcball-overlay') }),
};
app.ui = createUI(app);

let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1); // seconds since last frame, clamped after tab switches
  last = now;
  app.kinematics.update(dt);
  app.explode.update(dt);
  updateRig(car.root, app.explode.state.amount);
  app.arcball.update(dt);
  stage.renderer.render(stage.scene, stage.camera);
}
stage.renderer.setAnimationLoop(tick);

// Exposed for debugging in the browser console.
window.app = app;
