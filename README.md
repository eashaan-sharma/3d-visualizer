# F1 Scene Graph Visualizer

An interactive, browser-based model of a 2022-regulation Formula 1 car, built to teach the core ideas of 3D modelling. The car is generated procedurally in code as a scene graph of 24 named parts, each with its pivot in the right place. You can steer it, spin the wheels, open the DRS flap, pull it apart in an animated "pit stop", orbit around it with a hand-written quaternion arcball, click any part to see its live local and world matrices, and export it to `.obj` to see that the format keeps the geometry but loses the rigging. Everything runs locally in plain HTML, CSS and JavaScript modules (Three.js for rendering, lil-gui for the control panel), with no build step and no internet connection.

**Live version:** https://eashaan-sharma.github.io/3d-visualizer/

## Concepts demonstrated

| Concept | What to try |
| --- | --- |
| **Scene graph** | The "Scene graph" panel shows the tree. Turn on *Display → Show pivots* to see every node's local axes. |
| **Model transforms** | Click a part. The panel shows its local matrix (`Base × Explode × Joint`, where Base is `T × R × S`), its world matrix, and the chain `World = Chassis × FL upright × FL wheel`. |
| **Forward kinematics** | Steering angle (the uprights yaw and the steering wheel turns 4.5× as far), Drive and Speed (the wheels spin at speed ÷ radius), DRS open (animated hinge), front flap angle. |
| **Transform order matters** | *Wrong transform order* swaps `R_steer × R_spin` for `R_spin × R_steer`, and the front wheels wobble. |
| **Exploded view** | The *Explode* slider and the *Pit stop!* button. The kinematics keep working while the car is apart. |
| **Arcball (quaternions)** | Left-drag to rotate, scroll to zoom, right-drag to pan. *Show arcball sphere* draws the virtual ball. |
| **Raycasting / picking** | Click any part, or a row in the tree. |
| **Display modes** | Solid, Wireframe, Surface normals, Show pivots. |
| **.obj loading and export** | Built-in samples, drag-and-drop, *Export car as .obj*, and *Reload exported car* (the parts come back but the joints do not). |

## Controls

**Mouse:** left-drag to rotate · right-drag to pan · scroll to zoom · click to select a part.

| Key | Action |
| --- | --- |
| `R` | Reset everything to the starting state |
| `P` | Pit stop (explode out and back) |
| `D` | Drive on / off |
| `A` | Auto-rotate on / off (any drag, scroll or pan pauses it) |
| `T` | Guided tour (`←` / `→` to step, `Esc` to exit) |
| `H` | Hide / show the UI |
| `1`–`5` | Camera presets: Front, Side, Top, Rear ¾, Cockpit |

The control panel also has: Rotate speed, Performance mode (for integrated graphics), Show FPS, and a livery colour picker.

## Running locally

Browsers do not allow JavaScript modules to load from `file://` pages, so the app needs a small local web server. One is included, and it uses only Windows PowerShell (nothing to install):

1. Double-click **`start-server.bat`**. It starts the server and opens http://localhost:8080/.
2. Close the console window (or press `Ctrl+C`) to stop it.

Or, from a terminal in the project folder:

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
```

### Offline single file

`dist/3d-visualizer-offline.html` is the whole app in one file. Double-click it: no server and no internet needed. After changing the source, rebuild it with:

```bash
powershell -ExecutionPolicy Bypass -File tools/build-offline.ps1
```

## Project structure

```
index.html              page layout and import map
css/style.css           dark, projector-friendly theme
js/main.js              wires all modules together and runs the render loop
js/scene.js             renderer, lights, environment, ground, performance mode
js/car/                 the procedural car: rig.js (part nodes and matrices), buildCar.js,
                        body.js, aero.js, wheels.js, suspension.js, shapes.js, materials.js, dims.js
js/kinematics.js        joint angles: steering, wheel spin, DRS, flap, wrong-order demo
js/explode.js           exploded view and pit stop animation
js/arcball.js           hand-written quaternion arcball, zoom, pan, auto-rotate
js/selection.js         raycast picking and highlight
js/panels.js            matrix panel and scene graph tree
js/displayModes.js      solid / wireframe / normals / pivots
js/objLoader.js         hand-written .obj parser
js/objExporter.js       hand-written .obj exporter
js/models.js            switching between the car and loaded .obj models
js/presentation.js      camera presets and global reset
js/tour.js              guided tour
js/ui.js                control panel and keyboard shortcuts
js/fps.js               FPS counter
models/                 sample .obj files (cube, traffic cone, wheel)
lib/                    Three.js r186.1 and lil-gui 0.21.0, stored locally
tools/                  serve.ps1 (local server) and build-offline.ps1 (single-file build)
docs/how-it-works.md    plain-language explanation of each concept, with file and function names
```

## Screenshots

_Screenshots to be added._

<!-- ![Rear three-quarter view](docs/screenshots/rear-three-quarter.png) -->

## Credits

- [Three.js](https://threejs.org/) r186.1 (MIT licence) for WebGL rendering, matrix and quaternion math.
- [lil-gui](https://lil-gui.georgealways.com/) 0.21.0 (MIT licence) for the control panel.

The car is an original, stylized design inspired by 2022-regulation proportions. It carries no team names, logos, sponsor marks or driver numbers.
