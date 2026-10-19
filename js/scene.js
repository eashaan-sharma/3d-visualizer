// The "stage": renderer, camera, lights, environment and ground.
// Everything the car needs to look good, but nothing car-specific.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

export const MAX_PIXEL_RATIO = 1.5;

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // High-DPI screens can have a pixel ratio of 2-3; rendering that many pixels is expensive
  // on integrated graphics, so we cap it.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  // Tone mapping squeezes the bright lighting range into what the screen can show.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // filtered (smoothed) shadow edges
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10141b');
  scene.fog = new THREE.Fog('#10141b', 18, 45);

  // Image-based lighting: a blurred virtual room is used for reflections on shiny paint.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  // Sky/ground ambient light plus one "sun" that casts shadows and a cool rim light from behind.
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#2a2420', 0.6));

  const keyLight = new THREE.DirectionalLight('#ffffff', 2.4);
  keyLight.position.set(4, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  const s = keyLight.shadow.camera;
  s.left = -4; s.right = 4; s.top = 4; s.bottom = -4; s.near = 1; s.far = 20;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight('#9fc4ff', 1.2);
  rimLight.position.set(-6, 3, -4);
  scene.add(rimLight);

  // Ground: a matte disc that receives the car's shadow, with a subtle 1 m grid on top.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: '#1a1f27', roughness: 0.9, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(30, 30, '#4a5568', '#2a313d');
  grid.position.y = 0.002; // lift slightly to avoid z-fighting with the ground
  scene.add(grid);

  // Units are meters. A 40° vertical field of view is close to a normal camera lens.
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  camera.position.set(5.2, 2.4, 6.2);
  camera.lookAt(0, 0.4, 0);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, keyLight, ground, grid };
}
