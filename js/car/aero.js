// Wings: multi-element front wing (top flap is hinged), rear wing (DRS flap is hinged), beam wing.
import { addJoint } from './rig.js';
import { wing, plate } from './shapes.js';
import { SLOT, slotList } from './materials.js';

// Carbon elements with a thin painted band along the trailing edge
// (u near 0 or 1 in airfoilRing's loop order).
const redTrailingEdge = (u) => (u < 0.05 || u > 0.95 ? SLOT.PAINT : SLOT.CARBON);

export function buildAero({ mats, part, mesh }, chassis) {
  const slots = slotList(mats);

  // --- Front wing ---------------------------------------------------------------------------
  // Thin elements stacked like overlapping roof tiles, each steeper than the last. Toward the
  // tips (s = -1 .. 1 is left tip .. right tip) they sweep back and curl up to the endplates.
  const front = part(chassis, 'Front wing', [2.55, 0.10, 0], { explodeDir: [1, -0.04, 0], explodeDist: 1.7 });
  const span = 1.96;
  const sweep = (s) => 0.08 * s * s;
  const rise = (s) => 0.09 * Math.abs(s) ** 3;
  const elements = [
    { xLE: 2.92, yLE: 0.055, chord: 0.36, aoa: 0.06 },
    { xLE: 2.66, yLE: 0.095, chord: 0.24, aoa: 0.22 },
    { xLE: 2.50, yLE: 0.145, chord: 0.19, aoa: 0.38 },
  ];
  for (const e of elements) {
    mesh(front, wing({
      span,
      profile: (s) => ({ ...e, xLE: e.xLE - sweep(s), yLE: e.yLE + rise(s), thick: 0.07, camber: -0.05 }),
      materialAt: () => SLOT.CARBON,
    }), slots);
  }
  for (const s of [-1, 1]) {
    mesh(front, plate([[2.92, 0.03], [2.18, 0.03], [2.14, 0.20], [2.20, 0.37], [2.30, 0.385], [2.50, 0.22], [2.90, 0.10]], 0.006, (span / 2 + 0.004) * s, { smooth: true, bevel: 0.002 }), mats.carbon);
  }

  // Top flap: its pivot is its own leading edge, so the joint rotation tilts it like a hinge.
  const flapPivot = [2.37, 0.20, 0];
  const flap = part(front, 'Front wing flap', flapPivot, { explodeDir: [0, 1, 0], explodeDist: 0.25 });
  addJoint(flap, 'flap', 'z');
  mesh(flap, wing({
    span,
    profile: (s) => ({ xLE: flapPivot[0] - sweep(s), yLE: flapPivot[1] + rise(s), chord: 0.16, aoa: 0.55, thick: 0.07, camber: -0.05 }),
    materialAt: redTrailingEdge,
  }), slots);

  // --- Rear wing ----------------------------------------------------------------------------
  const rear = part(chassis, 'Rear wing', [-2.45, 0.75, 0], { explodeDir: [-1, 0.45, 0], explodeDist: 1.15 });
  const rearSpan = 1.0;
  mesh(rear, wing({
    span: rearSpan,
    profile: (s) => ({ xLE: -2.18, yLE: 0.73 + 0.04 * s ** 4, chord: 0.34, aoa: 0.13, thick: 0.12, camber: -0.07 }),
    materialAt: () => SLOT.CARBON,
  }), slots);
  // Thin endplates with rounded tops. They stop above the beam wing so it stays visible.
  for (const s of [-1, 1]) {
    mesh(rear, plate([[-2.20, 0.56], [-2.15, 0.79], [-2.22, 0.93], [-2.42, 0.99], [-2.64, 0.985], [-2.76, 0.92], [-2.74, 0.60], [-2.56, 0.52]], 0.006, (rearSpan / 2 + 0.004) * s, { smooth: true, bevel: 0.002 }), mats.carbon);
  }
  // "Swan neck" pillar: hangs the wing from above so the underside (the important side) stays clean.
  mesh(rear, plate([[-2.31, 0.84], [-2.43, 0.87], [-2.50, 0.70], [-2.49, 0.36], [-2.40, 0.34], [-2.41, 0.60], [-2.33, 0.76]], 0.014, 0, { smooth: true }), mats.carbon);

  // DRS flap: hinged near its trailing edge; opening lifts the leading edge to stall the wing.
  const drsPivot = [-2.655, 0.935, 0];
  const drs = part(rear, 'DRS flap', drsPivot, { explodeDir: [0, 1, 0], explodeDist: 0.3 });
  addJoint(drs, 'drs', 'z');
  mesh(drs, wing({
    span: rearSpan,
    profile: (s) => ({ xLE: -2.465, yLE: 0.815 + 0.04 * s ** 4, chord: 0.23, aoa: 0.55, thick: 0.10, camber: -0.06 }),
    materialAt: redTrailingEdge,
  }), slots);

  // --- Beam wing: two small elements low down, linking the rear wing and the diffuser -------
  const beam = part(chassis, 'Beam wing', [-2.40, 0.40, 0], { explodeDir: [-1, -0.15, 0], explodeDist: 0.7 });
  for (const e of [{ xLE: -2.27, yLE: 0.35, chord: 0.18, aoa: 0.15 }, { xLE: -2.40, yLE: 0.435, chord: 0.15, aoa: 0.4 }]) {
    mesh(beam, wing({ span: rearSpan, steps: 4, profile: () => ({ ...e, thick: 0.1, camber: -0.05 }), materialAt: () => SLOT.CARBON }), slots);
  }
}
