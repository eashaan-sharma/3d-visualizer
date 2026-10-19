// Hand-written arcball camera (Ken Shoemake, "ARCBALL", 1992).
//
// Idea: imagine a glass ball filling the middle of the screen. Pressing the mouse touches the
// ball at point p0; dragging rolls it to p1. The rotation that carries p0 to p1 is turned into
// a quaternion and applied to the view. Quaternions avoid gimbal lock and give smooth,
// predictable rotation about any axis (Euler angles would not).
//
// The camera is described by three things:
//   target   - the point we orbit around
//   distance - how far the camera sits from the target
//   orient   - a quaternion: the camera's rotation in the world
// and   camera.position = target + orient * (0, 0, distance)   (the camera looks down its -Z).
import * as THREE from 'three';

// Aimed a little to the right of the car so it sits clear of the control panel.
export const DEFAULT_VIEW = { position: [6.3, 2.5, 6.0], target: [0.75, 0.3, -0.55] };
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const MIN_DIST = 1.2, MAX_DIST = 25;

export function createArcball({ camera, dom, overlay }) {
  const target = new THREE.Vector3();
  const orient = new THREE.Quaternion();
  let distance = 8;

  const state = { autoRotate: false, autoRotateSpeed: 12, showSphere: false };
  let onInteract = () => {};
  let drag = null;  // { mode: 'rotate' | 'pan', ... } while a mouse button is held
  let anim = null;  // camera transition in progress (presets, reset)

  // --- Screen point -> point on the virtual unit sphere ------------------------------------
  function sphereFrame() {
    const r = dom.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, R: 0.45 * Math.min(r.width, r.height) };
  }
  function toSphere(clientX, clientY) {
    const { cx, cy, R } = sphereFrame();
    const p = new THREE.Vector3((clientX - cx) / R, (cy - clientY) / R, 0); // y flipped: screen y grows downward
    const d2 = p.x * p.x + p.y * p.y;
    if (d2 <= 1) p.z = Math.sqrt(1 - d2); // on the ball: lift onto the front of the sphere
    else p.normalize();                    // outside: snap to the rim (rotates about the view axis)
    return p;
  }

  // Shoemake's formula: q = [ p0 . p1 ,  p0 x p1 ]   (w, then x y z).
  // A unit quaternion stores HALF its rotation angle, so this rotates by twice the angle
  // between p0 and p1, about the axis perpendicular to both. Dragging across the whole
  // ball therefore turns the view a full 360 degrees.
  function arcQuaternion(p0, p1) {
    const axis = new THREE.Vector3().crossVectors(p0, p1);
    return new THREE.Quaternion(axis.x, axis.y, axis.z, p0.dot(p1));
  }

  // --- Applying the state to the camera ----------------------------------------------------
  function apply() {
    camera.quaternion.copy(orient);
    camera.position.set(0, 0, distance).applyQuaternion(orient).add(target);
  }

  // Build target/distance/orient from an eye position and a point to look at.
  function viewToState({ position, target: t, up = [0, 1, 0] }) {
    const eye = new THREE.Vector3(...position), tgt = new THREE.Vector3(...t);
    const m = new THREE.Matrix4().lookAt(eye, tgt, new THREE.Vector3(...up));
    return { orient: new THREE.Quaternion().setFromRotationMatrix(m), target: tgt, distance: eye.distanceTo(tgt) };
  }

  function setView(view) {
    const s = viewToState(view);
    orient.copy(s.orient); target.copy(s.target); distance = s.distance;
    anim = null;
    apply();
  }

  // Smoothly fly to a view: slerp (spherical interpolation) for the rotation, lerp for the rest.
  function animateTo(view, duration = 0.9) {
    const to = viewToState(view);
    anim = { t: 0, duration, to, from: { orient: orient.clone(), target: target.clone(), distance } };
  }

  // --- Mouse input -------------------------------------------------------------------------
  dom.addEventListener('contextmenu', (e) => e.preventDefault());

  dom.addEventListener('pointerdown', (e) => {
    const mode = e.button === 0 ? 'rotate' : 'pan';
    drag = { mode, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false, p0: toSphere(e.clientX, e.clientY), startOrient: orient.clone() };
    drag.p1 = drag.p0.clone();
    dom.setPointerCapture(e.pointerId);
  });

  dom.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 3) return; // ignore click jitter
    if (!drag.moved) { drag.moved = true; anim = null; onInteract(); }

    if (drag.mode === 'rotate') {
      drag.p1 = toSphere(e.clientX, e.clientY);
      // The ball (the scene) turns by q in camera space. Moving the camera the opposite way
      // gives the same picture:  orient = startOrient x q^-1.
      const q = arcQuaternion(drag.p0, drag.p1);
      orient.copy(drag.startOrient).multiply(q.invert());
    } else {
      // Pan: slide the target in the camera's own right/up directions, scaled so the
      // ground under the cursor moves with the mouse.
      const worldPerPixel = (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / dom.clientHeight;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(orient);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(orient);
      target.addScaledVector(right, -(e.clientX - drag.lastX) * worldPerPixel);
      target.addScaledVector(up, (e.clientY - drag.lastY) * worldPerPixel);
    }
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
  });

  const endDrag = () => { drag = null; };
  dom.addEventListener('pointerup', endDrag);
  dom.addEventListener('pointercancel', endDrag);

  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    anim = null;
    onInteract();
    // Multiplying (not adding) makes each scroll step feel the same near and far.
    distance = THREE.MathUtils.clamp(distance * Math.exp(e.deltaY * 0.0012), MIN_DIST, MAX_DIST);
  }, { passive: false });

  // --- Per-frame update --------------------------------------------------------------------
  const spin = new THREE.Quaternion();
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

  function update(dt) {
    if (anim) {
      anim.t += dt;
      const k = ease(Math.min(anim.t / anim.duration, 1));
      orient.slerpQuaternions(anim.from.orient, anim.to.orient, k);
      target.lerpVectors(anim.from.target, anim.to.target, k);
      distance = THREE.MathUtils.lerp(anim.from.distance, anim.to.distance, k);
      if (k === 1) anim = null;
    } else if (state.autoRotate && !drag) {
      // Turntable: rotate the camera about the world's vertical axis through the target.
      spin.setFromAxisAngle(WORLD_UP, THREE.MathUtils.degToRad(state.autoRotateSpeed) * dt);
      orient.premultiply(spin);
    }
    apply();
    drawSphere();
  }

  // --- Optional on-screen drawing of the virtual ball --------------------------------------
  const ctx = overlay.getContext('2d');
  function drawSphere() {
    const dpr = window.devicePixelRatio;
    const w = overlay.clientWidth, h = overlay.clientHeight;
    if (overlay.width !== Math.round(w * dpr) || overlay.height !== Math.round(h * dpr)) {
      overlay.width = Math.round(w * dpr);
      overlay.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!state.showSphere) return;

    const r = dom.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2, R = 0.45 * Math.min(r.width, r.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(120, 190, 255, 0.55)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    // The equator and the central meridian of the ball, seen from the front.
    ctx.strokeStyle = 'rgba(120, 190, 255, 0.25)';
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.25, R, 0, 0, Math.PI * 2); ctx.stroke();

    if (drag && drag.mode === 'rotate') {
      // The great-circle arc from p0 to p1 across the ball (orthographic view of the sphere).
      const toScreen = (p) => [cx + p.x * R, cy - p.y * R];
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 32; i++) {
        const p = drag.p0.clone().lerp(drag.p1, i / 32).normalize();
        const [x, y] = toScreen(p);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (const [p, color] of [[drag.p0, '#ffffff'], [drag.p1, '#ffd23f']]) {
        const [x, y] = toScreen(p);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  setView(DEFAULT_VIEW);

  return {
    state,
    update,
    setView,
    animateTo,
    reset: () => animateTo(DEFAULT_VIEW),
    set onInteract(fn) { onInteract = fn; },
    isDragging: () => drag !== null && drag.moved,
  };
}
