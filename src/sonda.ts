export type EstadoSonda = 'suportado' | 'nao-suportado' | 'ausente' | 'negado' | 'erro' | 'nao-consultado';
export interface RelatorioSonda { sessoes: Record<'inline' | 'immersive-vr' | 'immersive-ar', EstadoSonda>; recursos: string[]; mensagem: string; }
export const relatorioVazio = (): RelatorioSonda => ({ sessoes: { inline: 'nao-consultado', 'immersive-vr': 'nao-consultado', 'immersive-ar': 'nao-consultado' }, recursos: [], mensagem: '' });

export async function executarSondaCapacidades(): Promise<RelatorioSonda> {
  const r = relatorioVazio();
  if (!window.isSecureContext) { r.mensagem = 'HTTPS: NÃO — WebXR exige contexto seguro.'; return r; }
  if (!navigator.xr) { r.sessoes.inline = 'ausente'; r.sessoes['immersive-vr'] = 'ausente'; r.sessoes['immersive-ar'] = 'ausente'; r.mensagem = 'API WebXR ausente neste navegador/dispositivo.'; return r; }
  for (const mode of ['inline', 'immersive-vr', 'immersive-ar'] as const) { try { r.sessoes[mode] = await navigator.xr.isSessionSupported(mode) ? 'suportado' : 'nao-suportado'; } catch { r.sessoes[mode] = 'erro'; } }
  return r;
}

export function sondarSessaoAtiva(r: RelatorioSonda, session: XRSession, _modo: 'immersive-vr' | 'immersive-ar', referenceSpace: XRReferenceSpace | null, atualizar: () => void): void {
  r.recursos = [...(session.enabledFeatures ?? [])];
  const fontes = session.inputSources.length;
  r.mensagem = `${fontes} fonte(s) de entrada · ${referenceSpace ? 'espaço de referência disponível' : 'espaço de referência ausente'}`;
  atualizar();
  if (referenceSpace) session.requestAnimationFrame((_t, frame) => { const pose = frame.getViewerPose(referenceSpace); if (pose) r.mensagem += ` · posição ${pose.emulatedPosition ? 'emulada (3DoF)' : 'real (6DoF)'}`; atualizar(); });
}

export function criarPainelRelatorio() { const div = document.createElement('div'); Object.assign(div.style, { position: 'fixed', bottom: '10px', left: '10px', padding: '10px 14px', background: 'rgba(0,0,0,.85)', color: '#9ff', fontFamily: 'monospace', fontSize: '11px', borderRadius: '4px', zIndex: '9999', pointerEvents: 'none' }); document.body.appendChild(div); return { atualizar(r: RelatorioSonda): void { div.innerHTML = `<b>SONDA — PASSOS 5/6</b><br>inline: ${r.sessoes.inline}<br>VR: ${r.sessoes['immersive-vr']}<br>AR: ${r.sessoes['immersive-ar']}<br>recursos: ${r.recursos.join(', ') || 'não consultados'}<br>${r.mensagem}`; } }; }
