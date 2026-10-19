// Entry point: builds the stage and runs the render loop.
import * as THREE from 'three';
import { createStage } from './scene.js';

const stage = createStage(document.getElementById('viewport'));

// Temporary 1 m reference cube to check lighting, shadows and scale.
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshPhysicalMaterial({ color: '#c8161d', roughness: 0.35, clearcoat: 1 })
);
cube.position.y = 0.5;
cube.castShadow = true;
stage.scene.add(cube);

let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1); // seconds since last frame, clamped after tab switches
  last = now;
  cube.rotation.y += dt * 0.5;
  stage.renderer.render(stage.scene, stage.camera);
}
stage.renderer.setAnimationLoop(tick);
