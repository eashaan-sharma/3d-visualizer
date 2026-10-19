// Forward kinematics: we choose joint angles, and the scene graph works out where every part
// ends up (world = parent x local, all the way down the tree). Nothing here moves a part in
// world space directly; we only change angles in each part's local Joint matrix.
import { WHEEL_R } from './car/dims.js';

export const STEERING_RATIO = 4.5;          // steering wheel turns 4.5x more than the road wheels
const DRS_OPEN = 0.45;                      // radians the DRS flap lifts when open
const DEG = Math.PI / 180;

export const KINEMATICS_DEFAULTS = {
  steer: 0,          // degrees, + = right turn
  drive: false,
  speed: 12,         // km/h (kept low so the eye can follow the wheel covers)
  drs: false,
  flap: 0,           // degrees, + = more angle of attack (trailing edge up)
  wrongOrder: false,
};

export function createKinematics(parts) {
  const joint = (partName, jointName) => parts[partName].userData.rig.joints.find((j) => j.name === jointName);
  const j = {
    uprights: ['FL upright', 'FR upright'].map((n) => joint(n, 'steer')),
    frontSpin: ['FL wheel', 'FR wheel'].map((n) => joint(n, 'spin')),
    frontWrong: ['FL wheel', 'FR wheel'].map((n) => joint(n, 'steerWrong')),
    rearSpin: ['RL wheel', 'RR wheel'].map((n) => joint(n, 'spin')),
    steeringWheel: joint('Steering wheel', 'steer'),
    drs: joint('DRS flap', 'drs'),
    flap: joint('Front wing flap', 'flap'),
  };

  const state = { ...KINEMATICS_DEFAULTS };
  let wheelAngle = 0;
  let drsAngle = 0;

  function update(dt) {
    // Rolling without slipping: angular speed (rad/s) = linear speed (m/s) / radius (m).
    // A negative angle about the axle (+Z) rolls the wheel forward (+X).
    if (state.drive) wheelAngle -= (state.speed / 3.6 / WHEEL_R) * dt;

    // Steering: +Y rotation turns the car left, so a right turn is a negative yaw.
    const steer = -state.steer * DEG;
    for (let i = 0; i < 2; i++) {
      if (state.wrongOrder) {
        // Wrong: upright stays straight and the wheel does steer-then-spin in its own matrix.
        j.uprights[i].angle = 0;
        j.frontWrong[i].angle = steer;
      } else {
        // Right: the upright steers, and the wheel spins inside the steered frame.
        j.uprights[i].angle = steer;
        j.frontWrong[i].angle = 0;
      }
      j.frontSpin[i].angle = wheelAngle;
      j.rearSpin[i].angle = wheelAngle;
    }
    // The steering wheel turns about its column; clockwise (as the driver sees it) for a right turn.
    j.steeringWheel.angle = state.steer * DEG * STEERING_RATIO;

    // DRS eases toward its target each frame (exponential smoothing, frame-rate independent).
    const target = state.drs ? DRS_OPEN : 0;
    drsAngle += (target - drsAngle) * (1 - Math.exp(-8 * dt));
    j.drs.angle = drsAngle;

    // Front flap pivots at its leading edge: trailing edge up = negative rotation about +Z.
    j.flap.angle = -state.flap * DEG;
  }

  function reset() {
    Object.assign(state, KINEMATICS_DEFAULTS);
    wheelAngle = 0;
    drsAngle = 0;
    update(0);
  }

  return { state, update, reset };
}
