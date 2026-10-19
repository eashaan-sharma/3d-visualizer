// Exploded view ("pit stop mode").
//
// There is ONE number, amount (0 = assembled, 1 = fully exploded). Each part turns it into
// its own slide inside rig.js:   Explode = Translate(explodeDir x explodeDist x amount)
// Because that slide sits BETWEEN the part's base placement and its joint rotation
// (local = Base x Explode x Joint), joints keep working while a part is pulled away:
// a wheel still spins about its own axle, and a pulled-off front wheel still steers,
// because it slides out along its parent upright's (steered) axis.

const OUT = 1.1, HOLD = 1.4, BACK = 1.1; // pit stop timing in seconds

// Smooth start and stop: velocity is zero at both ends of the motion.
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createExplode() {
  const state = { amount: 0 };
  let pit = null; // { t, from } while the pit stop animation runs

  function pitStop() {
    pit = { t: 0, from: state.amount };
  }

  function update(dt) {
    if (!pit) return;
    pit.t += dt;
    const t = pit.t;
    if (t < OUT) state.amount = pit.from + (1 - pit.from) * easeInOutCubic(t / OUT);
    else if (t < OUT + HOLD) state.amount = 1;
    else if (t < OUT + HOLD + BACK) state.amount = 1 - easeInOutCubic((t - OUT - HOLD) / BACK);
    else { state.amount = 0; pit = null; }
  }

  function reset() {
    pit = null;
    state.amount = 0;
  }

  return { state, pitStop, update, reset, isAnimating: () => pit !== null, cancel: () => { pit = null; } };
}
