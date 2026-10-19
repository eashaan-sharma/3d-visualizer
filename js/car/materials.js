// Shared materials. "Physical" materials add a clearcoat layer: the glossy lacquer on top
// of car paint that gives the sharp reflections.
import * as THREE from 'three';

export const DEFAULT_LIVERY = '#8a0b12';

export function createMaterials() {
  return {
    // Deep red with a soft satin finish: rougher base and a weaker, blurrier clearcoat.
    paint: new THREE.MeshPhysicalMaterial({ color: DEFAULT_LIVERY, roughness: 0.55, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#f1f1f1', roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }),
    carbon: new THREE.MeshPhysicalMaterial({ color: '#111215', roughness: 0.45, metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 0.5 }),
    carbonShell: new THREE.MeshPhysicalMaterial({ color: '#111215', roughness: 0.45, metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide, envMapIntensity: 0.5 }),
    floor: new THREE.MeshPhysicalMaterial({ color: '#0e0f12', roughness: 0.9, specularIntensity: 0.25, envMapIntensity: 0.2 }),
    matte: new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.95 }),
    tyre: new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.82 }),
    tyreBand: new THREE.MeshStandardMaterial({ color: '#f4c20d', roughness: 0.6 }),
    rim: new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.3, metalness: 0.9 }),
    rimInside: new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: '#8a8f99', roughness: 0.35, metalness: 0.9 }),
    visor: new THREE.MeshPhysicalMaterial({ color: '#1c2430', roughness: 0.05, metalness: 0.6, clearcoat: 1 }),
    helmet: new THREE.MeshPhysicalMaterial({ color: '#f6f6f6', roughness: 0.3, clearcoat: 1 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#cfd6e0', roughness: 0.05, metalness: 1 }),
    light: new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff1010', emissiveIntensity: 2 }),
    screen: new THREE.MeshStandardMaterial({ color: '#0e2a3a', emissive: '#1a9bd6', emissiveIntensity: 0.8 }),
  };
}

// Material slots used by lofts: materialAt(u, v) returns one of these indices.
export const SLOT = { PAINT: 0, WHITE: 1, CARBON: 2, MATTE: 3 };
export const slotList = (m) => [m.paint, m.white, m.carbon, m.matte];
