// Wheels, front uprights (the steering knuckles) and the steering wheel.
//
// Front corner hierarchy:  Chassis -> FL upright (joint: steer about Y) -> FL wheel (joint: spin about Z)
// Rear corner:             Chassis -> RL wheel (joint: spin about Z)
// Because the wheel is a CHILD of the upright, steering turns the wheel's spin axis with it.
import * as THREE from 'three';
import { addJoint } from './rig.js';
import { plate } from './shapes.js';
import { FRONT_AXLE_X, REAR_AXLE_X, WHEEL_R, RIM_R, FRONT_TRACK, REAR_TRACK, FRONT_TYRE_W, REAR_TYRE_W, KINGPIN } from './dims.js';

// One wheel built in its own frame: center at the origin, axle along Z, outer face toward +Z.
function makeWheel(mats, width) {
  const g = new THREE.Group();
  const h = width / 2;
  // Tyre cross-section (radius, axial position), swept 360° around the axle by LatheGeometry.
  const profile = [
    [RIM_R, -h + 0.015], [0.27, -h + 0.002], [0.31, -h], [0.34, -h + 0.012], [0.356, -h + 0.035], [WHEEL_R, -h + 0.07],
    [WHEEL_R, h - 0.07], [0.356, h - 0.035], [0.34, h - 0.012], [0.31, h], [0.27, h - 0.002], [RIM_R, h - 0.015],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 56).rotateX(Math.PI / 2), mats.tyre));

  // Coloured sidewall bands, both sides.
  for (const s of [-1, 1]) {
    const band = new THREE.RingGeometry(0.295, 0.315, 56);
    if (s < 0) band.rotateY(Math.PI);
    g.add(new THREE.Mesh(band.translate(0, 0, (h + 0.0015) * s), mats.tyreBand));
  }
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(RIM_R, RIM_R, width - 0.03, 48, 1, true).rotateX(Math.PI / 2), mats.rimInside));

  // Wheel cover (2022 rule) with an asymmetric pattern so you can see it spin.
  g.add(new THREE.Mesh(new THREE.CircleGeometry(RIM_R + 0.004, 48).translate(0, 0, h - 0.012), mats.carbon));
  for (let i = 0; i < 3; i++) {
    const arc = new THREE.RingGeometry(0.15, 0.2, 16, 1, (i * 2 * Math.PI) / 3, 0.8);
    g.add(new THREE.Mesh(arc.translate(0, 0, h - 0.009), i === 0 ? mats.white : mats.paint));
  }
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20).rotateX(Math.PI / 2).translate(0, 0, h - 0.004), mats.metal));
  return g;
}

export function buildCorners({ mats, part, mesh, local }, chassis) {

  for (const [side, s] of [['L', -1], ['R', 1]]) {
    // Front: the upright pivots about the kingpin, which sits inboard of the wheel center,
    // so the wheel swings on a short arm when it steers (like a real car).
    const upright = part(chassis, `F${side} upright`, [FRONT_AXLE_X, WHEEL_R, KINGPIN * s], { explodeDir: [0, 0, s], explodeDist: 0.45 });
    addJoint(upright, 'steer', 'y');
    mesh(upright, new THREE.CylinderGeometry(0.17, 0.17, 0.13, 32).rotateX(Math.PI / 2).translate(FRONT_AXLE_X, WHEEL_R, 0.665 * s), mats.carbon);
    mesh(upright, new THREE.BoxGeometry(0.08, 0.42, 0.05).translate(FRONT_AXLE_X, WHEEL_R, 0.63 * s), mats.metal);
    // Wheel winglet: a low curved fairing hugging the top of the tyre, held by a thin web from
    // the brake drum. It steers with the wheel (child of the upright) but does not spin.
    // An open cylinder slice around the axle: theta = PI is straight up after rotateX.
    const arc = 0.95;
    mesh(upright, new THREE.CylinderGeometry(WHEEL_R + 0.022, WHEEL_R + 0.022, 0.15, 20, 1, true, Math.PI - arc * 0.6, arc)
      .rotateX(Math.PI / 2).translate(FRONT_AXLE_X, WHEEL_R, 0.745 * s), mats.carbonShell);
    mesh(upright, new THREE.RingGeometry(0.17, WHEEL_R + 0.024, 20, 1, Math.PI / 2 - arc * 0.4, arc)
      .translate(FRONT_AXLE_X, WHEEL_R, 0.668 * s), mats.carbonShell);

    const fw = part(upright, `F${side} wheel`, [FRONT_AXLE_X, WHEEL_R, FRONT_TRACK * s], { explodeDir: [0, 0, s], explodeDist: 0.55 });
    addJoint(fw, 'spin', 'z');
    // Only used by the "wrong transform order" demo: steering placed AFTER spin in the list,
    // so local = R_spin x R_steer (steer applied first, then spun about the fixed axle).
    addJoint(fw, 'steerWrong', 'y');
    const frontWheel = makeWheel(mats, FRONT_TYRE_W);
    if (s < 0) frontWheel.rotation.y = Math.PI; // flip so the cover faces outward on the left
    local(fw, frontWheel);

    const rw = part(chassis, `R${side} wheel`, [REAR_AXLE_X, WHEEL_R, REAR_TRACK * s], { explodeDir: [0, 0, s], explodeDist: 0.95 });
    addJoint(rw, 'spin', 'z');
    const rearWheel = makeWheel(mats, REAR_TYRE_W);
    if (s < 0) rearWheel.rotation.y = Math.PI;
    local(rw, rearWheel);
  }

  // Steering wheel: built directly in its own frame. Its base rotation tilts the column
  // (a non-zero R in T x R x S), and the steer joint turns it about the column (local X).
  const wheel = part(chassis, 'Steering wheel', [0.40, 0.63, 0], { rotation: [0, 0, 0.3], explodeDir: [0, 1, 0], explodeDist: 0.9 });
  addJoint(wheel, 'steer', 'x');
  const body = plate([[-0.13, -0.05], [0.13, -0.05], [0.14, 0.03], [0.07, 0.07], [-0.07, 0.07], [-0.14, 0.03]], 0.03, 0, { smooth: true, bevel: 0.006 });
  local(wheel, new THREE.Mesh(body.rotateY(Math.PI / 2), mats.carbon));
  for (const s of [-1, 1]) {
    local(wheel, new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.07, 4, 12).translate(0, 0, 0.135 * s), mats.matte));
  }
  local(wheel, new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.045).rotateY(-Math.PI / 2).translate(-0.027, 0.01, 0), mats.screen));
  local(wheel, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25).rotateZ(Math.PI / 2).translate(0.13, 0, 0), mats.metal));
}
