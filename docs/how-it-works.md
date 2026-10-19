# How it works

A plain-language guide to each concept in the visualizer, with the file and function that implements it. Coordinates are in **meters**: **+X is forward**, **+Y is up** and **+Z is the car's right-hand side**. The origin is on the ground, between the axles.

---

## 1. Scene graph

**Idea.** A scene graph is a tree of nodes. Every node is positioned *relative to its parent*, so moving a parent carries all its children with it. The car's tree:

```
Chassis (root)
├── Nose cone, Cockpit, Halo, Sidepod L, Sidepod R, Engine cover, Floor
├── Front wing ── Front wing flap
├── Rear wing ── DRS flap
├── Beam wing
├── FL upright ── FL wheel          FR upright ── FR wheel
├── RL wheel, RR wheel
├── Steering wheel
└── Suspension FL / FR / RL / RR
```

Each node has a **pivot**: the point it rotates about, which is its local origin. A wheel's pivot is its axle center, the DRS flap's pivot is its hinge, and the front upright's pivot is the steering axis (the kingpin), which sits 10 cm inboard of the wheel center.

**Where:**
- `js/car/rig.js`: `createPart()` creates a part node, `addJoint()` gives it a rotational joint.
- `js/car/buildCar.js`: `buildCar()` assembles the tree. Its inner `part()` places a node by its pivot in car coordinates, and `mesh()` shifts geometry by minus the pivot so the pivot lands at the local origin. That shift is the trick that makes every rotation happen about the right point.
- `js/car/body.js`, `aero.js`, `wheels.js`, `suspension.js`: the individual parts.

## 2. Model transforms (local and world matrices)

**Idea.** Each node stores a 4×4 **local matrix**: how to get from the node's own frame to its parent's frame. It is built from three pieces:

```
local = Base × Explode × Joint
Base  = T × R × S      (translate × rotate × scale: where the part sits when assembled)
```

Read a product right to left: a point is first scaled, then rotated, then translated. So `T × R × S` rotates the part about its own pivot and then moves it into place. The other order, `R × T`, would swing the part around the parent's origin instead.

The **world matrix** of a node is its parent's world matrix times its local matrix:

```
world(FL wheel) = world(FL upright) × local(FL wheel)
               = local(Chassis) × local(FL upright) × local(FL wheel)
```

The matrix panel shows this chain and checks it numerically (`parent.world × local − world`, which should be about 0).

**Where:**
- `js/car/rig.js`: `updateLocalMatrix()` builds `Base × Explode × Joint`. `Matrix4.compose()` produces exactly `T × R × S`. `updateRig()` does this for every part.
- `js/main.js`: `stage.scene.updateMatrixWorld()` in `tick()` walks the tree and computes `world = parent.world × local`.
- `js/panels.js`: `createMatrixPanel()` → `refresh()` prints both matrices. `formatMatrix()` prints them row by row (Three.js stores matrices column by column).

## 3. Forward kinematics

**Idea.** In forward kinematics we choose the **joint angles**, and the scene graph works out where every part ends up. Nothing is moved in world space directly.
- **Steering:** the uprights yaw about Y. Because each front wheel is a *child* of its upright, the wheel's spin axis turns with the steering for free.
- **Steering wheel:** turns about its column by `STEERING_RATIO` (4.5) times the road-wheel angle. Its base rotation tilts the column, so it is a part with a non-zero R in `T × R × S`.
- **Wheel spin:** rolling without slipping means angular speed = linear speed ÷ radius (`v / r`). A negative angle about +Z rolls the wheel forward.
- **DRS:** the flap is hinged near its trailing edge, and its angle eases toward the open or closed target each frame (exponential smoothing, frame-rate independent).
- **Front flap:** hinged at its leading edge. Raising the trailing edge is a negative rotation about +Z.

**Where:** `js/kinematics.js` → `createKinematics()` → `update(dt)`. The joints themselves are declared in `js/car/wheels.js` (`steer`, `spin`) and `js/car/aero.js` (`flap`, `drs`).

## 4. Wrong transform order

**Idea.** Matrix multiplication is not commutative: `A × B ≠ B × A`.
- **Correct:** `R_steer × R_spin`. The wheel spins about its own axle, then the spinning wheel is steered.
- **Wrong:** `R_spin × R_steer`. The wheel is steered first and then spun about the *original, unsteered* axle, so the steered wheel tumbles and wobbles.

The toggle puts both rotations into the wheel's own joint list in the wrong order (and zeroes the upright).

**Where:** `js/kinematics.js` → the `state.wrongOrder` branch in `update()`, using the extra `steerWrong` joint added in `js/car/wheels.js`.

## 5. Exploded view / pit stop

**Idea.** One number, `amount` (0 to 1), drives everything. Each part has its own explode direction and distance and turns the number into a translation. Where that translation sits in the product is what keeps the kinematics alive:

```
local = Base × Explode × Joint
```

The joint rotation is applied *first* (rightmost), about the pivot, so a pulled-off wheel still spins about its axle. A front wheel slides out along its parent upright's axis, so it still steers while it is off. The pit stop animates the amount out, holds it, and brings it back with an ease-in-out cubic (zero speed at both ends).

**Where:** `js/explode.js` → `createExplode()`, `pitStop()`, `update()`, `easeInOutCubic()`. The explode term is in `js/car/rig.js` → `updateLocalMatrix()`. Each part's `explodeDir` and `explodeDist` are set where the part is created (`body.js`, `aero.js`, `wheels.js`, `suspension.js`).

## 6. Arcball (Shoemake, with quaternions)

**Idea.** Imagine a glass ball filling the middle of the screen.
1. A mouse position `(x, y)` is mapped onto the ball. If it is inside the circle, it is lifted onto the front of the sphere with `z = √(1 − x² − y²)`. Outside the circle, it snaps to the rim.
2. Dragging from sphere point `p0` to `p1` gives Shoemake's quaternion `q = [p0 · p1, p0 × p1]` (w first, then x, y, z).
3. A unit quaternion stores *half* its rotation angle, so this rotates by twice the angle between `p0` and `p1`, about the axis perpendicular to both.

Quaternions avoid gimbal lock and interpolate smoothly (`slerp`), which is also how the camera presets fly from view to view.

The camera orbits instead of rotating the car: rotating the scene by `q` looks the same as moving the camera by `q⁻¹`, so `orient = startOrient × q⁻¹`. The camera position is then `target + orient × (0, 0, distance)`.

- **Zoom** multiplies the distance (so every scroll step feels the same).
- **Pan** moves the target along the camera's right and up vectors.
- **Auto-rotate** turns `orient` about the world Y axis each frame. Any drag, scroll or pan switches it off.

**Where:** `js/arcball.js` → `createArcball()`. `toSphere()` maps the mouse onto the ball, `arcQuaternion()` builds `q`, the `pointermove` handler rotates and pans, the `wheel` handler zooms, `update()` handles auto-rotate and preset animations (slerp), and `drawSphere()` draws the optional on-screen ball and drag arc.

## 7. Selection (raycasting) and the matrix panel

**Idea.**
1. The clicked pixel is converted to normalized device coordinates (−1 to 1).
2. A ray is cast from the camera through that point, and the closest triangle it hits wins.
3. That hit is usually a small mesh deep inside a part, so we walk up the tree to the part that owns it.

The yellow box is the part's bounding box measured in its *local* frame. Because the box is a child of the part, it turns and slides with it. The small axes mark the pivot.

**Where:**
- `js/selection.js`: `createSelection()` → `pick()` and `select()`, plus `ownerOf()` and `ownMeshes()`. A press and release under 4 px apart counts as a click; anything longer is an arcball drag.
- `js/panels.js`: `createMatrixPanel()` (live matrices, about 10 refreshes a second) and `createTreePanel()` (the clickable hierarchy).

## 8. Display modes

- **Wireframe:** draws only the triangle edges (`material.wireframe = true`).
- **Surface normals:** a normal is the direction a surface faces. Lighting depends on the angle between the normal and the light, which is what makes surfaces look smooth or faceted. The mode colours the car by its normals (x → red, y → green, z → blue, in camera space) and draws a short line at every vertex.
- **Show pivots:** small axes at every node origin, drawn on top so buried ones show.

**Where:** `js/displayModes.js` → `createDisplayModes()` → `apply()`, using Three.js's `VertexNormalsHelper` and `AxesHelper`.

## 9. .obj loader and exporter (and why the rigging is lost)

**Idea.** An .obj file is plain text, one statement per line:
- `v` — a vertex position
- `vn` — a vertex normal
- `vt` — a texture coordinate (counted but not used here)
- `o` / `g` — start a named object or group
- `f` — a face, listing corners as `v`, `v/vt`, `v//vn` or `v/vt/vn` (1-based indices; negative indices count back from the last vertex)

The parser splits polygons into a fan of triangles. If a file has no normals, it computes flat ones per triangle (see the traffic cone sample).

The exporter writes one `o` per part. It transforms positions by each mesh's world matrix (the current pose is baked in), and normals by the **normal matrix** (the inverse-transpose of the world matrix), which keeps them perpendicular to the surface.

**What is lost:** an .obj has no way to store parent/child links, pivots or joint axes. After *Reload exported car*, the 24 parts come back by name, but as a flat list of static pieces: nothing can steer, spin or explode. Formats such as glTF store a node hierarchy (and skins for skeletal rigs) for exactly this reason.

**Where:** `js/objLoader.js` → `parseOBJ()`. `js/objExporter.js` → `exportOBJ()`. `js/models.js` → `createModelViewer()`: `showText()` (load and auto-fit), `reimportCar()` (export and reload), the drag-and-drop handlers, and `readSample()`.

## 10. Presentation features

- **Camera presets, global reset, hide UI:** `js/presentation.js` → `PRESETS`, `createActions()` → `preset()`, `resetScene()`, `resetAll()`, `toggleUI()`.
- **Guided tour:** `js/tour.js` → `STEPS` (one entry per concept, each with an `enter()` that sets up the demo) and `createTour()`.
- **Control panel and keyboard shortcuts:** `js/ui.js` → `createUI()` (the `keys` table maps each key to an action).

## 11. Performance and offline use

- **Pixel ratio cap:** `MAX_PIXEL_RATIO = 1.5` in `js/scene.js`. High-DPI screens would otherwise render 4–9× the pixels.
- **Performance mode:** `setPerformanceMode()` in `js/scene.js` sets pixel ratio 1, turns off the shadow pass and the clearcoat layer, and flags materials to recompile.
- **FPS counter:** `js/fps.js`.
- **Local server:** `tools/serve.ps1` (a small .NET `HttpListener`), started by `start-server.bat`. Browsers block ES modules on `file://`, so the normal app needs `http://localhost`.
- **Single-file build:** `tools/build-offline.ps1` turns every module into a `data:` URL and writes an import map that points each import name at one. It also inlines the CSS and the sample models (`window.EMBEDDED_MODELS`), because `fetch()` does not work on `file://`. The result, `dist/3d-visualizer-offline.html`, runs by double-clicking.

## 12. The car's geometry

Everything is procedural (generated in code). The main tool is a **loft**: a list of cross-section rings with a skin stitched between them, like boat ribs with a hull over them.
- **Nose, tub, engine cover and airbox:** superellipse rings.
- **Sidepods:** spline rings with a raised inner and outer lip and a trough between them (the "bathtub").
- **Wings:** airfoil rings (NACA thickness formula, negative camber for downforce).
- **Wheels:** a lathe of the tyre's cross-section.
- **Livery bands:** chosen per face by the ring coordinate, so stripes get clean edges.
- **Winding:** a signed-volume test flips any loft that came out inside-out.

**Where:** `js/car/shapes.js` → `loft()`, `superRing()`, `curveRing()`, `airfoilRing()`, `wing()`, `plate()`, `slab()`, `strut()`. Also `js/car/materials.js` (colours, clearcoat) and `js/car/dims.js` (key dimensions: 3.6 m wheelbase, 0.72 m wheels).

---

## Quick answers for Q&A

- **Why quaternions instead of Euler angles?** Euler angles can lose a degree of freedom (gimbal lock) and interpolate unevenly. Quaternions compose cleanly and slerp smoothly.
- **Why is the order T × R × S?** Scale and rotate about the part's own pivot first, then move it into place. Any other order moves the pivot.
- **Why is the upright a separate node from the wheel?** Steering and spinning are different joints about different axes. Nesting them is what makes the spin axis follow the steering.
- **Why does the steered wheel swing slightly forward and back?** The steering axis (kingpin) is inboard of the wheel center, like on a real car.
- **What is the normal matrix?** The inverse-transpose of the model matrix. Under non-uniform scaling, normals transformed by the plain matrix would no longer be perpendicular to the surface.
