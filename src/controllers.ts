import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRScene } from './scene';
import { reparentar } from './reparentar';

export function setupControllers(renderer: THREE.WebGLRenderer, scene: THREE.Scene, interactive: THREE.Object3D[], bandeja: THREE.Object3D, podePegar: () => boolean) {
  const raycaster = new THREE.Raycaster(); const tempMatrix = new THREE.Matrix4(); const factory = new XRControllerModelFactory();
  const controllers: THREE.XRTargetRaySpace[] = []; const selected = new Map<THREE.XRTargetRaySpace, THREE.Object3D>();
  const reset: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial()); line.scale.z = 5; c.add(line); scene.add(c); controllers.push(c);
    c.addEventListener('selectstart', () => { if (!podePegar()) return; const hit = intersect(c); if (hit) { let obj: THREE.Object3D | null = hit.object; while (obj && !interactive.includes(obj)) obj = obj.parent; if (obj) { reparentar(obj, c); selected.set(c, obj); } } });
    c.addEventListener('selectend', () => { const obj = selected.get(c); if (!obj) return; reparentar(obj, bandeja); selected.delete(c); });
    const grip = renderer.xr.getControllerGrip(i); grip.add(factory.createControllerModel(grip)); scene.add(grip);
  }
  function intersect(c: THREE.XRTargetRaySpace): THREE.Intersection | null { tempMatrix.identity().extractRotation(c.matrixWorld); raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld); raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix); const hits = raycaster.intersectObjects(interactive, true); return hits[0] ?? null; }
  return { update(): void { for (const m of reset) m.emissive.setHex(0); reset.length = 0; for (const c of controllers) { if (selected.has(c)) continue; const hit = intersect(c); const mesh = hit?.object as THREE.Mesh | undefined; const material = mesh?.material as THREE.MeshStandardMaterial | undefined; if (material && 'emissive' in material) { material.emissive.setHex(0x333300); reset.push(material); } } } };
}
