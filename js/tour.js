// Guided tour: steps through the concepts in presentation order. Each step starts from a clean
// scene, sets up exactly what it demonstrates, and shows a short caption.
import { PRESETS } from './presentation.js';

const STEPS = [
  {
    title: 'Scene graph',
    text: 'The car is a tree of 24 parts with Chassis at the root. Each node has its own pivot (the small axes). Move a parent and all of its children follow.',
    enter(app) {
      app.display.state.pivots = true;
      app.display.apply();
      app.arcball.animateTo(PRESETS['Rear 3/4']);
      app.arcball.state.autoRotate = true;
    },
  },
  {
    title: 'Model transforms',
    text: 'Every node stores a local matrix, local = T × R × S. Its world matrix is parent.world × local, multiplied down the chain: World = Chassis × FL upright × FL wheel.',
    enter(app) {
      app.kinematics.state.steer = -15;
      app.selection.select(app.car.parts['FL wheel']);
      app.arcball.animateTo({ position: [4.2, 1.5, -3.4], target: [1.5, 0.35, -0.5] });
    },
  },
  {
    title: 'Forward kinematics',
    text: 'We only choose joint angles: the uprights yaw to steer, the steering wheel turns 4.5× as far, the wheels spin at speed ÷ radius, and the DRS flap hinges open. The scene graph works out where every part ends up.',
    enter(app) {
      Object.assign(app.kinematics.state, { drive: true, steer: 18, drs: true, flap: 8 });
      app.arcball.animateTo({ position: [5.4, 1.9, 4.6], target: [0.4, 0.35, 0] });
    },
  },
  {
    title: 'Wrong transform order',
    text: 'Same two rotations, swapped: wheel = R_spin × R_steer instead of R_steer × R_spin. The steered wheel is spun about the unsteered axle, so it wobbles. Matrix multiplication is not commutative.',
    enter(app) {
      Object.assign(app.kinematics.state, { drive: true, steer: 20, wrongOrder: true });
      app.arcball.animateTo(PRESETS.Front);
    },
  },
  {
    title: 'Exploded view / pit stop',
    text: 'local = Base × Explode × Joint. The explode slide sits between the placement and the joint, so the wheels keep spinning and steering while they are pulled off. Press P to run it again.',
    enter(app) {
      Object.assign(app.kinematics.state, { drive: true, steer: 15 });
      app.explode.pitStop();
      app.arcball.animateTo({ position: [6.2, 3.6, 6.4], target: [0, 0.5, 0] });
    },
  },
  {
    title: 'Arcball',
    text: 'Drag to rotate. The mouse point is lifted onto a virtual sphere, and the turn from p0 to p1 becomes the quaternion q = [p0 · p1, p0 × p1], which rotates by twice the arc. Scroll to zoom, right-drag to pan.',
    enter(app) {
      app.arcball.state.showSphere = true;
    },
  },
  {
    title: 'Object loader and rigging',
    text: 'The car was exported to .obj and loaded back with the hand-written parser. All 24 parts return by name, but as a flat list with no pivots and no joints: .obj stores geometry, not rigging.',
    enter(app) {
      app.models.reimportCar();
    },
  },
];

export function createTour(app, el) {
  let index = -1;
  el.innerHTML = `
    <div class="tour-step"></div>
    <h2 class="tour-title"></h2>
    <p class="tour-text"></p>
    <div class="tour-buttons">
      <button type="button" data-go="-1">◀ Back</button>
      <button type="button" data-go="1">Next ▶</button>
      <button type="button" data-go="exit">Exit (Esc)</button>
    </div>`;
  el.querySelector('.tour-buttons').addEventListener('click', (e) => {
    const go = e.target.dataset.go;
    if (go === 'exit') app.actions.resetAll();
    else if (go) show(index + Number(go));
  });

  function show(i) {
    if (i < 0 || i >= STEPS.length) return;
    index = i;
    const step = STEPS[i];
    app.actions.resetScene();
    step.enter(app);
    app.ui.refresh();
    el.querySelector('.tour-step').textContent = `Step ${i + 1} of ${STEPS.length}`;
    el.querySelector('.tour-title').textContent = step.title;
    el.querySelector('.tour-text').textContent = step.text;
    el.querySelector('[data-go="-1"]').disabled = i === 0;
    el.querySelector('[data-go="1"]').disabled = i === STEPS.length - 1;
    el.hidden = false;
  }

  return {
    start: () => show(0),
    stop() { index = -1; el.hidden = true; },
    next: () => show(index + 1),
    back: () => show(index - 1),
    get active() { return index >= 0; },
  };
}
