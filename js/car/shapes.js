// Procedural geometry helpers. Car units are meters, with
//   +X = forward, +Y = up, +Z = the car's right-hand side (so left is -Z).
import * as THREE from 'three';

// ---------------------------------------------------------------------------------------------
// Loft: stitch a list of closed cross-section rings into one smooth surface (like the ribs of a
// boat hull with skin stretched over them). Every ring must have the same number of points.
//
// materialAt(u, v) picks a material index per face, where u runs around the ring (0..1) and
// v runs along the loft (0..1). Because faces follow the rings, color bands get clean edges.
// ---------------------------------------------------------------------------------------------
export function loft(rings, { materialAt = () => 0, capStart = 0, capEnd = 0 } = {}) {
  const n = rings[0].length;
  const positions = [];
  for (const ring of rings) for (const p of ring) positions.push(p.x, p.y, p.z);

  const tris = []; // [a, b, c, materialIndex]
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      const a = k * n + i, b = k * n + (i + 1) % n, c = a + n, d = b + n;
      const m = materialAt((i + 0.5) / n, (k + 0.5) / (rings.length - 1));
      tris.push([a, c, b, m], [b, c, d, m]);
    }
  }

  // Caps close the ends with a fan of triangles around the ring's center. Cap vertices are
  // duplicated so they get their own flat normal instead of being smoothed into the sides.
  const addCap = (ring, flip, m) => {
    const base = positions.length / 3;
    const center = new THREE.Vector3();
    ring.forEach((p) => center.add(p));
    center.divideScalar(n);
    positions.push(center.x, center.y, center.z);
    for (const p of ring) positions.push(p.x, p.y, p.z);
    for (let i = 0; i < n; i++) {
      const p = base + 1 + i, q = base + 1 + (i + 1) % n;
      tris.push(flip ? [base, q, p, m] : [base, p, q, m]);
    }
  };
  if (capStart !== null) addCap(rings[0], false, capStart);
  if (capEnd !== null) addCap(rings[rings.length - 1], true, capEnd);

  // The rings may run clockwise or counter-clockwise depending on how they were made.
  // The signed volume of a closed mesh is positive only when its triangles face outward,
  // so if it comes out negative we flip every triangle.
  const P = (i) => new THREE.Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
  let volume = 0;
  for (const [a, b, c] of tris) volume += P(a).dot(P(b).cross(P(c)));
  if (volume < 0) for (const t of tris) [t[1], t[2]] = [t[2], t[1]];

  return indexedGeometry(positions, tris);
}

// Sort triangles by material so each material becomes one draw "group".
function indexedGeometry(positions, tris) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const index = [];
  const mats = [...new Set(tris.map((t) => t[3]))].sort((a, b) => a - b);
  for (const m of mats) {
    const start = index.length;
    for (const t of tris) if (t[3] === m) index.push(t[0], t[1], t[2]);
    geo.addGroup(start, index.length - start, m);
  }
  geo.setIndex(index);
  geo.computeVertexNormals(); // average face normals at shared vertices = smooth shading
  return geo;
}

// ---------------------------------------------------------------------------------------------
// Ring generators
// ---------------------------------------------------------------------------------------------

// A "superellipse" cross-section at station x. Exponent 2 is an ellipse; bigger numbers get
// boxier. Top and bottom halves can differ (rounded top, flatter bottom). Ring index 0 is the
// bottom center, then it runs up the right side (+Z), over the top (u = 0.5) and down the left.
export function superRing(n, { x, w, yc, hTop, hBot = hTop, eTop = 2.5, eBot = 4 }) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const c = Math.cos(t), s = Math.sin(t);
    const e = s >= 0 ? eTop : eBot;
    const h = s >= 0 ? hTop : hBot;
    const z = w * Math.sign(c) * Math.abs(c) ** (2 / e);
    const y = yc + h * Math.sign(s) * Math.abs(s) ** (2 / e);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

// A smooth closed ring through 2D control points [z, y] at station x (Catmull-Rom spline).
export function curveRing(n, x, controlZY) {
  const curve = new THREE.CatmullRomCurve3(
    controlZY.map(([z, y]) => new THREE.Vector3(x, y, z)), true, 'centripetal'
  );
  return curve.getPoints(n).slice(0, n); // closed curves repeat the first point at the end
}

// An airfoil (wing cross-section) ring at span position z.
// Thickness follows the classic NACA 4-digit formula; camber < 0 bows the profile downward,
// which is what an upside-down race-car wing does to make downforce.
// The chord runs backward (-X) from the leading edge (xLE, yLE); aoa tilts the trailing edge up.
export function airfoilRing(n, { z, xLE, yLE, chord, thick = 0.12, camber = -0.04, aoa = 0 }) {
  const half = n / 2;
  const upper = [], lower = [];
  for (let i = 0; i <= half; i++) {
    const t = (1 - Math.cos((Math.PI * i) / half)) / 2; // cluster points at both edges
    const yt = 5 * thick * (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t ** 3 - 0.1036 * t ** 4);
    const yc = camber * 4 * t * (1 - t);
    upper.push([t, yc + yt]);
    lower.push([t, yc - yt]);
  }
  // Loop: upper surface from trailing edge to leading edge, then lower surface back again.
  const loop = [...upper.reverse(), ...lower.slice(1, -1)];
  const ca = Math.cos(aoa), sa = Math.sin(aoa);
  return loop.map(([t, y]) => {
    const px = -t * chord, py = y * chord;
    return new THREE.Vector3(xLE + px * ca - py * sa, yLE + px * sa + py * ca, z);
  });
}

// A wing element lofted across its span. profile(s) returns the airfoil parameters at
// s in [-1, 1] (left tip to right tip), so chord, height and sweep can vary along the span.
export function wing({ span, steps = 16, n = 24, profile, materialAt }) {
  const rings = [];
  for (let k = 0; k <= steps; k++) {
    const s = -1 + (2 * k) / steps;
    rings.push(airfoilRing(n, { z: (s * span) / 2, ...profile(s) }));
  }
  return loft(rings, { materialAt });
}

// ---------------------------------------------------------------------------------------------
// Flat-ish pieces and struts
// ---------------------------------------------------------------------------------------------

// A thin plate from a 2D outline drawn in the X-Y plane, given thickness along Z and
// centered on z. Used for endplates and fins. smooth = pass a spline through the outline
// points (the closing edge stays straight).
export function plate(outlineXY, thickness, z = 0, { smooth = false, bevel = 0.004 } = {}) {
  const pts = outlineXY.map(([x, y]) => new THREE.Vector2(x, y));
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  if (smooth) shape.splineThru(pts.slice(1));
  else pts.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6,
  });
  geo.translate(0, 0, z - thickness / 2);
  return geo;
}

// A slab from a top-view outline in the X-Z plane, between heights yBottom and yTop (the floor).
export function slab(outlineXZ, yBottom, yTop) {
  const shape = new THREE.Shape(outlineXZ.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: yTop - yBottom, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // the shape's plane becomes horizontal; extrusion now points up
  geo.translate(0, yBottom, 0);
  return geo;
}

// A streamlined (flattened) rod between two points, like a wishbone leg or a push rod.
const UP = new THREE.Vector3(0, 1, 0);
export function strut(from, to, radius, material, flatten = 0.45) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(radius, radius, len, 10);
  geo.scale(1, 1, flatten); // squash the round tube into an aerodynamic oval
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  // The cylinder is built along +Y; rotate +Y onto the a->b direction.
  mesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return mesh;
}
