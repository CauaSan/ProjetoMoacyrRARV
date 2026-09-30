# Projeto WebXR — Quadro elétrico em trilho

Grupo 9 · Módulo 03 · `modulo-03`

Ambiente WebXR em Three.js/TypeScript para demonstrar grafo de cena, reparenting com preservação da transformação de mundo, laço por tempo, sonda de capacidades e manipulação de componentes de um quadro elétrico.

## Requisitos

- Node.js 18 ou superior
- Navegador com suporte a WebXR para VR/AR
- HTTPS para WebXR (o Vite usa `@vitejs/plugin-basic-ssl`)

## Rodar

```bash
npm install
npm run dev
```

Abra `https://localhost:5173`. Para outro aparelho na mesma rede, use o endereço HTTPS exibido pelo Vite.

## Verificações

```bash
npm run typecheck
npm run build
```

## Estrutura principal

- `src/scene.ts` — árvore da cena, encaixe, queda e estado da montagem.
- `src/reparentar.ts` — única operação de troca de pai preservando posição/orientação no mundo.
- `src/custo.ts` — indicador de CPU/FPS e tetos por regime.
- `src/sonda.ts` — consulta de capacidades WebXR em duas fases.
- `src/mao.ts` — mão virtual e interação por mouse no regime de tela.
- `src/controllers.ts` — controles XR para VR/AR.
- `src/ar.ts` — hit-test e âncora da cena no AR.
- `docs/especificacao.md` — o que o ambiente promete.
- `docs/documentacao.md` — como o ambiente funciona por dentro.

## Atalhos

- `Espaço` — troca o pai do disjuntor móvel.
- `T` — executa os casos de fronteira do reparenting.
- `B` — liga/desliga o balanço do painel.
- `S` — liga/desliga o deslize automático.
- `L` — liga/desliga o LED.

## Limitações declaradas

VR e AR possuem código de sessão, controles, hit-test e âncora, mas precisam ser verificados em aparelhos reais. O indicador mede custo de CPU, não custo de GPU. Consulte `docs/aparelhos.md` e `docs/medicoes.md` para os registros que devem ser preenchidos pela equipe.
