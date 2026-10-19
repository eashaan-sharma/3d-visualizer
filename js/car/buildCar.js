// Assembles the whole car as a scene graph of part nodes (see rig.js).
//
// Modelling trick: every mesh is designed in CAR coordinates (meters, origin on the ground
// between the axles), which is easy to reason about. When a mesh is attached to a part we
// shift it by minus the part's pivot, so the pivot ends up at the part's local origin. That
// is what makes rotations happen about the right point (a wheel spins about its axle, a flap
// about its hinge) instead of about the middle of the car.
import * as THREE from 'three';
import { createPart } from './rig.js';
import { createMaterials } from './materials.js';
import { buildBody } from './body.js';
import { buildAero } from './aero.js';
import { buildCorners } from './wheels.js';
import { buildSuspension } from './suspension.js';

export function buildCar() {
  const mats = createMaterials();
  const parts = {};

  // Create a part whose pivot is given in car coordinates. Its base position is the pivot
  // measured relative to the parent's pivot (all base rotations here are zero, except the
  // steering wheel, which builds its meshes directly in its own frame).
  function part(parent, name, pivot, opts = {}) {
    const parentPivot = parent ? parent.userData.pivot : new THREE.Vector3();
    const p = new THREE.Vector3(...pivot);
    const node = createPart(name, { position: p.clone().sub(parentPivot).toArray(), ...opts });
    node.userData.pivot = p;
    if (parent) parent.add(node);
    parts[name] = node;
    return node;
  }

  // Attach geometry modelled in car coordinates.
  function mesh(node, geometry, material) {
    const { x, y, z } = node.userData.pivot;
    geometry.translate(-x, -y, -z);
    return local(node, new THREE.Mesh(geometry, material));
  }

  // Attach an object positioned in car coordinates (e.g. a strut with its own rotation).
  function object(node, obj) {
    obj.position.sub(node.userData.pivot);
    return local(node, obj);
  }

  // Attach an object that is already expressed in the part's own frame.
  function local(node, obj) {
    obj.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    node.add(obj);
    return obj;
  }

  const kit = { mats, part, mesh, object, local };
  const chassis = part(null, 'Chassis', [0, 0, 0], { explodeDir: [0, 1, 0], explodeDist: 0.35 });
  buildBody(kit, chassis);
  buildAero(kit, chassis);
  buildCorners(kit, chassis);
  buildSuspension(kit, chassis);

  return { root: chassis, parts, materials: mats };
}
