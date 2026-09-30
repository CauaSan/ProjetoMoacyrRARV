import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRScene, M } from './scene';
import { MaoVirtual } from './mao';
import { setupControllers } from './controllers';
import { setupARHitTest } from './ar';
import { rodarCasosDeFronteira } from './reparentar';
import { IndicadorCusto, TETOS_MS, regimeAtual } from './custo';
import {
  executarSondaCapacidades,
  sondarSessaoAtiva,
  criarPainelRelatorio,
  relatorioVazio,
  type RelatorioSonda,
} from './sonda';

// ───────────────────────── renderer, cena, câmera ─────────────────────────
const container = document.getElementById('app') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

const xrScene = new XRScene();

const orbit = new OrbitControls(xrScene.camera, renderer.domElement);
orbit.target.set(0.08, 1.04, -0.5);
orbit.minDistance = 0.25;
orbit.maxDistance = 4;
orbit.update();

window.addEventListener('resize', () => {
  xrScene.camera.aspect = window.innerWidth / window.innerHeight;
  xrScene.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ───────────────────────── passo 9: indicador dentro da cena ─────────────────────────
const indicador = new IndicadorCusto(renderer);
indicador.mesh.position.set(0, 1.48, -0.55); // filho da raiz: acompanha a cena
xrScene.raiz.add(indicador.mesh);

// ───────────────────────── AR e controles ─────────────────────────
const ar = setupARHitTest(renderer, xrScene.scene, (ponto) => {
  // Ancora a cena na mesa real: o topo da bancada (M.bancada.a) cai no ponto tocado.
  // O centro da bancada está em z = -0,5 dentro da raiz, daí o +0,5.
  xrScene.raiz.position.set(ponto.x, ponto.y - M.bancada.a, ponto.z + 0.5);
});

const controles = setupControllers(
  renderer,
  xrScene.scene,
  xrScene.apanhaveis,
  xrScene.bandeja,
  () => regimeAtual(renderer) !== 'ar' || ar.ancorada,
);

// ───────────────────────── passos 5 e 6: sonda + relatório na tela ─────────────────────────
const painelSonda = criarPainelRelatorio();
let relatorio: RelatorioSonda = relatorioVazio();
painelSonda.atualizar(relatorio);

executarSondaCapacidades().then((rel) => {
  relatorio = rel;
  painelSonda.atualizar(relatorio);

  // O ambiente USA a resposta: só oferece o botão do que o aparelho declarou suportar.
  if (rel.sessoes['immersive-vr'] === 'suportado') {
    const b = VRButton.createButton(renderer);
    b.style.left = 'calc(50% - 170px)';
    document.body.appendChild(b);
  }
  if (rel.sessoes['immersive-ar'] === 'suportado') {
    const b = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['local-floor', 'bounded-floor'],
    });
    b.style.left = 'calc(50% + 10px)';
    document.body.appendChild(b);
  }
});

let fundoOriginal = xrScene.scene.background;
renderer.xr.addEventListener('sessionstart', () => {
  const session = renderer.xr.getSession()!;
  const modo = session.environmentBlendMode === 'opaque' ? 'immersive-vr' : 'immersive-ar';
  sondarSessaoAtiva(relatorio, session, modo, renderer.xr.getReferenceSpace(), () =>
    painelSonda.atualizar(relatorio),
  );
  if (modo === 'immersive-ar') {
    fundoOriginal = xrScene.scene.background;
    xrScene.scene.background = null; // deixa a câmera do aparelho aparecer
    xrScene.bancada.visible = false; // a mesa é a real
    ar.reiniciar();
  }
});
renderer.xr.addEventListener('sessionend', () => {
  xrScene.scene.background = fundoOriginal;
  xrScene.bancada.visible = true;
  xrScene.raiz.position.set(0, 0, 0);
});

// ───────────────────────── passo 8: troca de pai, conferida em números ─────────────────────────
const saida = document.createElement('pre');
Object.assign(saida.style, {
  position: 'fixed', top: '10px', left: '10px', margin: '0', maxWidth: '48vw',
  padding: '8px 12px', background: 'rgba(15,15,25,0.9)', color: '#ddd',
  fontFamily: 'monospace', fontSize: '11px', borderRadius: '4px',
  zIndex: '9999', pointerEvents: 'none', whiteSpace: 'pre-wrap',
} as Partial<CSSStyleDeclaration>);
saida.textContent =
  'MÃO: arraste uma peça para pegá-la e solte perto do trilho · peça no trilho desliza; Shift+arrastar desencaixa\n' +
  'Espaço: trocar pai · T: casos de fronteira · L: LED · B: balanço do painel · S: deslize automático';
document.body.appendChild(saida);

const mao = new MaoVirtual(xrScene.camera, renderer.domElement, orbit, xrScene, renderer, (t) => {
  saida.textContent = t;
  console.log(t);
});
xrScene.scene.add(mao.grupo);

const fmt = (v: THREE.Vector3) => `(${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)})`;

function disparaTrocaDePai(): void {
  const r = xrScene.trocarPaiDoDisjuntor();
  const texto =
    `PASSO 8 — novo pai: ${r.pai}\n` +
    `mundo ANTES : ${fmt(r.posAntes)} m\n` +
    `mundo DEPOIS: ${fmt(r.posDepois)} m\n` +
    `erro: ${r.erroMetros.toExponential(2)} m | ${r.erroGraus.toExponential(2)}°`;
  saida.textContent = texto;
  console.log(texto);
}

function disparaCasosDeFronteira(): void {
  const casos = rodarCasosDeFronteira();
  const linhas = casos.map(
    (c) => `${c.passou ? 'OK   ' : 'FALHA'} ${c.nome}  (${c.erroMetros.toExponential(1)} m, ${c.erroGraus.toExponential(1)}°)`,
  );
  saida.textContent = 'PASSO 8 — casos de fronteira\n' + linhas.join('\n');
  console.table(casos);
}

function botao(rotulo: string, bottom: string, acao: () => void): void {
  const b = document.createElement('button');
  b.innerText = rotulo;
  Object.assign(b.style, {
    position: 'fixed', bottom, right: '10px', padding: '10px 16px',
    background: '#00ffcc', color: '#000', fontWeight: 'bold', border: 'none',
    borderRadius: '4px', cursor: 'pointer', zIndex: '9999',
  } as Partial<CSSStyleDeclaration>);
  b.addEventListener('click', acao);
  document.body.appendChild(b);
}
botao('Trocar pai do disjuntor (Passo 8)', '10px', disparaTrocaDePai);
botao('Casos de fronteira (Passo 8)', '58px', disparaCasosDeFronteira);

let ledLigado = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); disparaTrocaDePai(); }
  if (e.code === 'KeyT') disparaCasosDeFronteira();
  if (e.code === 'KeyL') { ledLigado = !ledLigado; xrScene.setEnergizado(ledLigado); }
  if (e.code === 'KeyB') xrScene.alternarBalanco();
  if (e.code === 'KeyS') xrScene.alternarDeslize();
});

// ───────────────────────── passo 9: laço por tempo transcorrido ─────────────────────────
const DELTA_MAX_S = 0.1; // após aba em segundo plano, não "teleporta" a cena
let ultimo = 0;

renderer.setAnimationLoop((tempo: number, frame?: XRFrame) => {
  const t0 = performance.now();
  const intervalo = ultimo === 0 ? 0 : (tempo - ultimo) / 1000; // segundos reais
  ultimo = tempo;

  xrScene.update(Math.min(intervalo, DELTA_MAX_S)); // a cena avança por TEMPO, não por quadro
  if (frame) ar.update(frame);
  controles.update();
  mao.update(Math.min(intervalo, DELTA_MAX_S));
  renderer.render(xrScene.scene, xrScene.camera);

  const cpuMs = performance.now() - t0; // custo de CPU do quadro (não inclui GPU)
  const regime = regimeAtual(renderer);
  if (intervalo > 0) indicador.registrar(cpuMs, intervalo, regime);
});

console.log(
  `[PROJETO XR] Máquina: ${indicador.maquina}\n` +
  `Tetos por regime (ms): tela ${TETOS_MS.tela.toFixed(2)} · AR ${TETOS_MS.ar.toFixed(2)} · VR ${TETOS_MS.vr.toFixed(2)}`,
);
