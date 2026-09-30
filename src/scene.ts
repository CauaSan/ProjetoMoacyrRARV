import * as THREE from 'three';
import { reparentar } from './reparentar';

export const M = {
  bancada: { l: 1.20, a: 0.90, p: 0.60 },
  painel: { l: 0.60, a: 0.40, p: 0.05 },
  trilho: { l: 0.50, a: 0.035, p: 0.01 },
  disjuntor: { l: 0.018, a: 0.085, p: 0.065 },
  borne: { l: 0.012, a: 0.060, p: 0.045 },
  barramento: { l: 0.090, a: 0.012, p: 0.012 },
} as const;
export const M2 = 1;

// ───────────────────────── constantes de montagem (metros) ─────────────────────────
const FOLGA = 0.002;      // folga entre peças coladas na fila (doc 6.4)
const FOLGA_MIN = 0.0005; // menor folga aceita ao deslizar/encaixar
const Z_TRILHO = M.painel.p / 2 + M.trilho.p / 2; // trilho encostado na chapa do painel
const Y_TRILHO = -0.10;   // fila de baixo (peças apanháveis), no espaço do painel
const Y_FILA2 = 0.075;    // fila de cima (só cenografia)
const LED_POS = new THREE.Vector3(0.215, Y_FILA2, 0.045);

const COR_OURO = 0xd9a520;
const FIO_AZUL = 0x2563eb;
const FIO_VERM = 0xdc2626;
const FIO_PRETO = 0x111827;

function mat(color: number, emissive = 0x000000, metalness = 0.15, roughness = 0.55): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive });
}

const MAT_ACO = mat(0xaeb5bd, 0x000000, 0.45, 0.4);
const CAIXA = new THREE.BoxGeometry(1, 1, 1);
const CILINDRO = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
const cacheMat = new Map<number, THREE.MeshStandardMaterial>();
function matDe(cor: number): THREE.MeshStandardMaterial {
  let m = cacheMat.get(cor);
  if (!m) { m = mat(cor, 0x000000, 0.1, 0.5); cacheMat.set(cor, m); }
  return m;
}

// ───────────────────────── medidas lidas da própria geometria ─────────────────────────
function parametros(o: THREE.Object3D): { width: number; height: number; depth: number } | null {
  return o instanceof THREE.Mesh && o.geometry instanceof THREE.BoxGeometry ? o.geometry.parameters : null;
}
const meiaLargura = (o: THREE.Object3D): number => (parametros(o)?.width ?? M.disjuntor.l) / 2;
const meiaAltura = (o: THREE.Object3D): number => (parametros(o)?.height ?? M.disjuntor.a) / 2;

/** z (no espaço do trilho) em que a peça encosta no trilho: face de trás da peça na face da frente do trilho. */
export function zDeEncaixe(peca: THREE.Object3D): number {
  return M.trilho.p / 2 + (parametros(peca)?.depth ?? M.disjuntor.p) / 2;
}

// ───────────────────────── detalhes das peças apanháveis (só primitivas, sem textura) ─────────────────────────
/** Adiciona um detalhe como filho da peça. Detalhes não participam do raycast: quem responde é o corpo da peça. */
function parte(
  pai: THREE.Object3D, geo: THREE.BufferGeometry, cor: number,
  dim: [number, number, number], pos: [number, number, number], rotX = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, matDe(cor));
  m.scale.set(dim[0], dim[1], dim[2]);
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.x = rotX;
  m.raycast = () => {};
  pai.add(m);
  return m;
}

function terminais(peca: THREE.Object3D, larg: number, metade: number, prof: number, fios: [number, number]): void {
  const zc = -0.004;
  const lados: [number, number][] = [[1, fios[0]], [-1, fios[1]]];
  for (const [s, corFio] of lados) {
    parte(peca, CAIXA, COR_OURO, [larg, 0.008, prof], [0, s * (metade + 0.004), zc]);                                   // bloco do terminal
    parte(peca, CILINDRO, 0x15171b, [0.007, 0.002, 0.007], [0, s * (metade + 0.004), zc + prof / 2 + 0.001], Math.PI / 2); // parafuso
    parte(peca, CILINDRO, corFio, [0.0032, 0.035, 0.0032], [0, s * (metade + 0.008 + 0.0175), zc]);                      // fio
  }
}

function detalharPeca(peca: THREE.Mesh, tipo: 'disjuntor' | 'borne' | 'barramento', fios: [number, number] = [FIO_AZUL, FIO_AZUL]): void {
  if (tipo === 'disjuntor') {
    const { a, p } = M.disjuntor; const zf = p / 2;
    parte(peca, CAIXA, 0x0e0f12, [0.011, 0.024, 0.003], [0, 0.008, zf + 0.0005]);   // janela da alavanca
    parte(peca, CAIXA, 0x4b5059, [0.006, 0.011, 0.006], [0, 0.014, zf + 0.003]);    // alavanca (posição ligado)
    parte(peca, CAIXA, 0xf4f4f2, [0.013, 0.014, 0.001], [0, -0.02, zf + 0.0005]);   // rótulo branco
    terminais(peca, 0.014, a / 2, 0.02, fios);
  } else if (tipo === 'borne') {
    const { l, a, p } = M.borne;
    parte(peca, CAIXA, 0x1f2937, [l + 0.0004, 0.012, p + 0.0004], [0, a / 2 - 0.006, 0]);               // tampa escura
    for (const y of [0.012, -0.012]) parte(peca, CILINDRO, 0x15171b, [0.008, 0.002, 0.008], [0, y, p / 2 + 0.001], Math.PI / 2); // parafusos
    parte(peca, CILINDRO, fios[0], [0.0032, 0.06, 0.0032], [0, a / 2 + 0.03, 0]);                        // fio de cima (vai até a canaleta)
    parte(peca, CILINDRO, fios[1], [0.0032, 0.04, 0.0032], [0, -(a / 2 + 0.02), 0]);                     // fio de baixo
  } else {
    for (let i = 0; i < 4; i++) parte(peca, CAIXA, 0xd97706, [0.006, 0.02, 0.006], [-0.0315 + i * 0.021, -0.016, 0]); // dentes do pente
  }
}

// ───────────────────────── cenografia estática (fila de cima, canaletas, medidores) ─────────────────────────
/** Agrupa muitas caixas/cilindros iguais num único InstancedMesh: dezenas de peças, uma chamada de desenho. */
class Lote {
  private readonly matrizes: THREE.Matrix4[] = [];
  private readonly cores: THREE.Color[] = [];
  constructor(private readonly geo: THREE.BufferGeometry, private readonly material: THREE.Material) {}

  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, cor = 0xffffff, rotX = 0): void {
    this.matrizes.push(new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, 0, 0)),
      new THREE.Vector3(sx, sy, sz),
    ));
    this.cores.push(new THREE.Color(cor));
  }

  construir(pai: THREE.Object3D): void {
    if (!this.matrizes.length) return;
    const im = new THREE.InstancedMesh(this.geo, this.material, this.matrizes.length);
    this.matrizes.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, this.cores[i]); });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    pai.add(im);
  }
}

function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deixa o painel com o aspecto da foto de referência. Tudo aqui é fixo na placa e NÃO é apanhável. */
function montarCenografia(painel: THREE.Group): void {
  const cenografia = new THREE.Group(); cenografia.name = 'cenografia'; painel.add(cenografia);
  const corpo = new Lote(CAIXA, mat(0xffffff, 0x000000, 0.05, 0.5));
  const escuro = new Lote(CAIXA, mat(0xffffff, 0x000000, 0.1, 0.6));
  const ouro = new Lote(CAIXA, mat(0xffffff, 0x000000, 0.6, 0.35));
  const cil = new Lote(CILINDRO, mat(0xffffff, 0x000000, 0.05, 0.6));
  const display = new Lote(CAIXA, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const rnd = aleatorio(9);

  const d = M.disjuntor;
  const zc = Z_TRILHO + M.trilho.p / 2 + d.p / 2; // centro da peça encostada no trilho
  const zf = zc + d.p / 2;                        // frente da peça

  const terminal = (x: number, y: number, s: 1 | -1, corFio: number, larg = 0.014): void => {
    const yb = y + s * (d.a / 2 + 0.004);
    ouro.add(x, yb, zc - 0.004, larg, 0.008, 0.02, COR_OURO);
    cil.add(x, yb, zc - 0.004 + 0.011, 0.007, 0.002, 0.007, 0x15171b, Math.PI / 2);
    cil.add(x, y + s * (d.a / 2 + 0.008 + 0.0175), zc - 0.004, 0.0032, 0.035, 0.0032, corFio);
  };
  const fioDeBaixo = (): number => (rnd() < 0.6 ? FIO_AZUL : rnd() < 0.5 ? FIO_VERM : FIO_PRETO);

  const disjuntor = (x: number, y: number): void => {
    const cores = [0xeceff2, 0xeceff2, 0xe3e7eb, 0xd6dbe0];
    corpo.add(x, y, zc, d.l, d.a, d.p, cores[Math.floor(rnd() * cores.length)]);
    escuro.add(x, y + 0.008, zf + 0.0005, 0.011, 0.024, 0.003, 0x0e0f12);
    escuro.add(x, y + 0.014, zf + 0.003, 0.006, 0.011, 0.006, 0x4b5059);
    corpo.add(x, y - 0.02, zf + 0.0005, 0.013, 0.014, 0.001, 0xf7f7f5);
    terminal(x, y, 1, FIO_AZUL); terminal(x, y, -1, fioDeBaixo());
  };

  const medidor = (x: number, y: number): void => { // medidor de 2 módulos, com visor vermelho
    corpo.add(x, y, zc, 0.036, d.a, d.p, 0xe9ecef);
    escuro.add(x, y + 0.012, zf + 0.0005, 0.028, 0.026, 0.003, 0x0e0f12);
    for (let k = 0; k < 3; k++) display.add(x - 0.008 + k * 0.008, y + 0.012, zf + 0.0022, 0.005, 0.010, 0.001, 0xff3b2f);
    escuro.add(x - 0.007, y - 0.018, zf + 0.001, 0.007, 0.005, 0.002, 0x3a3d44);
    escuro.add(x + 0.007, y - 0.018, zf + 0.001, 0.007, 0.005, 0.002, 0x3a3d44);
    terminal(x - 0.0085, y, 1, FIO_AZUL); terminal(x + 0.0085, y, 1, FIO_AZUL);
    terminal(x - 0.0085, y, -1, FIO_VERM); terminal(x + 0.0085, y, -1, FIO_PRETO);
  };

  // fila de cima: trilho + disjuntores e medidores colados (folga de 2 mm)
  const trilho2 = new THREE.Mesh(new THREE.BoxGeometry(M.trilho.l, M.trilho.a, M.trilho.p), MAT_ACO);
  trilho2.position.set(0, Y_FILA2, Z_TRILHO); cenografia.add(trilho2);
  const padrao = 'bbbmbbbbbmbbbbbmbb';
  let x = -0.245;
  for (let i = 0; ; i++) {
    const medidorAqui = padrao[i % padrao.length] === 'm';
    const w = medidorAqui ? 0.036 : d.l;
    if (x + w > 0.185) break; // o resto da fila é do LED
    (medidorAqui ? medidor : disjuntor)(x + w / 2, Y_FILA2);
    x += w + FOLGA;
  }
  cil.add(LED_POS.x, LED_POS.y, Z_TRILHO + 0.005, 0.030, 0.020, 0.030, 0x1b1d22, Math.PI / 2); // aro do LED

  // canaletas ranhuradas (onde os fios entram)
  const canaleta = (y: number, h: number): void => {
    corpo.add(0, y, 0.055, 0.54, h, 0.06, 0xdfe3e7);
    const n = 88; const passo = 0.54 / n;
    for (let k = 0; k < n; k++) escuro.add(-0.27 + passo * (k + 0.5), y, 0.0855, passo * 0.45, h - 0.012, 0.001, 0x23262c);
  };
  canaleta(0.16, 0.04); canaleta(-0.01, 0.04); canaleta(-0.165, 0.03);

  for (const lote of [corpo, escuro, ouro, cil, display]) lote.construir(cenografia);
}

export class XRScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly raiz = new THREE.Group();
  readonly bancada: THREE.Mesh;
  readonly painel: THREE.Group;
  readonly trilho: THREE.Group;
  readonly bandeja: THREE.Group;
  readonly led: THREE.Mesh;
  readonly apanhaveis: THREE.Object3D[] = [];
  readonly disjuntores: THREE.Mesh[] = [];
  readonly bornes: THREE.Mesh[] = [];
  readonly soltas = new Set<THREE.Object3D>();
  readonly disjuntorMovel: THREE.Mesh;
  private tempo = 0;
  private balanco = false;
  private deslize = false;
  private sentido = 1;
  private ledLigado = false;

  constructor() {
    this.scene.background = new THREE.Color(0x101015);
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
    this.camera.position.set(0.08, 1.24, 0.38);
    this.addLights();
    this.scene.add(this.raiz);

    const bancadaGeo = new THREE.BoxGeometry(M.bancada.l, M.bancada.a, M.bancada.p);
    this.bancada = new THREE.Mesh(bancadaGeo, mat(0x3a3f47, 0x000000, 0.05, 0.8));
    this.bancada.position.set(0, M.bancada.a / 2, -0.50);
    this.raiz.add(this.bancada);

    // painel: chapa + moldura do quadro (paredes laterais, topo e base)
    this.painel = new THREE.Group(); this.painel.name = 'painel'; this.painel.position.set(0, 1.10, -0.60); this.raiz.add(this.painel);
    const painelMesh = new THREE.Mesh(new THREE.BoxGeometry(M.painel.l, M.painel.a, M.painel.p), mat(0xaab1b9, 0x000000, 0.25, 0.6));
    this.painel.add(painelMesh);
    const moldura = mat(0x7b828a, 0x000000, 0.3, 0.5);
    const parede = (l: number, a: number, p: number, x: number, y: number): void => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(l, a, p), moldura); m.position.set(x, y, 0.0425); this.painel.add(m);
    };
    parede(0.02, M.painel.a, 0.135, -0.29, 0); parede(0.02, M.painel.a, 0.135, 0.29, 0);
    parede(0.56, 0.02, 0.135, 0, 0.19); parede(0.56, 0.02, 0.135, 0, -0.19);

    // trilho da fila de baixo (a das peças apanháveis)
    this.trilho = new THREE.Group(); this.trilho.name = 'trilho'; this.trilho.position.set(0, Y_TRILHO, Z_TRILHO); this.painel.add(this.trilho);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(M.trilho.l, M.trilho.a, M.trilho.p), MAT_ACO); this.trilho.add(rail);
    for (const y of [0.0155, -0.0155]) { // abas do perfil
      const aba = new THREE.Mesh(CAIXA, matDe(0xd3d8de)); aba.scale.set(M.trilho.l, 0.004, 0.0015); aba.position.set(0, y, M.trilho.p / 2 + 0.0005); this.trilho.add(aba);
    }
    for (let i = 0; i < 12; i++) { // 12 furos de fixação (rasgos escuros)
      const furo = new THREE.Mesh(CAIXA, matDe(0x1a1c20)); furo.scale.set(0.02, 0.007, 0.0012); furo.position.set(-0.22 + i * 0.04, 0, M.trilho.p / 2 + 0.0003); this.trilho.add(furo);
    }

    // fila de peças coladas (folga de 2 mm): 2 bornes e 4 disjuntores, com trecho livre à direita
    let cursor = -0.185;
    const xBornes: number[] = []; const xDisj: number[] = [];
    for (let i = 0; i < 2; i++) { xBornes.push(cursor + M.borne.l / 2); cursor += M.borne.l + FOLGA; }
    for (let i = 0; i < 4; i++) { xDisj.push(cursor + M.disjuntor.l / 2); cursor += M.disjuntor.l + FOLGA; }
    for (let i = 0; i < 4; i++) this.criarDisjuntor(i, i === 3, xDisj[i]);
    for (let i = 0; i < 2; i++) this.criarBorne(i, xBornes[i]);

    // bandeja: chapa verde com borda, e o barramento
    this.bandeja = new THREE.Group(); this.bandeja.name = 'bandeja'; this.bandeja.position.set(0.34, 0.93, -0.34); this.raiz.add(this.bandeja);
    this.bandeja.add(new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.02, 0.20), mat(0x15803d)));
    const borda = mat(0x166534);
    for (const z of [-0.097, 0.097]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.03, 0.006), borda); b.position.set(0, 0.02, z); this.bandeja.add(b); }
    for (const x of [-0.197, 0.197]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.188), borda); b.position.set(x, 0.02, 0); this.bandeja.add(b); }
    const barramento = new THREE.Mesh(new THREE.BoxGeometry(M.barramento.l, M.barramento.a, M.barramento.p), mat(0xf59e0b, 0x000000, 0.5, 0.35));
    barramento.name = 'barramento'; barramento.userData.tipo = 'barramento'; barramento.position.set(0, 0.01 + M.barramento.a / 2, 0);
    detalharPeca(barramento, 'barramento');
    this.bandeja.add(barramento); this.apanhaveis.push(barramento); this.soltas.add(barramento);

    // LED fixo na placa (o aro escuro vem da cenografia)
    const ledMat = mat(0x404040);
    this.led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 20, 12), ledMat); this.led.name = 'led'; this.led.position.copy(LED_POS); this.painel.add(this.led);

    montarCenografia(this.painel);

    this.disjuntorMovel = this.disjuntores[3];
    this.apanhaveis.forEach((o) => this.soltas.add(o));
  }

  private criarDisjuntor(i: number, movel: boolean, x: number): void {
    const cores = [0x2563eb, 0x6b7280, 0x6b7280, 0x2563eb];
    const fiosDeBaixo = [FIO_VERM, FIO_AZUL, FIO_PRETO, FIO_VERM];
    const d = new THREE.Mesh(new THREE.BoxGeometry(M.disjuntor.l, M.disjuntor.a, M.disjuntor.p), mat(cores[i], 0x000000, 0.1, 0.45));
    d.name = `disjuntor-${i + 1}`; d.userData.tipo = 'disjuntor'; d.userData.index = i; d.userData.movel = movel;
    d.position.set(x, 0, zDeEncaixe(d)); this.trilho.add(d); this.disjuntores.push(d); this.apanhaveis.push(d);
    detalharPeca(d, 'disjuntor', [FIO_AZUL, fiosDeBaixo[i]]);
    d.userData.preso = true;
  }

  private criarBorne(i: number, x: number): void {
    const b = new THREE.Mesh(new THREE.BoxGeometry(M.borne.l, M.borne.a, M.borne.p), mat(0x22c55e, 0x000000, 0.1, 0.5));
    b.name = `borne-${i + 1}`; b.userData.tipo = 'borne'; b.position.set(x, 0, zDeEncaixe(b)); this.trilho.add(b); this.bornes.push(b); this.apanhaveis.push(b);
    detalharPeca(b, 'borne', [FIO_AZUL, i === 0 ? FIO_VERM : FIO_PRETO]);
    b.userData.preso = true;
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3b3f4a, 0.95));
    const principal = new THREE.DirectionalLight(0xffffff, 1.7); principal.position.set(0.8, 2.2, 1.6); this.scene.add(principal);
    const apoio = new THREE.DirectionalLight(0xbfd4ff, 0.55); apoio.position.set(-1.5, 1.2, 1.0); this.scene.add(apoio);
  }

  /** Peças encaixadas no trilho (disjuntores e bornes). */
  private pecasDoTrilho(): THREE.Mesh[] {
    return [...this.disjuntores, ...this.bornes].filter((o) => o.parent === this.trilho);
  }

  /** Limites de x (espaço do trilho) para a peça deslizar: pontas do trilho e vizinhas (meia largura + 0,5 mm). */
  limitesDeslize(peca: THREE.Object3D): { min: number; max: number } {
    const meia = meiaLargura(peca);
    let min = -M.trilho.l / 2 + meia; let max = M.trilho.l / 2 - meia;
    for (const o of this.pecasDoTrilho()) {
      if (o === peca) continue;
      const folga = meia + meiaLargura(o) + FOLGA_MIN;
      if (o.position.x < peca.position.x) min = Math.max(min, o.position.x + folga);
      else max = Math.min(max, o.position.x - folga);
    }
    return { min, max };
  }

  /** Altura (no espaço da raiz) da superfície que segura uma peça solta em (x, z). */
  private alturaDeApoio(x: number, z: number): number {
    const b = this.bandeja.position;
    if (Math.abs(x - b.x) <= 0.20 && Math.abs(z - b.z) <= 0.10) return b.y + 0.01;
    if (Math.abs(x - this.bancada.position.x) <= M.bancada.l / 2 && Math.abs(z - this.bancada.position.z) <= M.bancada.p / 2) return M.bancada.a;
    return 0;
  }

  update(delta: number): void {
    this.tempo += delta;
    if (this.balanco) this.painel.rotation.y = Math.sin(this.tempo / 1.5) * 0.1;
    if (this.deslize && this.disjuntorMovel.parent === this.trilho) {
      const { min, max } = this.limitesDeslize(this.disjuntorMovel);
      if (max > min) { // 0,06 m/s, invertendo o sentido ao encostar numa vizinha ou na ponta
        let x = this.disjuntorMovel.position.x + this.sentido * 0.06 * delta;
        if (x >= max) { x = max; this.sentido = -1; } else if (x <= min) { x = min; this.sentido = 1; }
        this.disjuntorMovel.position.x = x;
      }
    }
    for (const obj of this.soltas) {
      if (obj.parent !== this.raiz) continue; // no trilho, na bandeja ou na mão: sem gravidade
      const v = (obj.userData.vy ?? 0) - 9.8 * delta; obj.userData.vy = v;
      obj.position.y += v * delta;
      const chao = this.alturaDeApoio(obj.position.x, obj.position.z) + meiaAltura(obj);
      if (obj.position.y < chao) { obj.position.y = chao; obj.userData.vy = 0; }
    }
  }

  trocarPaiDoDisjuntor() {
    const novoPai = this.disjuntorMovel.parent === this.trilho ? this.bandeja : this.trilho;
    const r = reparentar(this.disjuntorMovel, novoPai);
    if (novoPai === this.trilho) { this.disjuntorMovel.position.y = 0; this.disjuntorMovel.position.z = zDeEncaixe(this.disjuntorMovel); this.disjuntorMovel.userData.preso = true; }
    return { ...r, pai: novoPai === this.trilho ? 'trilho' : 'bandeja' };
  }

  tentarEncaixar(peca: THREE.Object3D): { ok: boolean; motivo: string } {
    if (peca.userData.tipo === 'barramento') return { ok: false, motivo: 'encaixe nos terminais ainda não implementado (Bloco 2)' };
    if (peca.userData.tipo !== 'disjuntor' && peca.userData.tipo !== 'borne') return { ok: false, motivo: 'objeto não encaixável' };
    const zEnc = zDeEncaixe(peca);
    const local = this.trilho.worldToLocal(peca.getWorldPosition(new THREE.Vector3()));
    const meia = meiaLargura(peca);
    const dist = Math.hypot(local.y, local.z - zEnc);
    if (dist > 0.03) return { ok: false, motivo: `longe do trilho (${(dist * 100).toFixed(1)} cm; máximo 3 cm)` };
    const worldQ = peca.getWorldQuaternion(new THREE.Quaternion()); const railQ = this.trilho.getWorldQuaternion(new THREE.Quaternion());
    const graus = THREE.MathUtils.radToDeg(worldQ.angleTo(railQ));
    if (graus > 10) return { ok: false, motivo: `pose angular incorreta (${graus.toFixed(1)}°; máximo 10°)` };
    if (Math.abs(local.x) > M.trilho.l / 2 - meia) return { ok: false, motivo: 'fora do comprimento do trilho' };
    for (const outra of this.pecasDoTrilho()) {
      if (outra !== peca && Math.abs(local.x - outra.position.x) < meia + meiaLargura(outra) + FOLGA_MIN) return { ok: false, motivo: 'esse trecho do trilho já está ocupado' };
    }
    reparentar(peca, this.trilho); peca.position.set(local.x, 0, zEnc); peca.rotation.set(0, 0, 0); peca.userData.preso = true; peca.userData.vy = 0; this.soltas.delete(peca);
    return { ok: true, motivo: 'encaixe aceito' };
  }

  setEnergizado(v: boolean): void {
    if (v === this.ledLigado) return;
    this.ledLigado = v;
    const m = this.led.material as THREE.MeshStandardMaterial; m.emissive.setHex(v ? 0x22ff55 : 0x000000); m.color.setHex(v ? 0x22cc55 : 0x404040);
  }
  alternarBalanco(): void { this.balanco = !this.balanco; if (!this.balanco) this.painel.rotation.y = 0; }
  alternarDeslize(): void { this.deslize = !this.deslize; }
}
