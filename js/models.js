// Switches the stage between the rigged procedural car and models loaded from .obj files
// (built-in samples, drag-and-drop, or the car re-imported from its own export).
import * as THREE from 'three';
import { parseOBJ } from './objLoader.js';
import { exportOBJ } from './objExporter.js';

export const CAR = 'F1 car (procedural, rigged)';
export const SAMPLES = {
  'Sample: cube': 'models/cube.obj',
  'Sample: traffic cone': 'models/cone.obj',
  'Sample: wheel': 'models/wheel.obj',
};

export function createModelViewer(app, infoEl) {
  const state = { model: CAR };
  let loaded = null;

  // The offline single-file build embeds the samples, because file:// pages cannot fetch().
  async function readSample(path) {
    const embedded = window.EMBEDDED_MODELS?.[path];
    if (embedded) return embedded;
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.text();
  }

  function setRoot(root) {
    app.activeRoot = root;
    app.selection.select(null);
    app.tree.build(root);
    app.display.setRoot(root);
  }

  function removeLoaded() {
    if (!loaded) return;
    loaded.removeFromParent();
    loaded.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    loaded = null;
  }

  function showText(text, name) {
    const { object, stats } = parseOBJ(text, name);
    removeLoaded();
    // Auto-fit only models that are far from car scale; the re-imported car keeps its meters.
    const box = new THREE.Box3().setFromObject(object);
    const size = Math.max(...box.getSize(new THREE.Vector3()).toArray());
    const scale = size > 0 && (size < 0.5 || size > 10) ? 3 / size : 1;
    const center = box.getCenter(new THREE.Vector3());
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale); // centered, resting on the ground
    loaded = object;
    app.stage.scene.add(object);
    app.car.root.visible = false;
    setRoot(object);

    const ignored = Object.entries(stats.ignored).map(([k, v]) => `${k} ×${v}`).join(', ');
    infoEl.innerHTML = `<b>${name}</b>: ${stats.groups} group(s), ${stats.vertices} vertices, ${stats.normals} normals, ${stats.triangles} triangles`
      + (scale !== 1 ? `, auto-scaled ×${scale.toFixed(2)}` : '')
      + (ignored ? `<br><small>Skipped lines: ${ignored}</small>` : '')
      + '<br><span class="warn">Joints: 0.</span> The parts are here but nothing is rigged: an .obj stores geometry, not pivots or hierarchy.';
    infoEl.hidden = false;
  }

  function showCar() {
    removeLoaded();
    app.car.root.visible = true;
    infoEl.hidden = true;
    state.model = CAR;
    setRoot(app.car.root);
  }

  async function choose(name) {
    state.model = name;
    if (name === CAR) return showCar();
    try {
      showText(await readSample(SAMPLES[name]), SAMPLES[name].split('/').pop());
    } catch (err) {
      infoEl.innerHTML = `<span class="warn">Could not load ${name}:</span> ${err.message}`;
      infoEl.hidden = false;
    }
  }

  // Drag and drop any .obj file onto the page.
  window.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dropping'); });
  window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    document.body.classList.remove('dropping');
    const file = [...e.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith('.obj'));
    if (!file) return;
    state.model = `Dropped: ${file.name}`;
    showText(await file.text(), file.name);
    app.ui.refresh();
  });

  // Export the car and immediately load the text back: the rigging-loss demo.
  function reimportCar() {
    state.model = 'Exported car';
    showText(exportOBJ(app.car.root), 'f1-car.obj (re-imported)');
  }

  return { state, choose, showCar, reimportCar };
}
