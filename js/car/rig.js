// The rig: every movable part of the car is a "part node" in the scene graph.
//
// Each part stores three ingredients and builds its LOCAL matrix from them:
//
//     local = Base  x  Explode  x  Joint
//
//   Base    = T x R x S   where the part sits when the car is assembled (relative to its parent)
//   Explode = T           a slide along the part's own explode direction (pit stop mode)
//   Joint   = R1 x R2 ... the rotations that kinematics drives (steer, spin, flap angle)
//
// Reading right to left: a point on the part is first rotated by the joint (about the pivot,
// which is the local origin), then slid outward, then placed onto the car.
//
// The WORLD matrix is then   world = parent.world x local   (Three.js does this multiplication
// for us in updateMatrixWorld, walking down the tree from the root).
import * as THREE from 'three';

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

// Scratch matrices reused every frame so we do not allocate garbage 60 times a second.
const mBase = new THREE.Matrix4();
const mExplode = new THREE.Matrix4();
const mJoint = new THREE.Matrix4();
const mRot = new THREE.Matrix4();
const qBase = new THREE.Quaternion();

export function createPart(name, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],      // Euler angles in radians (applied X, then Y, then Z)
  scale = [1, 1, 1],
  explodeDir = [0, 0, 0],    // direction in the part's base frame (normalized below)
  explodeDist = 0,           // meters travelled when explode = 1
} = {}) {
  const part = new THREE.Group();
  part.name = name;
  // We write part.matrix ourselves, so Three.js must not overwrite it from position/rotation/scale.
  part.matrixAutoUpdate = false;
  part.userData.rig = {
    position: new THREE.Vector3(...position),
    rotation: new THREE.Euler(...rotation),
    scale: new THREE.Vector3(...scale),
    explodeDir: new THREE.Vector3(...explodeDir).normalize(),
    explodeDist,
    // Ordered list of joint rotations; kinematics edits the angles (and sometimes the order).
    joints: [],
  };
  updateLocalMatrix(part, 0);
  return part;
}

export const isPart = (obj) => obj.userData.rig !== undefined;

// Adds a named rotational joint ("steer", "spin", "flap"...) about one of the local axes.
export function addJoint(part, name, axis) {
  const joint = { name, axis, angle: 0 };
  part.userData.rig.joints.push(joint);
  return joint;
}

// Rebuild local = Base x Explode x Joint for one part.
export function updateLocalMatrix(part, explodeAmount) {
  const rig = part.userData.rig;

  qBase.setFromEuler(rig.rotation);
  mBase.compose(rig.position, qBase, rig.scale); // compose() builds exactly T x R x S

  const d = rig.explodeDist * explodeAmount;
  mExplode.makeTranslation(rig.explodeDir.x * d, rig.explodeDir.y * d, rig.explodeDir.z * d);

  mJoint.identity();
  for (const j of rig.joints) {
    mRot.makeRotationAxis(AXES[j.axis], j.angle);
    mJoint.multiply(mRot); // joints listed first are applied last (outermost)
  }

  part.matrix.copy(mBase).multiply(mExplode).multiply(mJoint);
  part.matrixWorldNeedsUpdate = true;
}

// Update every part below (and including) root.
export function updateRig(root, explodeAmount) {
  root.traverse((obj) => {
    if (isPart(obj)) updateLocalMatrix(obj, explodeAmount);
  });
}
