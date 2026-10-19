// Control panel (lil-gui) and keyboard shortcuts. Each control simply writes into a state
// object that the kinematics / explode / camera / display modules read every frame.
import GUI from 'lil-gui';
import { MODES } from './displayModes.js';
import { DEFAULT_LIVERY } from './car/materials.js';
import { CAR, SAMPLES } from './models.js';
import { exportOBJ } from './objExporter.js';
import { PRESETS } from './presentation.js';

const RIGGING_TIP = 'An .obj file stores geometry only: vertices, normals, faces and named groups. '
  + 'It has no place for the scene graph (parent/child links), pivots or joint axes. That rigging lives in our code, '
  + 'so after a reload the parts come back as static pieces that cannot steer, spin or explode.';

// Save text as a file through the browser's normal download.
function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // give the browser time to start the download
}

export function createUI(app) {
  const gui = new GUI({ title: 'Controls', width: 340 });
  const k = app.kinematics.state;
  const arc = app.arcball.state;
  const look = { livery: DEFAULT_LIVERY };

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
  cam.add(arc, 'autoRotate').name('Auto-rotate (A)').listen();
  cam.add(arc, 'autoRotateSpeed', 2, 60, 1).name('Rotate speed (°/s)');
  cam.add(arc, 'showSphere').name('Show arcball sphere');
  cam.add({ reset: () => { arc.autoRotate = false; app.arcball.reset(); } }, 'reset').name('Reset view');
  // Any drag, scroll or pan pauses the turntable; only A (or the checkbox) restarts it.
  app.arcball.onInteract = () => { arc.autoRotate = false; };

  const views = gui.addFolder('Camera views (1-5)').close();
  for (const [name, p] of Object.entries(PRESETS)) {
    views.add({ go: () => app.actions.preset(name) }, 'go').name(`${name} (${p.key})`);
  }

  const disp = gui.addFolder('Display').close();
  const d = app.display.state;
  disp.add(d, 'mode', MODES).name('Mode').onChange(() => app.display.apply());
  disp.add(d, 'pivots').name('Show pivots').onChange(() => app.display.apply());
  disp.addColor(look, 'livery').name('Livery colour').onChange((c) => app.car.materials.paint.color.set(c));

  const mdl = gui.addFolder('Model (.obj)').close();
  mdl.add(app.models.state, 'model', [CAR, ...Object.keys(SAMPLES)]).name('Show').onChange((v) => app.models.choose(v));
  const exp = mdl.add({ exportCar: () => download(exportOBJ(app.car.root), 'f1-car.obj') }, 'exportCar').name('Export car as .obj');
  const rel = mdl.add({ reload: () => { app.models.reimportCar(); refresh(); } }, 'reload').name('Reload exported car');
  for (const c of [exp, rel]) c.domElement.title = RIGGING_TIP;
  mdl.add({ hint: 'or drop an .obj file on the page' }, 'hint').name('Tip').disable();

  const pres = gui.addFolder('Presentation').close();
  pres.add({ tour: () => toggleTour() }, 'tour').name('Guided tour (T)');
  pres.add({ reset: () => app.actions.resetAll() }, 'reset').name('Reset everything (R)');
  pres.add({ hide: () => app.actions.toggleUI() }, 'hide').name('Hide UI (H)');

  function refresh() {
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  function toggleTour() {
    if (app.tour.active) app.actions.resetAll();
    else app.tour.start();
  }

  // Keyboard shortcuts. Ignored while typing in a text field.
  const keys = {
    r: () => app.actions.resetAll(),
    p: () => app.explode.pitStop(),
    d: () => { k.drive = !k.drive; },
    a: () => { arc.autoRotate = !arc.autoRotate; },
    t: toggleTour,
    h: () => app.actions.toggleUI(),
    arrowright: () => app.tour.active && app.tour.next(),
    arrowleft: () => app.tour.active && app.tour.back(),
    escape: () => app.tour.active && app.actions.resetAll(),
  };
  for (const [name, p] of Object.entries(PRESETS)) keys[p.key] = () => app.actions.preset(name);

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select')) return;
    const action = keys[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    action();
    refresh();
  });

  return { gui, refresh, look };
}
