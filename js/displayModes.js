// Display modes: Solid, Wireframe (just the triangle edges), Surface normals, plus "show pivots".
//
// A normal is the direction a surface faces. Lighting depends on the angle between the normal
// and the light, so normals are what make a surface look smooth or faceted.
import * as THREE from 'three';
import { VertexNormalsHelper } from 'three/addons/VertexNormalsHelper.js';
import { isSelectable } from './selection.js';

export const MODES = ['Solid', 'Wireframe', 'Surface normals'];

export function createDisplayModes(scene) {
  const state = { mode: 'Solid', pivots: false };
  // Colours each pixel by its normal (x -> red, y -> green, z -> blue, in camera space).
  const normalMaterial = new THREE.MeshNormalMaterial();
  let root = null;
  let normalHelpers = [];
  let pivotHelpers = [];
  let wireframed = new Set();

  const meshes = () => {
    const list = [];
    root.traverse((o) => { if (o.isMesh && !o.userData.helper) list.push(o); });
    return list;
  };

  function clear() {
    for (const mesh of meshes()) {
      if (mesh.userData.solidMaterial) { mesh.material = mesh.userData.solidMaterial; delete mesh.userData.solidMaterial; }
    }
    wireframed.forEach((m) => { m.wireframe = false; });
    wireframed = new Set();
    for (const h of [...normalHelpers, ...pivotHelpers]) { h.removeFromParent(); h.geometry.dispose(); h.material.dispose(); }
    normalHelpers = [];
    pivotHelpers = [];
  }

  function apply() {
    if (!root) return;
    clear();
    for (const mesh of meshes()) {
      if (state.mode === 'Wireframe') {
        for (const m of [mesh.material].flat()) { m.wireframe = true; wireframed.add(m); }
      } else if (state.mode === 'Surface normals') {
        mesh.userData.solidMaterial = mesh.material;
        mesh.material = normalMaterial;
        // Short cyan lines showing the normal stored at each vertex.
        const helper = new VertexNormalsHelper(mesh, 0.035, 0x37d6ff);
        helper.userData.helper = true;
        scene.add(helper);
        normalHelpers.push(helper);
      }
    }
    if (state.pivots) {
      // Small axes at every joint/part origin (red = local X, green = Y, blue = Z),
      // drawn on top so the ones buried inside the body are visible too.
      root.traverse((o) => {
        if (!isSelectable(o)) return;
        const axes = new THREE.AxesHelper(0.2);
        axes.userData.helper = true;
        axes.material.depthTest = false;
        axes.material.transparent = true;
        axes.renderOrder = 998;
        o.add(axes);
        pivotHelpers.push(axes);
      });
    }
  }

  return {
    state,
    apply,
    setRoot(r) { if (root) clear(); root = r; apply(); },
    // The normal lines are computed in world space, so they must follow the moving parts.
    update() { normalHelpers.forEach((h) => h.update()); },
  };
}
