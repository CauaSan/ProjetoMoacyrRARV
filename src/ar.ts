import * as THREE from 'three';

export function setupARHitTest(renderer: THREE.WebGLRenderer, scene: THREE.Scene, onAnchor: (ponto: THREE.Vector3) => void) {
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.09, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4f7cff })); reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
  let source: XRHitTestSource | null = null; let requested = false; let ancorada = false;
  const controller = renderer.xr.getController(0); scene.add(controller); controller.addEventListener('select', () => { if (!ancorada && reticle.visible) { const p = new THREE.Vector3().setFromMatrixPosition(reticle.matrix); ancorada = true; onAnchor(p); reticle.visible = false; } });
  return { get ancorada() { return ancorada; }, reiniciar(): void { ancorada = false; source = null; requested = false; reticle.visible = false; }, update(frame: XRFrame): void { const session = renderer.xr.getSession(); const ref = renderer.xr.getReferenceSpace(); if (!session || !ref) return; if (!requested) { requested = true; session.requestReferenceSpace('viewer').then(v => session.requestHitTestSource?.({ space: v })).then(s => { source = s ?? null; }).catch(() => { source = null; }); session.addEventListener('end', () => { source = null; requested = false; }); } if (!source) return; const results = frame.getHitTestResults(source); if (!results.length) { reticle.visible = false; return; } const pose = results[0].getPose(ref); if (pose) { reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); } } };
}
