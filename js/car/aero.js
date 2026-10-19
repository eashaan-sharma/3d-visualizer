// Wings: multi-element front wing (top flap is hinged), rear wing (DRS flap is hinged), beam wing.
import { addJoint } from './rig.js';
import { wing, plate } from './shapes.js';
import { SLOT, slotList } from './materials.js';

// A white band along the trailing edge (u near 0 or 1 in airfoilRing's loop order).
const whiteTrailingEdge = (u) => (u < 0.06 || u > 0.94 ? SLOT.WHITE : SLOT.PAINT);

export function buildAero({ mats, part, mesh }, chassis) {
  const slots = slotList(mats);

  // --- Front wing ---------------------------------------------------------------------------
  // Elements are stacked like overlapping roof tiles, each steeper than the last. They sweep
  // back and rise toward the tips (s = -1 .. 1 is left tip .. right tip).
  const front = part(chassis, 'Front wing', [2.55, 0.12, 0], { explodeDir: [1, -0.04, 0], explodeDist: 1.7 });
  const span = 1.88;
  const elements = [
    { xLE: 2.92, yLE: 0.075, chord: 0.38, aoa: 0.07 },
    { xLE: 2.62, yLE: 0.125, chord: 0.27, aoa: 0.25 },
    { xLE: 2.44, yLE: 0.195, chord: 0.21, aoa: 0.42 },
  ];
  for (const [i, e] of elements.entries()) {
    const geo = wing({
      span,
      profile: (s) => ({ ...e, xLE: e.xLE - 0.10 * s * s, yLE: e.yLE + 0.05 * s * s, thick: 0.10, camber: -0.05 }),
      materialAt: () => (i < 2 ? SLOT.CARBON : SLOT.PAINT),
    });
    mesh(front, geo, slots);
  }
  for (const s of [-1, 1]) {
    mesh(front, plate([[2.97, 0.05], [2.12, 0.05], [2.10, 0.20], [2.20, 0.37], [2.45, 0.39], [2.75, 0.27], [2.96, 0.15]], 0.012, (span / 2 + 0.006) * s, { smooth: true }), mats.paint);
  }

  // Top flap: its pivot is its own leading edge, so the joint rotation tilts it like a hinge.
  const flapPivot = [2.30, 0.285, 0];
  const flap = part(front, 'Front wing flap', flapPivot, { explodeDir: [0, 1, 0], explodeDist: 0.25 });
  addJoint(flap, 'flap', 'z');
  mesh(flap, wing({
    span,
    profile: (s) => ({ xLE: flapPivot[0] - 0.10 * s * s, yLE: flapPivot[1] + 0.05 * s * s, chord: 0.17, aoa: 0.6, thick: 0.10, camber: -0.05 }),
    materialAt: whiteTrailingEdge,
  }), slots);

  // --- Rear wing ----------------------------------------------------------------------------
  const rear = part(chassis, 'Rear wing', [-2.45, 0.75, 0], { explodeDir: [-1, 0.45, 0], explodeDist: 1.15 });
  const rearSpan = 1.0;
  mesh(rear, wing({
    span: rearSpan,
    profile: (s) => ({ xLE: -2.20, yLE: 0.735 + 0.04 * s ** 4, chord: 0.31, aoa: 0.13, thick: 0.13, camber: -0.07 }),
    materialAt: () => SLOT.CARBON,
  }), slots);
  for (const s of [-1, 1]) {
    mesh(rear, plate([[-2.14, 0.30], [-2.12, 0.80], [-2.24, 0.94], [-2.50, 0.985], [-2.72, 0.96], [-2.77, 0.80], [-2.70, 0.30]], 0.014, (rearSpan / 2 + 0.008) * s, { smooth: true }), mats.paint);
  }
  // "Swan neck" pillar: hangs the wing from above so the underside (the important side) stays clean.
  mesh(rear, plate([[-2.31, 0.84], [-2.43, 0.87], [-2.50, 0.70], [-2.49, 0.36], [-2.40, 0.34], [-2.41, 0.60], [-2.33, 0.76]], 0.014, 0, { smooth: true }), mats.carbon);

  // DRS flap: hinged near its trailing edge; opening lifts the leading edge to stall the wing.
  const drsPivot = [-2.655, 0.935, 0];
  const drs = part(rear, 'DRS flap', drsPivot, { explodeDir: [0, 1, 0], explodeDist: 0.3 });
  addJoint(drs, 'drs', 'z');
  mesh(drs, wing({
    span: rearSpan,
    profile: (s) => ({ xLE: -2.47, yLE: 0.82 + 0.04 * s ** 4, chord: 0.22, aoa: 0.55, thick: 0.11, camber: -0.06 }),
    materialAt: whiteTrailingEdge,
  }), slots);

  // --- Beam wing: two small elements low down, linking the rear wing and the diffuser -------
  const beam = part(chassis, 'Beam wing', [-2.40, 0.38, 0], { explodeDir: [-1, -0.15, 0], explodeDist: 0.7 });
  for (const e of [{ xLE: -2.29, yLE: 0.33, chord: 0.16, aoa: 0.15 }, { xLE: -2.40, yLE: 0.405, chord: 0.14, aoa: 0.4 }]) {
    mesh(beam, wing({ span: rearSpan, steps: 4, profile: () => ({ ...e, thick: 0.1, camber: -0.05 }), materialAt: () => SLOT.CARBON }), slots);
  }
}
