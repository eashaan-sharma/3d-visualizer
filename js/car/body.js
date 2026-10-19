// Bodywork: monocoque (the chassis "tub"), nose, cockpit, halo, sidepods, engine cover, floor.
import * as THREE from 'three';
import { loft, superRing, curveRing, plate, slab, strut } from './shapes.js';
import { SLOT, slotList } from './materials.js';

const N = 48; // points per cross-section ring: more = smoother, but more triangles

// Livery rules, written in loft coordinates (u = around the ring, 0.5 = top center).
const lowerCarbon = (u) => u < 0.17 || u > 0.83;
const topStripe = (u) => Math.abs(u - 0.5) < 0.025;

export function buildBody({ mats, part, mesh, local }, chassis) {
  const slots = slotList(mats);

  // --- Chassis: the monocoque tub, plus the engine and gearbox it carries ------------------
  const tub = [
    { x: 1.30, w: 0.14, yc: 0.35, hTop: 0.25 },
    { x: 0.90, w: 0.22, yc: 0.38, hTop: 0.28 },
    { x: 0.50, w: 0.30, yc: 0.38, hTop: 0.28 },
    { x: 0.00, w: 0.32, yc: 0.37, hTop: 0.27 },
    { x: -0.30, w: 0.28, yc: 0.36, hTop: 0.24 },
    { x: -0.65, w: 0.25, yc: 0.33, hTop: 0.18 },
  ].map((s) => superRing(N, { eTop: 2.6, eBot: 5, ...s }));
  mesh(chassis, loft(tub, { materialAt: (u) => (lowerCarbon(u) ? SLOT.CARBON : SLOT.PAINT) }), slots);

  mesh(chassis, new THREE.BoxGeometry(0.9, 0.34, 0.32).translate(-0.78, 0.36, 0), mats.rim);
  mesh(chassis, new THREE.CylinderGeometry(0.06, 0.06, 0.8, 20).rotateZ(Math.PI / 2).translate(-0.78, 0.57, 0), mats.rim);
  const gearbox = [
    { x: -1.30, w: 0.16, yc: 0.30, hTop: 0.14 },
    { x: -2.25, w: 0.09, yc: 0.32, hTop: 0.10 },
    { x: -2.55, w: 0.045, yc: 0.33, hTop: 0.045 },
  ].map((s) => superRing(24, { eTop: 3, eBot: 3, ...s }));
  mesh(chassis, loft(gearbox), mats.carbon);
  mesh(chassis, new THREE.CylinderGeometry(0.035, 0.04, 0.25, 16).rotateZ(Math.PI / 2).translate(-2.25, 0.46, 0), mats.metal);
  mesh(chassis, new THREE.BoxGeometry(0.02, 0.05, 0.07).translate(-2.56, 0.33, 0), mats.light);

  // --- Nose cone: long and narrow, rising from the front wing to the tub -------------------
  const nose = part(chassis, 'Nose cone', [2.1, 0.30, 0], { explodeDir: [1, 0.1, 0], explodeDist: 0.9 });
  const noseRings = [
    { x: 2.86, w: 0.05, yc: 0.17, hTop: 0.03, hBot: 0.03 },
    { x: 2.80, w: 0.09, yc: 0.175, hTop: 0.05, hBot: 0.05 },
    { x: 2.60, w: 0.12, yc: 0.195, hTop: 0.075, hBot: 0.06 },
    { x: 2.20, w: 0.13, yc: 0.255, hTop: 0.11, hBot: 0.09 },
    { x: 1.80, w: 0.14, yc: 0.32, hTop: 0.15, hBot: 0.14 },
    { x: 1.30, w: 0.14, yc: 0.35, hTop: 0.25, hBot: 0.25 },
  ].map((s) => superRing(N, { eTop: 2.6, eBot: 5, ...s }));
  mesh(nose, loft(noseRings, {
    materialAt: (u, v) => (topStripe(u) && v > 0.15 ? SLOT.WHITE : lowerCarbon(u) ? SLOT.CARBON : SLOT.PAINT),
  }), slots);

  // --- Cockpit: opening, headrest pads and the driver's helmet -----------------------------
  const cockpit = part(chassis, 'Cockpit', [0.10, 0.70, 0], { explodeDir: [0, 1, 0], explodeDist: 0.6 });
  mesh(cockpit, new THREE.CylinderGeometry(1, 1, 0.08, 40).scale(0.36, 1, 0.21).translate(0.12, 0.63, 0), mats.matte);
  mesh(cockpit, new THREE.TorusGeometry(1, 0.06, 8, 48).rotateX(Math.PI / 2).scale(0.36, 0.3, 0.215).translate(0.12, 0.665, 0), mats.carbon);
  mesh(cockpit, new THREE.CapsuleGeometry(0.05, 0.30, 6, 16).rotateX(Math.PI / 2).translate(-0.20, 0.68, 0), mats.paint);
  for (const s of [-1, 1]) {
    mesh(cockpit, new THREE.CapsuleGeometry(0.04, 0.26, 6, 12).rotateZ(Math.PI / 2).translate(-0.05, 0.665, 0.19 * s), mats.paint);
  }
  mesh(cockpit, new THREE.SphereGeometry(0.125, 32, 24).translate(0.05, 0.745, 0), mats.helmet);
  // Visor: a slice of a slightly larger sphere facing forward (+X is phi = PI in SphereGeometry).
  mesh(cockpit, new THREE.SphereGeometry(0.128, 32, 8, Math.PI - 0.95, 1.9, Math.PI / 2 - 0.42, 0.26).translate(0.05, 0.745, 0), mats.visor);
  mesh(cockpit, new THREE.SphereGeometry(0.1265, 32, 6, 0, Math.PI * 2, Math.PI / 2 - 0.08, 0.1).translate(0.05, 0.745, 0), mats.paint);

  // --- Halo: titanium hoop protecting the driver's head ------------------------------------
  const halo = part(chassis, 'Halo', [0.30, 0.84, 0], { explodeDir: [0, 1, 0], explodeDist: 1.25 });
  const hoop = new THREE.CatmullRomCurve3([
    [-0.24, 0.60, -0.22], [-0.16, 0.78, -0.27], [0.12, 0.85, -0.27], [0.42, 0.865, -0.13], [0.55, 0.865, 0],
    [0.42, 0.865, 0.13], [0.12, 0.85, 0.27], [-0.16, 0.78, 0.27], [-0.24, 0.60, 0.22],
  ].map((p) => new THREE.Vector3(...p)));
  mesh(halo, new THREE.TubeGeometry(hoop, 96, 0.024, 12), mats.carbon);
  local(halo, strut([0.25, 0.025, 0], [0.50, -0.22, 0], 0.03, mats.carbon, 0.5));

  // --- Sidepods: deep undercut, with the scalloped "bathtub" channel along the top ---------
  // Each station: inner/outer edge (zi/zo), bottom/top height (yb/yt), trough depth d.
  const stations = [
    { x: 0.30, zi: 0.26, zo: 0.66, yb: 0.24, yt: 0.56, d: 0.005 },
    { x: 0.15, zi: 0.27, zo: 0.72, yb: 0.22, yt: 0.58, d: 0.03 },
    { x: -0.20, zi: 0.28, zo: 0.73, yb: 0.22, yt: 0.58, d: 0.085 },
    { x: -0.60, zi: 0.26, zo: 0.70, yb: 0.23, yt: 0.56, d: 0.09 },
    { x: -1.00, zi: 0.22, zo: 0.56, yb: 0.24, yt: 0.51, d: 0.05 },
    { x: -1.35, zi: 0.18, zo: 0.38, yb: 0.25, yt: 0.45, d: 0.02 },
    { x: -1.60, zi: 0.14, zo: 0.22, yb: 0.27, yt: 0.39, d: 0.0 },
  ];
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const pod = part(chassis, `Sidepod ${side}`, [-0.40, 0.42, 0.48 * s], { explodeDir: [0, 0.3, s], explodeDist: 0.75 });
    // The underside curves up and inward from the outer wall: the "undercut" that feeds air
    // along the floor. The top has raised inner and outer lips with a trough between them.
    const rings = stations.map(({ x, zi, zo, yb, yt, d }) => curveRing(N, x, [
      [zi, yb], [zi + 0.10, yb - 0.025], [zo - 0.24, yb], [zo - 0.07, yb + 0.10],
      [zo, yt - 0.14], [zo - 0.012, yt - 0.025], [zo - 0.06, yt], [zo - 0.16, yt - d],
      [zi + 0.13, yt - d * 0.9], [zi + 0.04, yt + 0.025], [zi, yt - 0.08],
    ].map(([z, y]) => [z * s, y])));
    // u runs along the control points: the first ~4/11 is the dark undercut, then a pinstripe.
    mesh(pod, loft(rings, {
      capStart: SLOT.MATTE, // the front cap reads as the dark cooling inlet
      materialAt: (u) => (u < 0.36 ? SLOT.CARBON : u < 0.375 ? SLOT.WHITE : SLOT.PAINT),
    }), slots);

    // Rear-view mirror on a short stalk.
    mesh(pod, new THREE.SphereGeometry(1, 20, 12).scale(0.045, 0.035, 0.085).translate(0.10, 0.70, 0.54 * s), mats.paint);
    mesh(pod, new THREE.CircleGeometry(1, 20).scale(0.07, 0.028, 1).rotateY(-Math.PI / 2).translate(0.054, 0.70, 0.54 * s), mats.mirror);
    local(pod, strut([0.52, 0.27, 0.06 * s], [0.55, 0.15, -0.04 * s], 0.01, mats.carbon));
  }

  // --- Engine cover: airbox above the driver, flowing down to the rear wing -----------------
  const cover = part(chassis, 'Engine cover', [-0.90, 0.70, 0], { explodeDir: [-0.15, 1, 0], explodeDist: 0.95 });
  const coverRings = [
    { x: -0.20, w: 0.11, yc: 0.68, hTop: 0.17, hBot: 0.26 },
    { x: -0.40, w: 0.16, yc: 0.68, hTop: 0.18, hBot: 0.32 },
    { x: -0.70, w: 0.23, yc: 0.58, hTop: 0.22, hBot: 0.28 },
    { x: -1.05, w: 0.22, yc: 0.52, hTop: 0.19, hBot: 0.26 },
    { x: -1.40, w: 0.17, yc: 0.47, hTop: 0.15, hBot: 0.22 },
    { x: -1.75, w: 0.12, yc: 0.43, hTop: 0.11, hBot: 0.17 },
    { x: -2.10, w: 0.08, yc: 0.40, hTop: 0.07, hBot: 0.11 },
    { x: -2.30, w: 0.05, yc: 0.40, hTop: 0.04, hBot: 0.06 },
  ].map((s) => superRing(N, { eTop: 2.2, eBot: 4, ...s }));
  mesh(cover, loft(coverRings, { materialAt: (u) => (topStripe(u) ? SLOT.WHITE : SLOT.PAINT) }), slots);
  // Airbox / roll hoop: a rounded-triangle intake that rises above the helmet and blends
  // backward into the cover. Its open front (the start cap) is the dark engine air intake.
  const airbox = [
    { x: -0.10, w: 0.075, yc: 0.875, hTop: 0.085, hBot: 0.09 },
    { x: -0.16, w: 0.085, yc: 0.87, hTop: 0.095, hBot: 0.11 },
    { x: -0.30, w: 0.10, yc: 0.85, hTop: 0.10, hBot: 0.16 },
    { x: -0.62, w: 0.13, yc: 0.74, hTop: 0.07, hBot: 0.20 },
  ].map((s) => superRing(N, { eTop: 1.8, eBot: 2.5, ...s }));
  mesh(cover, loft(airbox, { capStart: SLOT.MATTE, materialAt: (u) => (topStripe(u) ? SLOT.WHITE : SLOT.PAINT) }), slots);
  mesh(cover, plate([[-0.45, 0.92], [-1.90, 0.52], [-2.00, 0.62], [-1.20, 0.80]], 0.008, 0, { smooth: true }), mats.paint);

  // --- Floor: the thin ground-effect floor with its rear diffuser --------------------------
  const floor = part(chassis, 'Floor', [-0.40, 0.025, 0], { explodeDir: [0, -1, 0], explodeDist: 0.33 });
  const half = [[1.05, 0.25], [0.75, 0.55], [0.35, 0.82], [-1.30, 0.84], [-1.45, 0.70], [-1.62, 0.55], [-2.10, 0.52]];
  const outline = [...half, ...half.slice().reverse().map(([x, z]) => [x, -z])];
  mesh(floor, slab(outline, 0.018, 0.03), mats.floor);
  // Diffuser: an upward-sloping roof between two fences, behind the rear axle line.
  mesh(floor, new THREE.BoxGeometry(0.68, 0.01, 1.04).rotateZ(-0.39).translate(-1.91, 0.155, 0), mats.floor);
  for (const s of [-1, 1]) {
    mesh(floor, plate([[-1.58, 0.03], [-2.15, 0.03], [-2.24, 0.29], [-1.58, 0.07]], 0.008, 0.52 * s), mats.floor);
    // Floor edge fence: a thin upturned lip along the outer edge.
    mesh(floor, plate([[0.30, 0.03], [-1.28, 0.03], [-1.28, 0.065], [0.10, 0.065]], 0.006, 0.835 * s), mats.floor);
  }
}
