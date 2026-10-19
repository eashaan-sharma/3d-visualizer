// Two HTML panels:
//  - the matrix panel: name, parent chain, LOCAL and WORLD 4x4 matrices of the selection,
//    refreshed live while things move;
//  - the hierarchy tree: the whole scene graph, click a row to select that node.
import * as THREE from 'three';
import { isPart } from './car/rig.js';
import { isSelectable } from './selection.js';

const RAD2DEG = 180 / Math.PI;

// Three.js stores matrices column by column (elements[col * 4 + row]); print them row by row,
// the way they are written in a textbook. The last column is the translation.
function formatMatrix(m) {
  const e = m.elements;
  const cell = (v) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3).padStart(7);
  let s = '';
  for (let row = 0; row < 4; row++) {
    s += `[${[0, 1, 2, 3].map((col) => cell(e[col * 4 + row])).join(' ')} ]\n`;
  }
  return s;
}

// Names from the root of the graph down to the node.
function chainOf(node) {
  const chain = [];
  for (let n = node; n; n = n.parent) if (isSelectable(n)) chain.unshift(n.userData.label ?? n.name);
  return chain;
}

export function createMatrixPanel(el) {
  el.innerHTML = `
    <h3 class="mp-name"></h3>
    <div class="mp-chain"></div>
    <div class="mp-grid">
      <div><h4 class="mp-local-title">Local matrix</h4><pre class="mp-local"></pre></div>
      <div><h4>World matrix</h4><pre class="mp-world"></pre></div>
    </div>
    <div class="mp-info"></div>`;
  const q = (c) => el.querySelector(c);
  const product = new THREE.Matrix4();
  let node = null;
  let timer = 0;

  function show(n) {
    node = n;
    el.hidden = !n;
    if (!n) return;
    q('.mp-name').textContent = n.userData.label ?? n.name;
    const chain = chainOf(n);
    q('.mp-chain').innerHTML = `World = ${chain.map((c) => `<span>${c}</span>`).join(' &times; ')}<small> (each one's local matrix)</small>`;
    q('.mp-local-title').textContent = isPart(n) ? 'Local = Base × Explode × Joint' : 'Local matrix';
    refresh();
  }

  function refresh() {
    if (!node) return;
    q('.mp-local').textContent = formatMatrix(node.matrix);
    q('.mp-world').textContent = formatMatrix(node.matrixWorld);
    // Check the scene graph rule numerically: parent.world x local should equal world.
    product.multiplyMatrices(node.parent.matrixWorld, node.matrix);
    const err = Math.max(...product.elements.map((v, i) => Math.abs(v - node.matrixWorld.elements[i])));
    const joints = isPart(node)
      ? node.userData.rig.joints.map((j) => `${j.name} ${(j.angle * RAD2DEG).toFixed(1)}° about ${j.axis.toUpperCase()}`).join(', ') || 'none (fixed part)'
      : 'none: loaded from .obj, which stores geometry but no rigging';
    q('.mp-info').innerHTML = `<b>Joints:</b> ${joints}<br><b>Check:</b> parent.world × local − world = ${err.toExponential(1)}`;
  }

  // Refresh about 10 times a second: fast enough to look live, cheap on the DOM.
  function update(dt) {
    timer += dt;
    if (timer > 0.1) { timer = 0; refresh(); }
  }

  show(null);
  return { show, update };
}

export function createTreePanel(el, onPick) {
  let rows = new Map(); // node -> row element

  function build(root) {
    rows = new Map();
    const list = document.createElement('ul');
    const add = (node, parentList) => {
      const li = document.createElement('li');
      const row = document.createElement('button');
      row.type = 'button';
      row.textContent = node.userData.label ?? node.name;
      row.addEventListener('click', () => onPick(node));
      li.appendChild(row);
      rows.set(node, row);
      const kids = node.children.filter(isSelectable);
      if (kids.length) {
        const ul = document.createElement('ul');
        kids.forEach((k) => add(k, ul));
        li.appendChild(ul);
      }
      parentList.appendChild(li);
    };
    add(root, list);
    el.querySelector('.tree-body').replaceChildren(list);
  }

  function highlight(node) {
    for (const [n, row] of rows) row.classList.toggle('active', n === node);
    if (node) rows.get(node)?.scrollIntoView({ block: 'nearest' });
    else el.querySelector('.tree-body').scrollTop = 0;
  }

  return { build, highlight };
}
