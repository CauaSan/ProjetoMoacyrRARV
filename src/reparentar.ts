import * as THREE from 'three';

export interface ResultadoReparentar {
  posAntes: THREE.Vector3;
  posDepois: THREE.Vector3;
  erroMetros: number;
  erroGraus: number;
}

export function reparentar(objeto: THREE.Object3D, novoPai: THREE.Object3D): ResultadoReparentar {
  objeto.updateWorldMatrix(true, true);
  const posAntes = new THREE.Vector3();
  const quatAntes = new THREE.Quaternion();
  objeto.getWorldPosition(posAntes);
  objeto.getWorldQuaternion(quatAntes);

  if (objeto.parent !== novoPai) novoPai.attach(objeto);

  objeto.updateWorldMatrix(true, false);
  const posDepois = new THREE.Vector3();
  const quatDepois = new THREE.Quaternion();
  objeto.getWorldPosition(posDepois);
  objeto.getWorldQuaternion(quatDepois);

  const erroMetros = posAntes.distanceTo(posDepois);
  const erroGraus = THREE.MathUtils.radToDeg(quatAntes.angleTo(quatDepois));
  return { posAntes, posDepois, erroMetros, erroGraus };
}

export interface CasoFronteira extends ResultadoReparentar { nome: string; passou: boolean; }

function caso(nome: string, prepara: (raiz: THREE.Group, a: THREE.Group, b: THREE.Group, obj: THREE.Mesh) => void): CasoFronteira {
  const raiz = new THREE.Group();
  const a = new THREE.Group();
  const b = new THREE.Group();
  const obj = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  raiz.add(a, b);
  a.add(obj);
  prepara(raiz, a, b, obj);
  raiz.updateMatrixWorld(true);
  const r = reparentar(obj, b);
  const passou = r.erroMetros <= 1e-4 && r.erroGraus <= 0.01;
  return { nome, ...r, passou };
}

export function rodarCasosDeFronteira(): CasoFronteira[] {
  return [
    caso('Pais só transladados', (_r, a, b, obj) => {
      a.position.set(1, 0, 0); b.position.set(-1, 0, 0); obj.position.set(0.2, 0.3, 0.1);
    }),
    caso('Novo pai girado 90°', (_r, a, b, obj) => {
      a.position.set(0.3, 0.2, -0.1); b.rotation.y = Math.PI / 2; obj.position.set(0.2, 0.1, -0.3);
    }),
    caso('Novo pai com escala uniforme 2×', (_r, a, b, obj) => {
      a.position.set(0.4, 0, 0); b.scale.setScalar(2); obj.position.set(0.1, 0.2, 0.3);
    }),
    caso('Cadeia de 3 níveis, pais girados e escalados', (_r, a, b, obj) => {
      const meio = new THREE.Group(); meio.position.set(0.2, 0.1, 0.3); meio.rotation.z = 0.4; meio.scale.setScalar(1.3);
      a.add(meio); meio.add(obj); obj.position.set(0.2, 0.1, -0.2);
      b.position.set(-0.5, 0.4, 0.2); b.rotation.y = -0.5; b.scale.setScalar(0.8);
    }),
    caso('Mesmo pai', (_r, a, _b, obj) => {
      obj.position.set(0.2, 0.2, 0.2);
      const r = reparentar(obj, a); return void r;
    }),
    caso('Novo pai é a raiz', (raiz, a, _b, obj) => {
      raiz.remove(a); raiz.add(a); a.position.set(0.5, 0, 0); obj.position.set(0.2, 0.1, 0);
    }),
  ];
}
