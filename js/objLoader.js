// Hand-written Wavefront .obj parser.
//
// An .obj file is plain text, one statement per line:
//   v  x y z         a vertex position
//   vn x y z         a vertex normal
//   vt u v           a texture coordinate (counted but not used here)
//   o name / g name  start a new named object / group
//   f a b c ...      a face (polygon) listing vertices as  v,  v/vt,  v//vn  or  v/vt/vn
// Indices start at 1, and negative indices count back from the most recent vertex.
//
// Notice what is NOT in the format: no parent/child links, no pivots, no joint axes or
// limits. An .obj stores geometry only, so a loaded model has no rigging.
import * as THREE from 'three';

const PALETTE = ['#e8e8e8', '#ff6b5b', '#4fc3f7', '#ffd54f', '#81c784', '#ba68c8', '#ff9f43', '#90a4ae'];

export function parseOBJ(text, name = 'model.obj') {
  const positions = []; // every "v" line, in file order: [x, y, z]
  const normals = [];   // every "vn" line
  const groups = [];
  const stats = { vertices: 0, normals: 0, texcoords: 0, faces: 0, triangles: 0, ignored: {} };
  let current = null;

  const startGroup = (groupName) => {
    // "o Car" followed by "g Wheel" should give one group, not an empty one plus another.
    if (current && current.pos.length === 0) { current.name = groupName; return; }
    current = { name: groupName, pos: [], nrm: [], missingNormals: false };
    groups.push(current);
  };

  // Resolve a 1-based (or negative, relative) index into a list.
  const resolve = (token, list) => {
    const i = parseInt(token, 10);
    return list[i > 0 ? i - 1 : list.length + i];
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [keyword, ...args] = line.split(/\s+/);

    switch (keyword) {
      case 'v': positions.push(args.slice(0, 3).map(Number)); stats.vertices++; break;
      case 'vn': normals.push(args.slice(0, 3).map(Number)); stats.normals++; break;
      case 'vt': stats.texcoords++; break;
      case 'o':
      case 'g': startGroup(args.join(' ') || 'unnamed'); break;
      case 'f': {
        if (!current) startGroup('default');
        // Each corner is "v/vt/vn"; we keep the position and (if present) the normal.
        const corners = args.map((c) => {
          const [v, , vn] = c.split('/');
          return { p: resolve(v, positions), n: vn ? resolve(vn, normals) : null };
        });
        // Polygons with more than 3 corners are split into a fan of triangles: (0,1,2), (0,2,3)...
        for (let i = 1; i < corners.length - 1; i++) {
          for (const c of [corners[0], corners[i], corners[i + 1]]) {
            current.pos.push(...c.p);
            if (c.n) current.nrm.push(...c.n); else current.missingNormals = true;
          }
          stats.triangles++;
        }
        stats.faces++;
        break;
      }
      default: stats.ignored[keyword] = (stats.ignored[keyword] ?? 0) + 1; // usemtl, mtllib, s, l...
    }
  }

  // One mesh per group, all as direct children of one root: the hierarchy is flat.
  const root = new THREE.Group();
  root.name = name;
  root.userData.selectable = true;
  groups.filter((g) => g.pos.length).forEach((g, i) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
    if (!g.missingNormals) geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nrm, 3));
    // No normals in the file: compute them from each triangle. Corners are not shared here,
    // so every triangle gets its own flat normal and the surface looks faceted.
    else geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: PALETTE[i % PALETTE.length], roughness: 0.55, metalness: 0.1 }));
    mesh.name = g.name;
    mesh.userData.selectable = true;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  });
  stats.groups = root.children.length;
  return { object: root, stats };
}
