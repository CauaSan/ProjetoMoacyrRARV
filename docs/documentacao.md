# Documentação completa — Quadro elétrico em trilho (WebXR)

Grupo 9 · Módulo 03 · estado: `modulo-03`

> Este documento explica **o que o ambiente é, do que é feito, como cada peça funciona e por que foi feita assim**.
> Ele não substitui a especificação (`docs/especificacao.md`, que diz *o que* o ambiente promete) nem o README
> (que diz *como rodar*). Aqui está o *como funciona por dentro*.
>
> **Regra de honestidade deste documento:** tudo que aparece como "funciona" foi conferido; o que não foi verificado
> em aparelho está marcado como **não verificado**. Ver a seção 16.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Tecnologias usadas e por quê](#2-tecnologias-usadas-e-por-quê)
3. [Estrutura do repositório](#3-estrutura-do-repositório)
4. [Como rodar](#4-como-rodar)
5. [Arquitetura: como as peças se ligam](#5-arquitetura-como-as-peças-se-ligam)
6. [Passo 7 — A cena como árvore](#6-passo-7--a-cena-como-árvore)
7. [Passo 8 — Reparentar sem recalcular à mão](#7-passo-8--reparentar-sem-recalcular-à-mão)
8. [Passo 9 — O laço contra o relógio e o orçamento](#8-passo-9--o-laço-contra-o-relógio-e-o-orçamento)
9. [Passos 5 e 6 — A sonda de capacidades](#9-passos-5-e-6--a-sonda-de-capacidades)
10. [A mão virtual (mouse) e o encaixe](#10-a-mão-virtual-mouse-e-o-encaixe)
11. [VR e AR: controles, hit-test e âncora](#11-vr-e-ar-controles-hit-test-e-âncora)
12. [Controles e atalhos](#12-controles-e-atalhos)
13. [Decisões e alternativas descartadas](#13-decisões-e-alternativas-descartadas)
14. [Mapa dos nove passos](#14-mapa-dos-nove-passos)
15. [Roteiro da demonstração e perguntas prováveis](#15-roteiro-da-demonstração-e-perguntas-prováveis)
16. [Limitações e o que ainda não existe](#16-limitações-e-o-que-ainda-não-existe)
17. [Glossário](#17-glossário)
18. [O que só o grupo pode fazer](#18-o-que-só-o-grupo-pode-fazer)

---

## 1. Visão geral

**O que é.** Um ambiente 3D que roda no navegador. A pessoa monta um **quadro elétrico**: pega disjuntores e bornes e os
encaixa num **trilho DIN** metálico; quando tudo estiver montado (e o barramento encaixado), um LED acende.
A cena existe em três **regimes** (maneiras de tratar o mundo de quem observa):

| Regime | O que faz com o mundo | Como se usa |
| :--- | :--- | :--- |
| **Tela** (janela) | Mostra a cena numa janela, sem tocar o mundo de quem olha | Mouse: órbita da câmera e mão virtual |
| **VR** (visor) | Substitui o mundo inteiro pelo virtual | Controles 6DoF: raio + gatilho |
| **AR** (câmera) | Mantém o mundo e deposita a cena sobre ele | Toque na tela: ancora a cena na mesa real |

**Onde estamos (Módulo 03).** O foco do módulo é a **estrutura invisível** da cena, não a aparência:

- a cena é uma **árvore** de objetos com transformação própria em relação ao pai;
- existe **uma única operação** para trocar de pai preservando a posição no mundo;
- o laço de desenho avança a cena pelo **tempo**, mostra o **custo do quadro dentro da cena** e tem um **teto declarado**;
- o ambiente **pergunta ao aparelho o que ele oferece** (sonda) e mostra a resposta na tela.

Além do pedido, foram antecipados (parcialmente) o **pegar com uma mão virtual** e o **encaixe no trilho** (decisão D13).

**Geometria:** só formas primitivas criadas em código (caixas, cilindros, esfera). Nada importado, nada texturizado.
É regra do módulo: escala correta antes de material bonito.

---

## 2. Tecnologias usadas e por quê

| Tecnologia | Versão | Para que serve aqui | Por que esta e não outra |
| :--- | :--- | :--- | :--- |
| **Three.js** | ^0.185.1 | Grafo de cena (`Object3D`, `Group`, `Mesh`), câmera, luzes, raycast, matemática 3D (`Vector3`, `Quaternion`, `Matrix4`) e a ponte com o WebXR (`renderer.xr`) | Traz a árvore de objetos e o `attach()` prontos; o assunto do módulo é *usar* bem a hierarquia, não reinventá-la |
| **WebXR Device API** | (do navegador) | Sessões imersivas (`immersive-vr`, `immersive-ar`), espaços de referência, fontes de entrada, hit-test | É o padrão aberto; roda em headsets e celulares sem instalar app |
| **TypeScript** | ^5 | Tipagem dos módulos | Erros de tipo (ex.: passar `Mesh` onde se espera `Group`) aparecem na compilação, não no visor |
| **Vite** | ^6 | Servidor de desenvolvimento e build | Recarrega instantaneamente e serve HTTPS facilmente |
| **@vitejs/plugin-basic-ssl** | ^2.3 | Certificado HTTPS autoassinado | **WebXR só funciona em contexto seguro (HTTPS)**, inclusive na rede local |
| **@types/three** | ^0.185 | Tipos do Three.js (e do WebXR, via `@types/webxr`) | Necessário para o TypeScript enxergar `XRSession`, `XRFrame` etc. |
| **Canvas 2D** | (do navegador) | Desenhar o texto do indicador de custo numa textura | Permite texto dentro da cena (visível no visor, onde um `<div>` não aparece) |

**Compatibilidade de versão:** o plugin `basic-ssl` 2.x exige Vite 6 ou superior. Com Vite 5, o `npm install` falha
(erro `ERESOLVE`). Por isso o `package.json` fixa `vite ^6.0.0`.

**Não usados de propósito:** biblioteca de física (esconderia a estrutura que o módulo cobra e pesa no orçamento),
importadores de modelos `.gltf` (módulo seguinte), texturas e materiais elaborados (idem).

---

## 3. Estrutura do repositório

```
ProjetoWebXR-main/
├─ index.html               página única; carrega src/main.ts
├─ package.json             dependências e scripts (dev, build, typecheck)
├─ tsconfig.json            TypeScript estrito (noUnusedParameters etc.)
├─ vite.config.ts           servidor HTTPS na porta 5173, aberto à rede
├─ README.md                arquivo de apresentação: o que é, como rodar, limitações
├─ docs/
│  ├─ especificacao.md      as 14 seções + registro de decisões (D1–D14)
│  ├─ documentacao.md       ESTE documento
│  ├─ aparelhos.md          tabela de aparelhos testados (a preencher)
│  └─ medicoes.md           medições do custo do quadro (a preencher)
└─ src/
   ├─ main.ts               ponto de entrada: monta tudo e roda o laço
   ├─ scene.ts              a cena como árvore + encaixe + queda (classe XRScene)
   ├─ reparentar.ts         a operação de trocar de pai + casos de fronteira
   ├─ custo.ts              indicador de custo dentro da cena + tetos por regime
   ├─ sonda.ts              sonda de capacidades + painel de relatório
   ├─ mao.ts                mão virtual de desktop (pegar, deslizar, soltar)
   ├─ controllers.ts        controles XR (VR/AR): raio, realce, pegar
   └─ ar.ts                 hit-test de AR: retículo e âncora da cena na mesa
```

Tamanho aproximado do código: ~1 300 linhas de TypeScript em `src/`.

---

## 4. Como rodar

Requer **Node 18 ou superior**.

```bash
npm install          # instala dependências (sem flags especiais)
npm run dev          # servidor em https://localhost:5173
npm run build        # verificação de tipos + build de produção
npm run typecheck    # só a verificação de tipos
```

**HTTPS e aviso do navegador.** O certificado é autoassinado: o navegador mostra um aviso de segurança. Aceite-o
("avançado → continuar"). Sem HTTPS o WebXR não existe e a sonda mostra `HTTPS: NÃO`.

**Abrir de outro aparelho** (celular, visor): na mesma rede Wi-Fi, use `https://<IP-do-computador>:5173`
(o endereço aparece no terminal). Ou use um túnel (cloudflared/ngrok) — nesse caso descomente `allowedHosts`
em `vite.config.ts`.

**Rodar a partir da etiqueta:** `git checkout modulo-03`, depois os comandos acima. É esse estado que é avaliado.

---

## 5. Arquitetura: como as peças se ligam

```
                          ┌───────────────────────────────┐
                          │           main.ts             │
                          │  monta renderer, câmera,      │
                          │  liga tudo, roda o laço       │
                          └───────────────┬───────────────┘
      ┌───────────────┬───────────────┬───┴───────────┬─────────────────┬──────────────┐
      ▼               ▼               ▼               ▼                 ▼              ▼
  scene.ts        mao.ts        controllers.ts       ar.ts           custo.ts       sonda.ts
  XRScene         MaoVirtual    setupControllers   setupARHitTest   IndicadorCusto  sondas + painel
  (árvore,        (mouse:       (VR/AR: raio e     (retículo e      (custo dentro   (o que o
  encaixe,        pegar,        pegar)             âncora na mesa)  da cena, tetos)  aparelho oferece)
  queda)          deslizar)
      │               │               │
      └───────────────┴───────┬───────┘
                              ▼
                       reparentar.ts
              (a ÚNICA operação de trocar de pai)
```

**Ideia central:** *toda* mudança de "de quem um objeto é filho" passa por `reparentar()`. Pegar com a mão, pegar com
o controle, soltar, encaixar no trilho e a demonstração do passo 8 usam a mesma função. Por isso a posição no mundo
nunca "salta" e nunca sai de sincronia.

**Fluxo de um quadro** (ver `main.ts`, `renderer.setAnimationLoop`):

1. mede o instante inicial (`performance.now()`);
2. calcula `intervalo` = tempo desde o quadro anterior (segundos);
3. `xrScene.update(min(intervalo, 0,1 s))` — avança a cena **pelo tempo**;
4. se estiver em AR, `ar.update(frame)` — atualiza o retículo do hit-test;
5. `controles.update()` — realce do objeto mirado (VR/AR);
6. `mao.update(delta)` — posição da mão, pose dos dedos, realce e arrasto (só no regime de tela);
7. `renderer.render(...)` — desenha;
8. mede o custo (CPU) e entrega ao indicador dentro da cena.

---

## 6. Passo 7 — A cena como árvore

Arquivo: `src/scene.ts` (classe `XRScene`).

### 6.1 A árvore

```
scene
└─ raiz                          ← move-se inteira quando o AR ancora a cena na mesa
   ├─ bancada                    (topo a 0,90 m; hospeda tudo)
   ├─ painel                     (0,60 × 0,40 × 0,05; vertical sobre a bancada)
   │   ├─ trilho                 (preso ao painel; 12 furos de fixação como filhos)
   │   │   ├─ 2 bornes           (cada um com terminais e fios como filhos)
   │   │   └─ 4 disjuntores      (idem + rótulo; o último da fila é o "móvel")
   │   ├─ led                    (fixo na placa)
   │   ├─ moldura                (4 paredes de chapa: laterais, topo e base; só visual)
   │   └─ cenografia             (fila de cima, canaletas e medidores; só visual, ver 6.4)
   ├─ bandeja                    (chapa verde + barramento; destino da troca de pai)
   └─ indicador de custo         (plano com textura de canvas; acompanha a cena)
```

### 6.2 Parentescos que existem por razão de projeto

Cada parentesco tem que responder "por que esses dois?" a partir do **domínio**, não do enunciado:

| Filho → Pai | Razão de projeto (mundo real) | O que se ganha |
| :--- | :--- | :--- |
| trilho → painel | O trilho é parafusado na placa | Mexer no painel leva o trilho, sem somar coordenada |
| disjuntor/borne → trilho | Peça encaixada só se move junto com o trilho e **ao longo dele** | O deslizar vira mudança de **um número** (`position.x`) no espaço do trilho |
| fio/terminal/rótulo → peça | São partes físicas da peça | Pegar a peça leva os fios junto |
| furo → trilho | Furos fazem parte do trilho | Idem |
| led → painel | O LED é fixo na placa | Idem |
| raiz → tudo | Permite mover a cena inteira no AR | Ancorar na mesa = mudar **uma** posição |
| indicador → raiz | O indicador acompanha a cena | Fica visível junto do painel, no visor ou na mesa |

O disjuntor solto **não** é filho do trilho; o oposto (solto ↔ encaixado) é justamente o que a troca de pai faz.

### 6.3 Objetos e medidas (metros)

Constante `M` em `scene.ts`; os valores do disjuntor e do painel vêm da especificação (Seções 3 e 4).

| Objeto | Qtd. | L × A × P (m) | Origem da medida | Observação |
| :--- | :---: | :--- | :--- | :--- |
| Bancada | 1 | 1,20 × 0,90 × 0,60 | Especificação (altura corrigida, D2) | Topo a 0,90 m |
| Painel | 1 | 0,60 × 0,40 × 0,05 | Especificação | Centro a 1,10 m do piso |
| Trilho | 1 | 0,50 × 0,035 × 0,01 | Especificação | Fixo no painel |
| Disjuntor | 4 | 0,018 × 0,085 × 0,065 | Especificação | Cores: azul, cinza, cinza, azul |
| Borne | 2 | 0,012 × 0,060 × 0,045 | **Assumida** (D8) | Verde, como na foto |
| Barramento | 1 | 0,090 × 0,012 × 0,012 | **Assumida** (D8) | Na bandeja |
| LED | 1 | esfera, raio 0,008 | Especificação (indicador) | Cinza escuro → verde ao energizar |
| Bandeja (chapa) | 1 | 0,40 × 0,02 × 0,20 | Escolha do grupo (D9) | Sobre a bancada |

A escala em metros importa **agora**: corrigi-la depois significaria refazer cada medida da cena.

### 6.4 Detalhes que aproximam da foto de referência (todos primitivas, sem textura)

Função `detalharPeca` (em `scene.ts`): terminais dourados no topo e na base de cada disjuntor, com parafuso escuro e
fio azul/vermelho/preto (cilindro fino) que sobe até a canaleta; janela e alavanca escuras e rótulo branco na frente;
bornes com tampa escura, parafusos e fios; barramento com dentes de pente. Tudo isso é **filho da peça**: pegar a peça
leva os fios junto. Os detalhes não participam do raycast; quem responde ao mouse é o corpo da peça. Furos do trilho
como rasgos escuros e fila de peças coladas (folga de 2 mm), com um trecho livre de trilho à direita para encaixar.

**Cenografia** (função `montarCenografia`): para a cena se parecer com um quadro de verdade (foto de referência), o
painel ganha uma moldura, uma segunda fila de trilho com disjuntores e medidores de visor vermelho, três canaletas
ranhuradas e o aro do LED. É tudo **estático, filho do painel** (balança junto com a tecla `B`) e **não é apanhável**.
Não faz parte do inventário da Seção 3 da especificação. Para não pesar no orçamento, as centenas de caixas iguais são
agrupadas em `InstancedMesh` (uma chamada de desenho por material). O indicador de custo mostra o efeito.

### 6.5 Como conferir que é árvore, e não lista de coordenadas absolutas

1. Pressione **B**: o painel balança e o trilho, os bornes, os disjuntores e o LED vão juntos. Nenhum código soma
   coordenada de filho: só `painel.rotation.y` muda.
2. No console: `xrScene.trilho.children` lista os filhos.

---

## 7. Passo 8 — Reparentar sem recalcular à mão

Arquivo: `src/reparentar.ts`.

### 7.1 O problema

Um filho guarda sua posição **em relação ao pai** (transformação *local*). Se você simplesmente mudar de pai
(`novoPai.add(obj)`), a posição local continua a mesma, mas agora é relativa a **outro** pai: o objeto "pula" no mundo.

### 7.2 A solução (uma operação só)

```
M_local_novo = inverse(M_mundo_novoPai) · M_mundo_objeto
```

Isto é: calcula onde o objeto está no mundo e o expressa no espaço do novo pai. É o que `Object3D.attach()` faz;
`reparentar(objeto, novoPai)` o embrulha e devolve os números antes e depois:

```ts
reparentar(objeto, novoPai) → { posAntes, posDepois, erroMetros, erroGraus }
```

### 7.3 Exemplo com números

Novo pai em (1, 0, 0), girado 90° em torno de Y. Objeto no mundo em (0,3; 0,1; 0,2).

- `p − t = (0,3 − 1; 0,1; 0,2) = (−0,7; 0,1; 0,2)`
- desfazer a rotação de 90° em Y: `(x, y, z) → (−z, y, x)` ⇒ posição **local** = `(−0,2; 0,1; −0,7)`
- conferência (ida): girar 90° em Y `(x, y, z) → (z, y, −x)` ⇒ `(−0,7; 0,1; 0,2)`; somar `t` ⇒ `(0,3; 0,1; 0,2)` ✓

O objeto continua no mesmo ponto do mundo, mas os números locais mudaram por completo — e ninguém os calculou à mão.

### 7.4 Casos de fronteira (função `rodarCasosDeFronteira`)

Cada caso monta objetos descartáveis (não tocam a cena) e confere posição e orientação **em números**:

| Caso | Por que é difícil |
| :--- | :--- |
| Pais só transladados | Base: deve ser trivial |
| Novo pai girado 90° | Rotação entra na conta |
| Novo pai com escala uniforme 2× | Escala entra na conta |
| Cadeia de 3 níveis, pais girados e escalados | Composição de várias transformações |
| Mesmo pai | Operação vazia não pode alterar nada |
| Novo pai é a raiz | É o caso de "soltar" o objeto de um controle |

Tolerância de conferência: **0,1 mm** e **0,01°**. Resultado medido: erro da ordem de **1e-16 m** em todos os casos.
Para rodar no ambiente: tecla **T** (mostra na tela e no console).

### 7.5 Por que não recalcular a cada quadro

Alternativa descartada: a cada quadro, calcular a posição do objeto a partir do pai. Custa por quadro, exige que
alguém lembre de fazê-lo, e sai de sincronia no primeiro pai girado. A troca de pai é feita **uma vez**, no evento.
O erro de composição desloca pouco numa cena pequena e não acusa nada até a cena crescer — por isso é conferido
em números.

### 7.6 Limite conhecido

Pai com **escala não uniforme combinada com rotação** produz cisalhamento, que o Three.js não representa: a
**posição** é preservada, mas a **orientação** pode divergir. **Não testado.**

---

## 8. Passo 9 — O laço contra o relógio e o orçamento

Arquivos: `src/main.ts` (laço) e `src/custo.ts` (indicador e tetos).

### 8.1 Avançar por tempo, não por quadro

`xrScene.update(delta)` recebe `delta` em **segundos**. Tudo que se move usa velocidade por segundo:

- disjuntor deslizando: `x += sentido · 0,06 m/s · delta`
- painel balançando: `sin(tempo / 1,5)`, onde `tempo` é a soma dos `delta`
- queda: `vy −= 9,8 m/s² · delta`

Numa máquina a 30 quadros/s ou a 144, o disjuntor percorre a mesma distância por segundo.
Se contasse quadros (`x += 0,001` por quadro), andaria 4,8× mais rápido nos 144 Hz.

**Proteção:** `delta` é limitado a 0,1 s (`DELTA_MAX_S`). Se a aba ficar em segundo plano, a cena não "teleporta".

### 8.2 O indicador dentro da cena

Um plano 0,40 × 0,20 m com textura de canvas, filho da `raiz`, acima do painel. Mostra:

- **CPU média** e **CPU pico** (últimos 120 quadros), em ms;
- **Teto** do regime atual;
- **Taxa** em quadros/s (a partir do intervalo real entre quadros);
- **DENTRO DO TETO** ou **ESTOURADO**;
- a **máquina** (GPU, núcleos, plataforma) — para registrar onde foi medido.

O canvas é redesenhado 4 vezes por segundo (não a cada quadro), para o próprio indicador não pesar.

### 8.3 O teto (declarado antes de haver conteúdo pesado)

| Regime | Alvo | Teto por quadro |
| :--- | :---: | :---: |
| Tela | 60 quadros/s | 16,67 ms |
| AR | 30 quadros/s | 33,33 ms |
| VR | 72 quadros/s | 13,89 ms |

Fórmula: `1000 ms ÷ taxa-alvo`. O regime é detectado por `session.environmentBlendMode`
(`opaque` = VR; `alpha-blend`/`additive` = AR; sem sessão = tela).

### 8.4 O que a medida é — e o que não é

- **É:** tempo de CPU para atualizar a cena e *enviar* o desenho (`update` + `render`).
- **Não é:** tempo de GPU. Um quadro pode custar 3 ms de CPU e mesmo assim sair a 20 quadros/s se a GPU for o
  gargalo; por isso o indicador também mostra a **taxa**. Alternativa descartada: `EXT_disjoint_timer_query`
  (indisponível em vários navegadores móveis).

### 8.5 Como medir e registrar

Abra o endereço, espere ~10 s e anote em `docs/medicoes.md` a linha `Máquina:` do console junto dos números.
O número do slide 7 tem que sair dali.

---

## 9. Passos 5 e 6 — A sonda de capacidades

Arquivo: `src/sonda.ts`.

### 9.1 A regra

**Nunca assumir uma capacidade que o aparelho não declarou.** Assumir não quebra nada: o ambiente apenas faz a
coisa errada, em silêncio. Por isso a sonda **pergunta de verdade** ao aparelho.

### 9.2 Duas fases

| Fase | Quando | O que pergunta | Como |
| :--- | :--- | :--- | :--- |
| **1** | Ao abrir a página (sem gesto do usuário) | A API WebXR existe? Quais modos de sessão o aparelho suporta? | `navigator.xr` e `isSessionSupported()` para `inline`, `immersive-vr`, `immersive-ar` |
| **2** | Ao entrar em VR/AR (o clique é o gesto exigido) | Que recursos foram **concedidos**, que fontes de entrada existem, quantos graus de liberdade | `session.enabledFeatures`, `session.inputSources`, `viewerPose.emulatedPosition` |

O WebXR só revela a fase 2 com sessão aberta; por isso a sonda é em duas partes.

### 9.3 Ausente ≠ negado (a distinção que o ambiente preserva)

| Estado | Significa | O ambiente responde |
| :--- | :--- | :--- |
| `suportado` | O aparelho declarou e concedeu | Oferece o botão / usa o recurso |
| `nao-suportado` | A API existe e respondeu que não | Cai para o regime de tela |
| `ausente` | A API (ou o recurso) nem existe | Explica: navegador sem WebXR ou página sem HTTPS |
| `negado` | Foi pedido e recusado (permissão, contexto inseguro, recurso opcional não concedido) | Oferece tentar de novo ou usar tela |
| `erro` | A consulta falhou por outro motivo | Mostra a mensagem |
| `nao-consultado` | Ainda não houve sessão para perguntar | Mostra "entre em VR/AR" |

### 9.4 Graus de liberdade

Com a sessão aberta, pega-se a pose do visor; `emulatedPosition === true` significa que a posição é inventada (3DoF);
`false` significa rastreamento real de posição (6DoF).

### 9.5 A resposta é usada, não só exibida

Em `main.ts`, os botões ENTER VR / START AR **só são criados** se a fase 1 disse `suportado`. O ambiente consulta a
estrutura da sonda para decidir o que oferecer.

### 9.6 O relatório na tela (passo 6)

`criarPainelRelatorio()` cria um painel no canto inferior esquerdo, legível em qualquer aparelho. **Mesmo endereço,
aparelhos de classes diferentes, relatórios diferentes.** Conferir só na própria máquina é a armadilha: é o aparelho
do colega que revela o que a sonda descobriu.

---

## 10. A mão virtual (mouse) e o encaixe

Arquivos: `src/mao.ts` e, em `src/scene.ts`, `tentarEncaixar()` e a queda.

### 10.1 A mão é um nó da árvore

`MaoVirtual.grupo` é um `Group` que só se **translada** e recebe a peça pegada. Dentro dele, o nó `visual` gira para a
câmera e se inclina para dentro da cena (por isso a peça nunca gira junto com a câmera e o teste de ângulo do encaixe
não é afetado). A mão tem primitivas: palma arredondada, pulso, punho e manga, 4 dedos de 3 falanges, polegar de 2,
unhas e nós dos dedos. Os dedos são **cadeias de pivôs**: "fechar a mão" é girar os pivôs (`aplicarPose`). A ponta do
indicador é ancorada na origem do grupo (`ancorarPonta`), então a mão sempre toca o ponto sob o mouse. Três poses:
aberta (mouse sobre uma peça), relaxada (mouse no vazio) e pinça (segurando). Ela **não existe** dentro de sessão
VR/AR (lá, quem pega são os controles).

**Ideia-chave:** *pegar é trocar de pai.* Pegar = `reparentar(peca, mao)`; soltar = `reparentar(peca, raiz)`.
A peça acompanha a mão porque é filha dela — ninguém soma coordenada.

### 10.2 Os três estados

| Situação | Gesto | O que acontece |
| :--- | :--- | :--- |
| Mouse sobre uma peça | (nenhum) | Realce (`emissive`) e a mão abre sobre ela |
| Peça **solta** | Arrastar | A peça vira filha da mão e segue o mouse num plano paralelo à tela |
| Peça **encaixada** | Arrastar | Só desliza no eixo do trilho (1 grau de liberdade), limitada pelas pontas e pelas vizinhas |
| Peça encaixada | **Shift** + arrastar | Desencaixa (comando explícito, Seção 5 da especificação) e vira "solta" |

### 10.3 Como o mouse vira posição 3D

O mouse dá um ponto 2D. Dispara-se um **raio** da câmera através dele (`Raycaster.setFromCamera`) e intersecta-se
o raio com um **plano**:

- ao carregar: plano paralelo à tela, passando pelo ponto em que se agarrou a peça;
- ao deslizar: plano da face do trilho (contém o eixo de deslize).

Assim a peça permanece na mesma profundidade enquanto se move.

**Ajuda de profundidade:** se o mouse estiver sobre a região do trilho (±5 cm nas pontas, ±6 cm de altura), a peça
carregada vai para o plano de encaixe, para que soltar "perto do trilho" seja possível a partir da bandeja. Fora
dessa região, vale o plano paralelo à tela. A tolerância do encaixe (3 cm, 10°) continua sendo conferida em 3D.

### 10.4 O deslizar com 1 grau de liberdade

A cada quadro: o ponto do mouse é convertido para o espaço local do trilho (`worldToLocal`), só a coordenada `x`
importa, e é limitada por `min`/`max`. Os limites vêm das pontas do trilho (±0,25 m menos meia largura) e das
peças vizinhas (meia largura de cada uma + 0,5 mm). A peça **não atravessa** as vizinhas.

### 10.5 O encaixe (`XRScene.tentarEncaixar`)

Ao soltar uma peça carregada, o ambiente verifica, nesta ordem, e devolve `{ ok, motivo }`:

| # | Verificação | Limite (Seção 7 da especificação) | Motivo se falhar |
| :-: | :--- | :--- | :--- |
| 0 | Não é o barramento | — | "encaixe nos terminais ainda não implementado (Bloco 2)" |
| 1 | Distância ao eixo do trilho (no plano y–z local) | ≤ **0,03 m** | "longe do trilho (X cm; máximo 3 cm)" |
| 2 | Ângulo entre a peça e o trilho | ≤ **10°** | "pose angular incorreta (X°; máximo 10°)" |
| 3 | Dentro do comprimento do trilho | \|x\| ≤ 0,25 − meia largura | "fora do comprimento do trilho" |
| 4 | Trecho livre (sem sobrepor outra peça) | — | "esse trecho do trilho já está ocupado" |

**Se aceita:** `reparentar(peca, trilho)` e depois o **alinhamento** (y = 0, z = altura de encaixe, rotação zerada).
O encaixe é esse alinhamento, e é deliberadamente **separado** da troca de pai, que só preserva o mundo.

**Se recusada:** a peça é reparentada à raiz e entra no conjunto `soltas`; o motivo aparece na tela.

Testado em Node, com a cena real, sem navegador: solto a 1 cm do eixo → encaixa; a 10 cm → recusa; sobre outra
peça → recusa; girado 30° → recusa (29,8°); barramento → recusa com aviso.

### 10.6 A queda

Peças em `soltas` recebem gravidade simples (`g = 9,8 m/s²`, integrada por `delta`) até pousar no topo da bancada
(ou da chapa da bandeja, ou do piso se soltas fora da bancada). **Não há colisão entre peças.** A gravidade só age em peça cujo pai é a `raiz`: peça no trilho, na bandeja ou
na mão não cai.

---

## 11. VR e AR: controles, hit-test e âncora

> **Não verificado em aparelho.** O código existe e compila; só o regime de tela foi visto rodando.

### 11.1 Controles (`src/controllers.ts`)

- dois controles XR, cada um com modelo 3D, raio de apontamento e realce do objeto mirado;
- **gatilho pressionado** (`selectstart`): raycast; se acertou uma peça, `reparentar(peca, controle)`;
- **gatilho solto** (`selectend`): `reparentar(peca, bandeja)`;
- em AR, o toque na tela é o "controle 0"; só se pode pegar peças **depois** de ancorar a cena.

Ainda **não** há restrição de trilho nem encaixe nos controles; isso é do Bloco 2.

### 11.2 AR: hit-test e âncora (`src/ar.ts`)

1. `requiredFeatures: ['hit-test']` ao abrir a sessão AR;
2. a cada quadro, o hit-test lança um raio da câmera do aparelho contra as superfícies reais;
3. um **retículo** (anel azul) mostra onde o raio toca a mesa;
4. o **primeiro toque** ancora a cena naquele ponto e o retículo some;
5. os toques seguintes pegam peças.

**Como a âncora é calculada** (`main.ts`): a bancada virtual é ocultada e o **topo da bancada** (0,90 m) é levado
ao ponto tocado: `raiz.position = (ponto.x, ponto.y − 0,90, ponto.z + 0,5)`. Assim o painel se apoia na mesa real.
O `+ 0,5` compensa o centro da bancada estar em z = −0,5 dentro da raiz. O fundo da cena é retirado (`null`) para
a câmera aparecer.

**Por que as peças são filhas de `raiz` e não da `scene`:** ancorar a cena inteira vira mudar **uma** posição.

**Por que bancada e painel são irmãos:** para ocultar a bancada (`visible = false`) sem ocultar o painel — ocultar um
pai oculta todos os filhos (decisão D10).

---

## 12. Controles e atalhos

**Mouse (regime de tela):**

| Ação | Efeito |
| :--- | :--- |
| Arrastar no vazio | Orbitar a câmera |
| Roda | Zoom |
| Passar sobre peça | Realce + mão abre |
| Arrastar peça solta | Pegar e carregar |
| Arrastar peça encaixada | Deslizar no trilho |
| Shift + arrastar peça encaixada | Desencaixar |
| Soltar perto do trilho | Tentar encaixar (3 cm, 10°) |
| Soltar longe | A peça cai na bancada, com o motivo na tela |

**Teclado e botões:**

| Tecla / botão | Efeito |
| :--- | :--- |
| `Espaço` / botão "Trocar pai do disjuntor" | Passo 8: alterna o pai do disjuntor móvel entre trilho e bandeja e mostra a posição no mundo antes e depois |
| `T` / botão "Casos de fronteira" | Roda os 6 casos de fronteira do passo 8 |
| `B` | Liga/desliga o balanço do painel (demonstra "o pai move o filho") |
| `S` | Liga/desliga o deslize automático do último disjuntor |
| `L` | Acende/apaga o LED |

---

## 13. Decisões e alternativas descartadas

Resumo para os slides ("como" + "por que assim e não de outro jeito"). O registro completo, com a numeração D1–D14,
está no fim da especificação.

| Decisão | Alternativa descartada | Razão do descarte |
| :--- | :--- | :--- |
| Cena como árvore de nós com transformação local | Lista de objetos com coordenadas absolutas | Mesma imagem na tela, mas mover o painel exigiria recalcular cada filho à mão; o erro só aparece quando a cena cresce |
| Trocar de pai com `attach` (uma vez, no evento) | Recalcular a posição a cada quadro | Custo por quadro; sai de sincronia no primeiro pai girado |
| Laço por tempo transcorrido (delta em s) | Contar quadros | Em 144 Hz a cena andaria 4,8× mais rápido que em 30 Hz |
| Indicador de custo dentro da cena (canvas) | `<div>` no DOM | O DOM não aparece no visor |
| Custo = CPU + intervalo entre quadros | Medir GPU com `EXT_disjoint_timer_query` | Indisponível em vários navegadores móveis |
| Teto por regime (16,67 / 33,33 / 13,89 ms) | Um teto único de 16,67 ms | VR exige 72 quadros/s; AR em celular mira 30 |
| Sonda em duas fases | Lista fixa de recursos "prováveis" | Assumia o que o aparelho nunca declarou |
| Distinguir ausente / negado / não suportado | Um único `false` | São situações diferentes e pedem respostas diferentes |
| Geometria crua no Módulo 03 | Importar `.gltf` já | Esconderia a estrutura atrás de peças bonitas |
| Mão como nó da árvore; pegar = reparentar | Copiar a posição da mão para a peça a cada quadro | Reaproveita o passo 8; nunca sai de sincronia |
| Gravidade simples só nas soltas | Biblioteca de física completa | Pesa no orçamento e esconde a estrutura |
| Bancada e painel irmãos sob `raiz` | Painel filho da bancada | Ocultar a bancada no AR ocultaria o painel |
| Cena abre com peças já encaixadas (D12) | Peças espalhadas na bancada | O módulo cobra parentescos por razão de projeto; o estado da Seção 6 volta no Bloco 2 |

---

## 14. Mapa dos nove passos

| # | Passo | Onde está | Como conferir (o "pronto quando") |
| :-: | :--- | :--- | :--- |
| 1 | Escolher a cena | `especificacao.md` §1 | A razão da escolha é de custo, não de gosto |
| 2 | Delimitar o domínio | `especificacao.md` §2, §6 | Existe uma tarefa (encaixar e energizar), não só um cenário |
| 3 | Declarar os três regimes | `especificacao.md` §9.1 | Os três se distinguem pelo que fazem com o mundo (tabela 9.1) |
| 4 | Escrever a especificação (14 seções) | `docs/especificacao.md` | Toda frase pode estar errada (tem número) |
| 5 | Sonda de capacidades | `src/sonda.ts` | A consulta é feita de verdade; ausente ≠ negado |
| 6 | Relatório visível | `src/sonda.ts` → `criarPainelRelatorio` | Mesmo endereço, aparelhos diferentes, relatórios diferentes (**testar em 2 aparelhos**) |
| 7 | Cena como árvore | `src/scene.ts` | Tecla `B`: mover o pai move o filho |
| 8 | Reparentar | `src/reparentar.ts` | Tecla `Espaço` e tecla `T`: posição antes/depois em números |
| 9 | Laço contra o relógio | `src/main.ts`, `src/custo.ts` | Indicador visível na cena, teto declarado, laço por delta |

---

## 15. Roteiro da demonstração e perguntas prováveis

### 15.1 Roteiro (as quatro coisas, nesta ordem)

Rodar a partir do estado etiquetado, **numa máquina que não é a de quem escreveu o código**.

1. **A cena abre com os objetos prometidos.** Mostrar: bancada, painel, trilho, 4 disjuntores, 2 bornes,
   barramento na bandeja, LED. Conferir com o inventário da Seção 3 da especificação.
2. **Um objeto se move junto com outro porque está preso a ele.** Tecla `B`: o painel balança e leva trilho,
   peças e LED. Dizer *por que* o disjuntor é filho do trilho (razão do domínio: peça encaixada só desliza ao longo dele).
3. **Um objeto troca de pai e continua onde estava.** Tecla `Espaço`: ler em voz alta a posição antes e depois;
   depois `T` para os casos de fronteira.
4. **O indicador de custo do quadro está visível dentro da cena.** Apontar o plano acima do painel: média, pico,
   teto, taxa e máquina.

*Extra (se sobrar tempo):* pegar uma peça com a mão, soltar perto do trilho (encaixa) e longe (recusa, cai).

Se algo não abrir: **dizer o que falta e levar ao slide 7.** Isso também é informação.

### 15.2 Perguntas que o sorteio pode fazer — e boas respostas

**"Por que esses dois têm parentesco?"** Porque a peça encaixada só se move junto com o trilho e ao longo dele.
Esse parentesco reduz o deslizar a um único número no espaço do trilho. Se fosse absoluto, cada movimento do painel
exigiria recalcular todas as peças.

**"O que acontece com o custo se a árvore ganhar mais um nível?"** Cada nível acrescenta uma multiplicação de
matriz por objeto no cálculo das transformações de mundo. Com ~40 nós o efeito é desprezível; o custo cresce
linearmente com o número de nós e com a profundidade. Sem medir, não dá para dar o número: o indicador existe
para isso.

**"O que a manipulação de objetos, nos módulos adiante, vai precisar encontrar nessa árvore?"** Uma operação de
reparentar confiável (já existe), um espaço local do trilho onde o deslizar é 1 número, e a lista de objetos
apanháveis (`apanhaveis`) com o tipo de cada um (`userData.tipo`).

**"Por que `attach` e não `add`?"** `add` mantém os números locais, então o objeto salta no mundo. `attach` calcula
os números locais novos para o objeto ficar onde estava.

**"E se o pai novo tiver escala não uniforme e rotação?"** A posição é preservada, mas a orientação pode divergir
(cisalhamento que o Three.js não representa). Não foi testado; é uma limitação conhecida.

**"O que muda em outra máquina se o laço contar quadros?"** A cena andaria mais rápido em máquinas rápidas e mais
devagar em lentas. Por isso a velocidade é em m/s e o `delta` vem do relógio.

**"O que quebraria se a sonda assumisse capacidade não declarada?"** Nada quebraria: o ambiente apenas faria a
coisa errada (ex.: pedir hit-test num aparelho que não o concede e não ancorar a cena). É o pior tipo de falha:
silenciosa.

**"O teto é de CPU. E a GPU?"** Não é medida. O indicador mostra também a taxa; se a taxa cai com CPU baixa, o
gargalo é a GPU.

**"Isso funciona no visor?"** O código de sessão, controles e hit-test existe e compila, mas **não foi verificado em
aparelho**. Dizer isso é o nível Adequado; fingir que funciona derruba a nota.

**"Em que ponto uma decisão do projeto do professor não serve para a sua cena?"** Preparar antes: escolher uma
decisão do projeto do professor e dizer o que o grupo fez no lugar (por exemplo, o 1 grau de liberdade do trilho,
que a cena dele provavelmente não tem).

---

## 16. Limitações e o que ainda não existe

**Não verificado em aparelho:** VR (visor) e AR (celular). Sessão, controles, hit-test e âncora estão escritos e
compilam, mas só o regime de tela foi visto rodando.

**Ainda não implementado:**

- validação da tarefa (LED acendendo ao completar a montagem);
- regra do barramento (só encaixa após ≥ 2 disjuntores alinhados; cobre os terminais);
- sons, vibração (haptics), contorno azul/vermelho do retorno ao usuário;
- encaixe e restrição de 1 GdL nos controles de VR/AR;
- colisão entre peças na queda;
- ativos importados (`.gltf`), texturas e materiais elaborados (módulos seguintes);
- perda de rastreamento em AR (Seção 11 da especificação);
- escala ajustável do AR (decisão em aberto D3).

**Revisão visual (cenografia, mão nova, fila colada, ajuda de profundidade, gravidade só na raiz):** escrita e conferida
apenas quanto à sintaxe. **Não verificada em navegador** nesta revisão; rodar `npm run typecheck` e abrir o ambiente
antes de citar como funcionando.

**Limites técnicos conhecidos:**

- o custo medido é de CPU, não de GPU;
- pai com escala não uniforme + rotação não foi testado no `reparentar`;
- as medidas do borne e do barramento são assumidas (D8);
- os endereços de ativos da Seção 12 da especificação não foram verificados (D5);
- o painel de relatório da sonda e as mensagens da mão usam DOM: aparecem no regime de tela, mas **não** dentro do visor nem no AR (o DOM fica fora do overlay da sessão). Só o indicador de custo está dentro da cena.

---

## 17. Glossário

| Termo | Significado |
| :--- | :--- |
| **WebXR** | API do navegador para realidade virtual e aumentada |
| **Regime** | Cada uma das três maneiras de tratar o mundo de quem observa: substituir (VR), manter e depositar (AR), janela (tela) |
| **Grafo de cena / árvore** | Hierarquia de objetos em que cada nó tem transformação relativa ao pai |
| **Transformação local / de mundo** | Posição/rotação/escala relativa ao pai / relativa à cena inteira |
| **Reparentar** | Trocar de quem o objeto é filho **preservando** a posição no mundo |
| **`attach`** | Método do Three.js que reparenta preservando a transformação de mundo |
| **Raycast / raio** | Linha lançada da câmera ou do controle para achar o que ela atinge |
| **Hit-test** | Raio lançado contra as superfícies reais (AR) |
| **Espaço de referência** | Sistema de coordenadas do aparelho (`local`, `local-floor`, `viewer`) |
| **6DoF / 3DoF** | Seis / três graus de liberdade rastreados (posição+rotação / só rotação) |
| **1 grau de liberdade** | Movimento livre em um único eixo (a peça no trilho só desliza em X) |
| **Delta** | Tempo transcorrido desde o quadro anterior, em segundos |
| **Teto (orçamento)** | Limite de tempo por quadro, declarado antes do conteúdo pesado |
| **Trilho DIN** | Barra metálica padronizada onde se encaixam componentes elétricos |
| **Disjuntor / borne / barramento** | Componentes do quadro: proteção, ponto de conexão, barra que liga os terminais |
| **Tolerância de encaixe** | Folga aceita para o encaixe: 3 cm de posição e ±10° de ângulo |
| **Sonda de capacidades** | Consulta que o ambiente faz ao aparelho sobre o que ele oferece |
| **Contexto seguro** | Página servida por HTTPS (ou localhost), exigida pelo WebXR |

---

## 18. O que só o grupo pode fazer

Nada disto pode ser feito por quem escreveu o código; é exigido pela entrega:

1. **Criar a etiqueta `modulo-03`** no repositório e colocar o endereço no slide 1.
2. **Preencher `docs/aparelhos.md`** só com o que for visto rodando, e anotar o relatório da sonda de cada aparelho.
3. **Medir e preencher `docs/medicoes.md`**; o número do slide 7 tem que sair dali, com a máquina.
4. **Testar a sonda em duas classes de aparelho** com o mesmo endereço (passo 6).
5. **Fazer alguém de fora abrir o ambiente** a partir da etiqueta, em outra máquina, seguindo só o README.
6. **Produzir o deck** `grupoNN_modulo03.pptx`: 7 slides, na ordem, cada um com o *como* (trecho real do
   repositório, com o caminho) e o *porquê* (com a alternativa descartada). Slide que finge pronta uma peça que o
   repositório desmente cai para o nível mais baixo.
7. **Verificar os endereços de ativos** da Seção 12 da especificação antes de citá-los.
8. **Ensaiar em voz alta:** cada integrante explica pelo menos um slide que não fez. O `reparentar`, o laço por
   tempo e a sonda são os candidatos mais prováveis a cair no sorteio.
