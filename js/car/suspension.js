// Suspension: double wishbones at each corner, push rods at the front and pull rods at the rear
// (the layout the 2022 Ferrari used), plus the steering track rods and rear toe links.
// Each corner is one part so the whole set of arms moves together in the exploded view.
import * as THREE from 'three';
import { strut } from './shapes.js';
import { FRONT_AXLE_X, REAR_AXLE_X, WHEEL_R } from './dims.js';

// Points are [x, y, z] in car coordinates for the RIGHT side; z is mirrored for the left.
const FRONT = {
  arms: [
    [[1.85, 0.50, 0.12], [1.65, 0.55, 0.64]], [[1.40, 0.52, 0.12], [1.65, 0.55, 0.64]], // upper wishbone
    [[1.95, 0.22, 0.11], [1.66, 0.17, 0.65]], [[1.35, 0.20, 0.11], [1.66, 0.17, 0.65]], // lower wishbone
    [[1.72, 0.33, 0.12], [1.75, 0.34, 0.63]],                                           // track rod (steering)
  ],
  rod: [[1.64, 0.20, 0.62], [1.50, 0.55, 0.11]],                                       // push rod
};
const REAR = {
  arms: [
    [[-1.75, 0.46, 0.10], [-1.95, 0.56, 0.60]], [[-2.15, 0.46, 0.10], [-1.95, 0.56, 0.60]],
    [[-1.70, 0.20, 0.13], [-1.95, 0.16, 0.62]], [[-2.20, 0.22, 0.10], [-1.95, 0.16, 0.62]],
    [[-2.15, 0.34, 0.10], [-2.12, 0.35, 0.60]],                                         // toe link
  ],
  rod: [[-1.97, 0.55, 0.59], [-1.90, 0.22, 0.10]],                                      // pull rod
};

export function buildSuspension({ mats, part, mesh, object }, chassis) {
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const mirror = ([x, y, z]) => [x, y, z * s];
    for (const [corner, axleX, def] of [['F', FRONT_AXLE_X, FRONT], ['R', REAR_AXLE_X, REAR]]) {
      const sus = part(chassis, `Suspension ${corner}${side}`, [axleX, WHEEL_R, 0.4 * s], { explodeDir: [0, 0, s], explodeDist: 0.25 });
      for (const [a, b] of def.arms) object(sus, strut(mirror(a), mirror(b), 0.016, mats.carbon));
      object(sus, strut(mirror(def.rod[0]), mirror(def.rod[1]), 0.013, mats.metal, 1));
      if (corner === 'R') {
        // Rear upright and brake drum: the rear wheels only spin, so these stay with the arms.
        mesh(sus, new THREE.BoxGeometry(0.1, 0.44, 0.05).translate(REAR_AXLE_X, WHEEL_R, 0.585 * s), mats.metal);
        mesh(sus, new THREE.CylinderGeometry(0.16, 0.16, 0.1, 28).rotateX(Math.PI / 2).translate(REAR_AXLE_X, WHEEL_R, 0.63 * s), mats.carbon);
      }
    }
  }
}
