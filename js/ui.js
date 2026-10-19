// Control panel (lil-gui). Each control simply writes into a state object that the
// kinematics / explode / camera modules read every frame.
import GUI from 'lil-gui';

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

  function refresh() {
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  return { gui, refresh };
}
