/**
 * World module: railway  (stub — to be implemented)
 * Contract: default export async build(ctx) -> THREE.Object3D (added to the scene by main.js).
 * See docs/ARCHITECTURE.md.
 */
import * as THREE from 'three';

export default async function build(ctx) {
  const group = new THREE.Group();
  group.name = 'railway';
  return group;
}
