// Frames-per-second counter: counts frames and shows the average every half second.
export function createFpsCounter(el) {
  const state = { visible: false };
  let frames = 0, time = 0;

  function update(dt) {
    el.hidden = !state.visible;
    frames++;
    time += dt;
    if (time >= 0.5) {
      el.textContent = `${Math.round(frames / time)} FPS`;
      frames = 0;
      time = 0;
    }
  }

  return { state, update };
}
