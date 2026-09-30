import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { XRScene, M, zDeEncaixe } from './scene';
import { reparentar } from './reparentar';

const COR_MIRADO = 0x333300;
const COR_PEGADO = 0x0a2a55;

const PALMA = { l: 0.075, a: 0.085, p: 0.028 };
const DEDOS = [
  { x: -0.0275, comp: 0.070, raio: 0.0086, peso: 0.85 },
  { x: -0.0092, comp: 0.077, raio: 0.0089, peso: 1.0 },
  { x: 0.0092, comp: 0.071, raio: 0.0083, peso: 1.05 },
  { x: 0.0275, comp: 0.057, raio: 0.0071, peso: 1.1 },
];
const PROP_DEDO = [0.42, 0.30, 0.28];
const PROP_POLEGAR = [0.55, 0.45];
const RAIO_K = [1, 0.93, 0.86];
const ANG_DEDO = [1.15, 1.35, 0.95];
const ANG_POLEGAR = [0.7, 1.0];
const CURL_RELAXADA = 0.3;
const CURL_ABERTA = 0;
const CURL_PINCA = 0.5;

const pele = new THREE.MeshStandardMaterial({ color: 0xf1b596, roughness: 0.62, metalness: 0 });
const unha = new THREE.MeshStandardMaterial({ color: 0xf8d6c8, roughness: 0.35, metalness: 0 });
const manga = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0 });
const punho = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.7, metalness: 0 });

function cadeia(base: THREE.Object3D, comp: number, raio: number, props: number[], comUnha: boolean): THREE.Group[] {
  const pivos: THREE.Group[] = [];
  let pai = base;
  props.forEach((prop, i) => {
    const seg = comp * prop; const r = raio * RAIO_K[i];
    const pivo = new THREE.Group();
    pivo.position.y = i === 0 ? 0 : comp * props[i - 1];
    pai.add(pivo);
    const osso = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(seg - 2 * r, 0.002), 4, 10), pele);
    osso.position.y = seg / 2; pivo.add(osso);
    if (comUnha && i === props.length - 1) { // unha no lado das costas da mão (+Z)
      const u = new THREE.Mesh(new THREE.BoxGeometry(r * 1.3, seg * 0.55, 0.0016), unha);
      u.position.set(0, seg * 0.5, r * 0.97); pivo.add(u);
    }
    pivos.push(pivo); pai = pivo;
  });
  return pivos;
}

export class MaoVirtual {
  readonly grupo = new THREE.Group();
  private readonly visual = new THREE.Group();
  private readonly maoGrupo = new THREE.Group();
  private readonly dedos: { pivos: THREE.Group[]; peso: number }[] = [];
  private polegar: THREE.Group[] = [];
  private readonly polegarBase = new THREE.Group();
  private readonly pontaIndicador = new THREE.Object3D();
  private readonly inclinacao = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.45, 0, 0.5, 'ZXY'));
  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2();
  private readonly plano = new THREE.Plane();
  private readonly planoCarga = new THREE.Plane();
  private readonly ponto = new THREE.Vector3();
  private readonly alvoPos = new THREE.Vector3(0.1, 1.1, -0.3);
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpP = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();
  private alvo: THREE.Object3D | null = null;
  private hover: THREE.Object3D | null = null;
  private arrastando = false;
  private sobreTrilho = false;
  private offsetX = 0;
  private curl = CURL_RELAXADA;
  private curlAlvo = CURL_RELAXADA;

  constructor(private camera: THREE.PerspectiveCamera, private dom: HTMLElement, private orbit: OrbitControls, private xrScene: XRScene, private renderer: THREE.WebGLRenderer, private mensagem: (t: string) => void) {
    this.dom.addEventListener('pointermove', this.onMove);
    this.dom.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointerup', this.onUp);
    this.criarMao();
    this.grupo.position.copy(this.alvoPos);
  }

  private criarMao(): void {
    const mao = this.maoGrupo;
    mao.add(new THREE.Mesh(new RoundedBoxGeometry(PALMA.l, PALMA.a, PALMA.p, 4, 0.011), pele));
    const tenar = new THREE.Mesh(new THREE.SphereGeometry(0.019, 16, 12), pele);
    tenar.scale.set(1, 1.15, 0.7); tenar.position.set(-0.024, -0.012, -0.001); mao.add(tenar);

    const pulso = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.05, 20), pele); pulso.position.y = -0.058; mao.add(pulso);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.014, 24), punho); cuff.position.y = -0.09; mao.add(cuff);
    const braco = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.043, 0.24, 24), manga); braco.position.y = -0.21; mao.add(braco);

    DEDOS.forEach((d, i) => {
      const pivos = cadeia(mao, d.comp, d.raio, PROP_DEDO, true);
      pivos[0].position.set(d.x, PALMA.a / 2 - 0.003, 0);
      this.dedos.push({ pivos, peso: d.peso });
      const no = new THREE.Mesh(new THREE.SphereGeometry(d.raio * 1.1, 10, 8), pele);
      no.scale.z = 0.6; no.position.set(d.x, PALMA.a / 2 - 0.008, PALMA.p / 2 - 0.001); mao.add(no);
      if (i === 0) {
        this.pontaIndicador.position.y = d.comp * PROP_DEDO[2];
        pivos[pivos.length - 1].add(this.pontaIndicador);
      }
    });

    this.polegarBase.position.set(-0.030, -0.018, -0.002); mao.add(this.polegarBase);
    this.polegar = cadeia(this.polegarBase, 0.066, 0.0105, PROP_POLEGAR, true);

    this.visual.add(mao); this.grupo.add(this.visual);
    this.aplicarPose(this.curl);
  }

  private aplicarPose(c: number): void {
    this.dedos.forEach((d, i) => {
      d.pivos.forEach((p, j) => { p.rotation.x = -c * d.peso * ANG_DEDO[j]; });
      d.pivos[0].rotation.z = (i - 1.5) * -0.05 * (1 - c);
    });
    this.polegar.forEach((p, j) => { p.rotation.x = -c * ANG_POLEGAR[j]; });
    this.polegarBase.rotation.z = 0.65 - 0.4 * c;
  }

  private ancorarPonta(): void {
    this.maoGrupo.position.set(0, 0, 0);
    this.visual.updateWorldMatrix(true, true);
    this.tmpV.setFromMatrixPosition(this.pontaIndicador.matrixWorld);
    this.maoGrupo.worldToLocal(this.tmpV);
    this.maoGrupo.position.copy(this.tmpV).negate();
  }

  private atualizaMouse(e: PointerEvent): void { const r = this.dom.getBoundingClientRect(); this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  private hits(): THREE.Intersection[] { this.raycaster.setFromCamera(this.mouse, this.camera); return this.raycaster.intersectObjects(this.xrScene.apanhaveis, true); }

  private raizApanhavel(obj: THREE.Object3D): THREE.Object3D | null {
    let o: THREE.Object3D | null = obj;
    while (o && !this.xrScene.apanhaveis.includes(o)) o = o.parent;
    return o;
  }

  private realcar(obj: THREE.Object3D | null, cor: number): void {
    if (!obj) return;
    const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
    if (m && 'emissive' in m) m.emissive.setHex(cor);
  }

  private atualizarHover(): void {
    const hit = this.hits()[0];
    const raiz = hit ? this.raizApanhavel(hit.object) : null;
    if (raiz !== this.hover) { this.realcar(this.hover, 0); this.hover = raiz; this.realcar(raiz, COR_MIRADO); }
    this.dom.style.cursor = raiz ? 'grab' : '';
    this.curlAlvo = raiz ? CURL_ABERTA : CURL_RELAXADA;
    this.camera.getWorldDirection(this.tmpV);
    if (hit) { this.alvoPos.copy(hit.point).addScaledVector(this.tmpV, -0.012); return; }
    this.plano.setFromNormalAndCoplanarPoint(this.tmpV, this.orbit.target);
    if (this.raycaster.ray.intersectPlane(this.plano, this.ponto)) this.alvoPos.copy(this.ponto);
  }

  private pontoNoTrilho(obj: THREE.Object3D): boolean {
    const trilho = this.xrScene.trilho;
    const normal = this.tmpV.set(0, 0, 1).applyQuaternion(trilho.getWorldQuaternion(this.tmpQ));
    const centro = this.tmpP.set(0, 0, zDeEncaixe(obj)); trilho.localToWorld(centro);
    this.plano.setFromNormalAndCoplanarPoint(normal, centro);
    if (!this.raycaster.ray.intersectPlane(this.plano, this.ponto)) return false;
    const l = trilho.worldToLocal(this.tmpP.copy(this.ponto));
    return Math.abs(l.x) <= M.trilho.l / 2 + 0.05 && Math.abs(l.y) <= 0.06;
  }

  private arrastar(): void {
    const obj = this.alvo;
    if (!obj) return;
    if (this.sobreTrilho) {
      const trilho = this.xrScene.trilho;
      const normal = this.tmpV.set(0, 0, 1).applyQuaternion(trilho.getWorldQuaternion(this.tmpQ));
      this.plano.setFromNormalAndCoplanarPoint(normal, obj.getWorldPosition(this.ponto));
      if (this.raycaster.ray.intersectPlane(this.plano, this.ponto)) {
        const x = trilho.worldToLocal(this.ponto).x - this.offsetX;
        const { min, max } = this.xrScene.limitesDeslize(obj);
        obj.position.x = THREE.MathUtils.clamp(x, min, max);
      }
      return;
    }
    if (this.pontoNoTrilho(obj)) { this.alvoPos.copy(this.ponto).sub(obj.position); return; }
    if (this.raycaster.ray.intersectPlane(this.planoCarga, this.ponto)) this.alvoPos.copy(this.ponto);
  }

  private onMove = (e: PointerEvent): void => {
    this.atualizaMouse(e);
    if (this.arrastando) { this.raycaster.setFromCamera(this.mouse, this.camera); this.arrastar(); return; }
    this.atualizarHover();
  };

  private onDown = (e: PointerEvent): void => {
    if (this.renderer.xr.isPresenting || this.arrastando) return;
    this.atualizaMouse(e);
    const hit = this.hits()[0]; if (!hit) return;
    const obj = this.raizApanhavel(hit.object); if (!obj) return;
    this.alvo = obj; this.arrastando = true;
    this.sobreTrilho = obj.parent === this.xrScene.trilho;
    let texto = `Mão: ${obj.name} selecionado`;
    if (this.sobreTrilho && e.shiftKey) {
      reparentar(obj, this.xrScene.raiz); this.xrScene.soltas.add(obj); obj.userData.preso = false; this.sobreTrilho = false;
      texto = `Mão: ${obj.name} desencaixado`;
    }
    if (this.sobreTrilho) {
      this.offsetX = this.xrScene.trilho.worldToLocal(this.tmpP.copy(hit.point)).x - obj.position.x;
    } else {
      this.grupo.position.copy(hit.point); this.alvoPos.copy(hit.point);
      this.camera.getWorldDirection(this.tmpV);
      this.planoCarga.setFromNormalAndCoplanarPoint(this.tmpV, hit.point);
      reparentar(obj, this.grupo); obj.userData.vy = 0;
    }
    this.realcar(obj, COR_PEGADO);
    this.curlAlvo = CURL_PINCA; this.dom.style.cursor = 'grabbing';
    this.orbit.enabled = false; this.mensagem(texto);
  };

  private onUp = (): void => {
    if (!this.arrastando || !this.alvo) return;
    const obj = this.alvo; this.arrastando = false; this.alvo = null; this.orbit.enabled = true;
    this.realcar(obj, 0); this.hover = null; this.dom.style.cursor = '';
    if (obj.parent === this.grupo) {
      reparentar(obj, this.xrScene.raiz);
      const r = this.xrScene.tentarEncaixar(obj);
      if (!r.ok) { this.xrScene.soltas.add(obj); this.mensagem(`Encaixe recusado: ${r.motivo}`); } else { this.mensagem('Encaixe aceito'); }
    }
    this.atualizarHover();
  };

  update(delta: number): void {
    if (this.renderer.xr.isPresenting) { this.grupo.visible = false; return; }
    this.grupo.visible = true;
    if (this.arrastando && this.sobreTrilho && this.alvo) this.alvo.getWorldPosition(this.alvoPos);
    this.grupo.position.lerp(this.alvoPos, 1 - Math.exp(-delta * 22));
    this.curl += (this.curlAlvo - this.curl) * (1 - Math.exp(-delta * 16));
    this.camera.getWorldQuaternion(this.tmpQ);
    this.visual.quaternion.copy(this.tmpQ).multiply(this.inclinacao);
    this.aplicarPose(this.curl);
    this.ancorarPonta();
  }
}
