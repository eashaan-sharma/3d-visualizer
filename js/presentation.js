// Presentation helpers: camera presets, hide UI, and the global reset.
import { DEFAULT_LIVERY } from './car/materials.js';

// Eye position and look-at point in meters. "up" overrides the camera's up direction
// (needed for the top view, where the usual +Y up would point straight at the camera).
export const PRESETS = {
  Front: { key: '1', position: [6.8, 1.15, 0], target: [0.4, 0.4, 0] },
  Side: { key: '2', position: [0.2, 0.9, 9.2], target: [0.2, 0.42, 0] },
  Top: { key: '3', position: [0.2, 10.5, 0], target: [0.2, 0, 0], up: [1, 0, 0] },
  'Rear 3/4': { key: '4', position: [-5.0, 2.0, 4.4], target: [-0.5, 0.4, 0] },
  Cockpit: { key: '5', position: [-0.25, 1.04, 0], target: [3.0, 0.5, 0] }, // just above and behind the helmet
};

export function createActions(app) {
  function preset(name) {
    app.arcball.state.autoRotate = false;
    app.arcball.animateTo(PRESETS[name]);
  }

  function setUIHidden(hidden) {
    document.body.classList.toggle('ui-hidden', hidden);
  }

  // Everything back to how the page started (performance mode and the FPS counter are
  // machine settings, so they are kept).
  function resetScene() {
    app.models.showCar();
    app.kinematics.reset();
    app.explode.reset();
    Object.assign(app.arcball.state, { autoRotate: false, autoRotateSpeed: 12, showSphere: false });
    app.arcball.reset();
    Object.assign(app.display.state, { mode: 'Solid', pivots: false });
    app.display.apply();
    app.selection.select(null);
    app.car.materials.paint.color.set(DEFAULT_LIVERY);
    app.ui.look.livery = DEFAULT_LIVERY;
    setUIHidden(false);
  }

  function resetAll() {
    app.tour.stop();
    resetScene();
    app.ui.refresh();
  }

  return { preset, resetScene, resetAll, toggleUI: () => setUIHidden(!document.body.classList.contains('ui-hidden')) };
}
