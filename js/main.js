// Entry point: builds the stage and the car, wires up the modules, runs the render loop.
import { createStage } from './scene.js';
import { buildCar } from './car/buildCar.js';
import { updateRig } from './car/rig.js';
import { createKinematics } from './kinematics.js';
import { createExplode } from './explode.js';
import { createArcball } from './arcball.js';
import { createSelection } from './selection.js';
import { createMatrixPanel, createTreePanel } from './panels.js';
import { createDisplayModes } from './displayModes.js';
import { createModelViewer } from './models.js';
import { createActions } from './presentation.js';
import { createTour } from './tour.js';
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
app.activeRoot = car.root; // what the picker and tree show (M8 swaps in loaded .obj models)
app.selection = createSelection({ camera: stage.camera, dom: stage.renderer.domElement, getRoot: () => app.activeRoot });
const matrixPanel = createMatrixPanel(document.getElementById('matrix-panel'));
app.tree = createTreePanel(document.getElementById('tree-panel'), (node) => app.selection.select(node));
app.tree.build(car.root);
app.selection.onChange((node) => { matrixPanel.show(node); app.tree.highlight(node); });
app.display = createDisplayModes(stage.scene);
app.display.setRoot(car.root);
app.models = createModelViewer(app, document.getElementById('model-info'));
app.actions = createActions(app);
app.tour = createTour(app, document.getElementById('tour'));
app.ui = createUI(app);

// Click a panel's title bar to fold it away.
for (const title of document.querySelectorAll('.panel-title')) {
  title.addEventListener('click', () => title.parentElement.classList.toggle('collapsed'));
}

let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1); // seconds since last frame, clamped after tab switches
  last = now;
  app.kinematics.update(dt);
  app.explode.update(dt);
  updateRig(car.root, app.explode.state.amount);
  app.arcball.update(dt);
  stage.scene.updateMatrixWorld(); // world = parent x local for every node, so the panel reads fresh values
  matrixPanel.update(dt);
  app.display.update();
  stage.renderer.render(stage.scene, stage.camera);
}
stage.renderer.setAnimationLoop(tick);

// Exposed for debugging in the browser console.
window.app = app;
