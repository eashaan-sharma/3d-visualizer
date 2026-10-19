// Control panel (lil-gui). Each control simply writes into a state object that the
// kinematics / explode / camera modules read every frame.
import GUI from 'lil-gui';
import { MODES } from './displayModes.js';
import { DEFAULT_LIVERY } from './car/materials.js';

export function createUI(app) {
  const gui = new GUI({ title: 'Controls', width: 330 });
  const k = app.kinematics.state;

  const kin = gui.addFolder('Forward kinematics');
  kin.add(k, 'steer', -25, 25, 0.5).name('Steering angle (°)');
  kin.add(k, 'drive').name('Drive (D)');
  kin.add(k, 'speed', 1, 30, 1).name('Speed (km/h)');
  kin.add(k, 'drs').name('DRS open');
  kin.add(k, 'flap', -10, 15, 0.5).name('Front flap angle (°)');
  kin.add(k, 'wrongOrder').name('Wrong transform order').onChange((on) => {
    // The mistake only shows while the wheel is both steered and spinning.
    if (on && k.steer === 0) k.steer = 20;
    if (on) k.drive = true;
    refresh();
  });

  const ex = gui.addFolder('Exploded view');
  // listen() re-reads the value every frame so the slider follows the pit stop animation.
  ex.add(app.explode.state, 'amount', 0, 1, 0.01).name('Explode').listen().onChange(() => app.explode.cancel());
  ex.add({ pit: () => app.explode.pitStop() }, 'pit').name('Pit stop! (P)');

  const cam = gui.addFolder('Camera (arcball)');
  const arc = app.arcball.state;
  cam.add(arc, 'autoRotate').name('Auto-rotate (A)').listen();
  cam.add(arc, 'autoRotateSpeed', 2, 60, 1).name('Rotate speed (°/s)');
  cam.add(arc, 'showSphere').name('Show arcball sphere');
  cam.add({ reset: () => { arc.autoRotate = false; app.arcball.reset(); } }, 'reset').name('Reset view');
  // Any drag, scroll or pan pauses the turntable; only A (or the checkbox) restarts it.
  app.arcball.onInteract = () => { arc.autoRotate = false; };

  const disp = gui.addFolder('Display');
  const d = app.display.state;
  disp.add(d, 'mode', MODES).name('Mode').onChange(() => app.display.apply());
  disp.add(d, 'pivots').name('Show pivots').onChange(() => app.display.apply());
  const paint = app.car.materials.paint;
  const look = { livery: DEFAULT_LIVERY };
  disp.addColor(look, 'livery').name('Livery colour').onChange((c) => paint.color.set(c));

  function refresh() {
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  // Keyboard shortcuts. Ignored while typing in a text field.
  const keys = {
    a: () => { arc.autoRotate = !arc.autoRotate; },
    d: () => { k.drive = !k.drive; },
    p: () => app.explode.pitStop(),
  };
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select')) return;
    const action = keys[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    action();
    refresh();
  });

  return { gui, refresh };
}
