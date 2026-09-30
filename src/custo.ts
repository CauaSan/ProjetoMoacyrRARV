import * as THREE from 'three';

export const TETOS_MS = { tela: 16.67, ar: 33.33, vr: 13.89 } as const;
export type Regime = keyof typeof TETOS_MS;

export function regimeAtual(renderer: THREE.WebGLRenderer): Regime {
  const session = renderer.xr.getSession();
  if (!session) return 'tela';
  return session.environmentBlendMode === 'opaque' ? 'vr' : 'ar';
}

export class IndicadorCusto {
  readonly mesh: THREE.Mesh;
  readonly maquina: string;
  private cpu: number[] = [];
  private intervalos: number[] = [];
  private ultimoDesenho = 0;
  private readonly canvas = document.createElement('canvas');
  private readonly ctx = this.canvas.getContext('2d')!;
  private readonly texture: THREE.CanvasTexture;

  constructor(private renderer: THREE.WebGLRenderer) {
    this.canvas.width = 800; this.canvas.height = 400;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.40, 0.20),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true }),
    );
    this.mesh.name = 'indicador-custo';
    this.maquina = `${renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1'} · ${navigator.platform || 'plataforma desconhecida'} · DPR ${window.devicePixelRatio.toFixed(2)}`;
    this.desenhar('tela');
  }

  registrar(cpuMs: number, intervaloS: number, regime: Regime): void {
    this.cpu.push(cpuMs); this.intervalos.push(intervaloS);
    if (this.cpu.length > 120) this.cpu.shift();
    if (this.intervalos.length > 120) this.intervalos.shift();
    const agora = performance.now();
    if (agora - this.ultimoDesenho >= 250) { this.desenhar(regime); this.ultimoDesenho = agora; }
  }

  private desenhar(regime: Regime): void {
    const media = this.cpu.length ? this.cpu.reduce((a, b) => a + b, 0) / this.cpu.length : 0;
    const pico = this.cpu.length ? Math.max(...this.cpu) : 0;
    const taxa = this.intervalos.length ? 1 / (this.intervalos.reduce((a, b) => a + b, 0) / this.intervalos.length) : 0;
    const teto = TETOS_MS[regime];
    const dentro = media <= teto;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'rgba(8,10,15,0.94)'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#ffffff'; this.ctx.font = 'bold 34px monospace';
    this.ctx.fillText(`CUSTO · ${regime.toUpperCase()}`, 24, 48);
    this.ctx.font = '28px monospace';
    this.ctx.fillText(`CPU média: ${media.toFixed(2)} ms`, 24, 92);
    this.ctx.fillText(`CPU pico : ${pico.toFixed(2)} ms`, 24, 128);
    this.ctx.fillText(`Taxa     : ${taxa.toFixed(1)} FPS`, 24, 164);
    this.ctx.fillText(`Teto     : ${teto.toFixed(2)} ms`, 24, 200);
    this.ctx.fillText(dentro ? 'DENTRO DO TETO' : 'ESTOURADO', 24, 240);
    this.ctx.font = '20px monospace'; this.ctx.fillText(this.maquina, 24, 278);
    this.texture.needsUpdate = true;
  }
}
