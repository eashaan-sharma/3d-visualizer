// Hand-written .obj exporter.
//
// Writes one named object ("o FL wheel") per part, containing that part's own triangles.
// Positions are transformed by each mesh's WORLD matrix, so the current pose (steering,
// explode...) is "baked in". Normals use the normal matrix (inverse-transpose of the world
// matrix), which keeps them perpendicular to the surface even under non-uniform scaling.
//
// What gets lost: the scene graph. Parents, pivots and joint axes have no place in an .obj,
// so after reloading, the parts are back but nothing can steer or spin.
import * as THREE from 'three';
import { isSelectable, ownMeshes } from './selection.js';

const n4 = (v) => (Math.abs(v) < 5e-5 ? 0 : +v.toFixed(4)); // short numbers, no "-0"

export function exportOBJ(root) {
  const out = [
    '# Hierarchical Modelling and Articulation of a Procedural Car: car exported as Wavefront .obj',
    '# Contains: positions (v), normals (vn), triangles (f v//vn), one object (o) per part.',
    '# Missing: hierarchy, pivots and joints. .obj has no way to store rigging.',
  ];
  let base = 1; // .obj indices are 1-based and global across the whole file
  const p = new THREE.Vector3(), n = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();

  root.updateWorldMatrix(true, true);
  root.traverse((node) => {
    if (!isSelectable(node)) return;
    const meshes = ownMeshes(node);
    if (!meshes.length) return;
    out.push(`o ${node.name}`);
    for (const mesh of meshes) {
      const geo = mesh.geometry;
      const pos = geo.attributes.position, nrm = geo.attributes.normal;
      normalMatrix.getNormalMatrix(mesh.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        n.fromBufferAttribute(nrm, i).applyMatrix3(normalMatrix).normalize();
        out.push(`v ${n4(p.x)} ${n4(p.y)} ${n4(p.z)}`, `vn ${n4(n.x)} ${n4(n.y)} ${n4(n.z)}`);
      }
      // Triangles: from the index buffer if there is one, otherwise every 3 vertices in a row.
      const idx = geo.index;
      const count = idx ? idx.count : pos.count;
      for (let i = 0; i < count; i += 3) {
        const [a, b, c] = [0, 1, 2].map((k) => (idx ? idx.getX(i + k) : i + k) + base);
        out.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
      }
      base += pos.count;
    }
  });
  return out.join('\n') + '\n';
}
