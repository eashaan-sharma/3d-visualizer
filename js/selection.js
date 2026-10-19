// Click-to-select with raycasting.
//
// Raycasting: turn the mouse position into a ray that starts at the camera and passes through
// that pixel, then test which triangles it hits. The closest hit is what you clicked on.
// The hit is usually a small mesh deep inside a part, so we walk UP the scene graph until we
// reach the node that owns it (the nearest part node).
import * as THREE from 'three';
import { isPart } from './car/rig.js';

const HIGHLIGHT = '#ffd23f';

// The node a click should select: the nearest part (or a selectable loaded .obj group).
export const isSelectable = (obj) => isPart(obj) || obj.userData.selectable === true;
export function ownerOf(obj) {
  while (obj && !isSelectable(obj)) obj = obj.parent;
  return obj;
}

// Meshes that belong to this node itself, not to child parts below it.
export function ownMeshes(node, out = []) {
  if (node.isMesh) out.push(node);
  for (const child of node.children) {
    if (!isSelectable(child) && !child.userData.helper) ownMeshes(child, out);
  }
  return out;
}

// Draw-on-top helpers (visible through the body) that the picker and exporter ignore.
function markHelper(obj) {
  obj.userData.helper = true;
  obj.renderOrder = 999;
  obj.material.depthTest = false;
  obj.material.transparent = true;
  return obj;
}

export function createSelection({ camera, dom, getRoot }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let selected = null;
  let helpers = [];
  const listeners = [];

  function pick(clientX, clientY) {
    const r = dom.getBoundingClientRect();
    // Pixel -> normalized device coordinates (-1..1, y up), which is what setFromCamera expects.
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(getRoot(), true).find((h) => h.object.isMesh && !h.object.userData.helper);
    return hit ? ownerOf(hit.object) : null;
  }

  function select(node) {
    for (const h of helpers) { h.removeFromParent(); h.geometry.dispose(); h.material.dispose(); }
    helpers = [];
    selected = node;
    if (node) {
      // Bounding box of the node's own meshes, measured in the node's LOCAL frame. Because the
      // helper is a child of the node, the box turns and slides with it: you see the local frame.
      node.updateWorldMatrix(true, true);
      const toLocal = node.matrixWorld.clone().invert();
      const box = new THREE.Box3();
      for (const m of ownMeshes(node)) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        box.union(m.geometry.boundingBox.clone().applyMatrix4(toLocal.clone().multiply(m.matrixWorld)));
      }
      helpers.push(markHelper(new THREE.Box3Helper(box, HIGHLIGHT)));
      helpers.push(markHelper(new THREE.AxesHelper(0.3))); // the pivot: origin of the local frame
      helpers.forEach((h) => node.add(h));
    }
    listeners.forEach((fn) => fn(node));
  }

  // A click is a press and release without dragging (drags belong to the arcball).
  let down = null;
  dom.addEventListener('pointerdown', (e) => { if (e.button === 0) down = { x: e.clientX, y: e.clientY }; });
  dom.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || !down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) select(pick(e.clientX, e.clientY));
    down = null;
  });

  return {
    select,
    get selected() { return selected; },
    onChange: (fn) => listeners.push(fn),
  };
}
