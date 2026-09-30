# Especificação do Projeto: Quadro Elétrico em Trilho

## Bloco A — A cena

### Seção 1. Identificação do grupo e da cena
* **Nome do grupo:** Grupo 9
* **Integrantes:** Emerson Caique, Hugo Pacheco, Caua dos Santos, José Victor
* **Cena escolhida:** Quadro elétrico em trilho.
* **Resumo em uma frase:** Um painel elétrico onde a pessoa ajusta e encaixa componentes sobre um trilho metálico para completar a montagem e energizar o circuito.
* **Justificativa da escolha:** A cena foi escolhida porque simplifica a física do encaixe ao restringir a manipulação da peça encaixada a 1 grau de liberdade (deslizar apenas no eixo do trilho), permitindo focar a complexidade técnica no problema de diferenciar apanhar do nada versus desprender do trilho.
* **Armadilha da cena e mitigação:** A armadilha é a geometria simples das caixas retangulares dos componentes levar o grupo a gerar tudo via código sem importar modelos. Mitigação: os bornes e o barramento serão obrigatoriamente importados de arquivos de troca externos (formato `.gltf`/`.glb`) com escala ajustada no projeto.

### Seção 2. O que a pessoa faz ali
A pessoa aproxima-se de uma bancada com um painel vertical contendo um trilho metálico DIN fixo. Ao lado, encontram-se disjuntores, bornes e um barramento. A pessoa apanha um disjuntor com a mão ou controle, orienta sua trava para baixo, aproxima-o do trilho e o solta; o disjuntor se fixa e passa a deslizar exclusivamente ao longo do trilho. Em seguida, alinha os disjuntores e posiciona o barramento sobre eles. Quando todos os componentes estão encaixados e o barramento é conectado, um indicador luminoso acende, validando a montagem.

* **O que faz com as mãos:** Apanha peças soltas, orienta a garra/trava de encaixe para baixo, aproxima do trilho para encaixar e desliza os componentes já presos lateralmente ao longo do eixo.
* **O que muda com o visor:** Em 3D imersivo, o usuário consegue inclinar a cabeça para inspecionar a parte inferior da trava do disjuntor e julgar visualmente o alinhamento angular relativo ao trilho antes de soltar a peça.
* **O que a câmera prova na mesa de verdade (AR):** O trilho se fixa à superfície da mesa real; o movimento da câmera em volta permite inspecionar se a peça virtual está fisicamente nivelada e assentada sobre a borda do trilho real sem atravessar a mesa.

### Seção 3. Inventário de objetos

| Objeto | Quantos | Origem | Move? | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **Placa com Trilho DIN** | 1 | Construída por código | Não | Estrutura de suporte fixa da cena. |
| **Disjuntor Monofásico** | 4 | Modelo importado (`.gltf`) | Sim | Peça apanhável; possuem cores/rótulos de corrente diferentes. |
| **Borne de Conexão** | 2 | Modelo importado (`.gltf`) | Sim | Importado de arquivo externo para cobrir a cota de ativos. |
| **Barramento Elétrico** | 1 | Modelo importado (`.gltf`) | Sim | Só encaixa após o alinhamento prévio dos disjuntores. |
| **Indicador Luminoso (LED)** | 1 | Construído por código | Não | Elemento fixo na placa que muda de cor ao energizar. |
| **Bancada de Apoio** | 1 | Construída por código | Não | Cenário estático de fundo. |

### Seção 4. O espaço e as escalas
* **Dimensões do ambiente:** A placa base mede $0,60\text{ m}$ (largura) $\times 0,40\text{ m}$ (altura) $\times 0,05\text{ m}$ (profundidade). O trilho metálico possui $0,50\text{ m}$ de comprimento.
* **Dimensões dos objetos:** Cada disjuntor mede $0,018\text{ m}$ (largura) $\times 0,085\text{ m}$ (altura) $\times 0,065\text{ m}$ (profundidade).
* **Local de apoio:** Presa verticalmente a um painel apoiado sobre uma mesa de trabalho.
* **Duas escalas legítimas:** Sim. 
  * *Escala Reduzida (AR):* 1:1 sobre a mesa de testes para visualização e manipulação via celular.
  * *Escala Real 1:1 (VR):* Painel montado na altura dos olhos ($1,50\text{ m}$ do chão virtual) para interação imersiva no visor.

---

## Bloco B — As regras

### Seção 5. As ações do usuário

| Ação | O que a pessoa faz | O que o sistema faz | Se não puder |
| :--- | :--- | :--- | :--- |
| **Apontar** | Mira o cursor/controle em um componente. | O componente exibe um contorno brilhante (outline amarelo). | Nada acontece (sem realce). |
| **Apanhar** | Pressiona o gatilho/botão sobre a peça realçada. | A peça é desvinculada do trilho/mesa e passa a seguir a posição do ponteiro. | Emite som curto de erro (bloqueado); pisca contorno vermelho se tentar tirar o barramento antes da hora. |
| **Ajustar / Deslizar** | Apanha uma peça que **já está** no trilho e move para os lados. | Restringe o movimento exclusivamente ao eixo longitudinal ($X$) do trilho. | Não permite destacar a peça perpendicularmente sem acionar o comando explícito de desencaixe. |
| **Encaixar** | Solta a peça próxima ao trilho com tolerância válida. | A peça alinha-se ao trilho, emite som de clique metálico ("clack") e trava seu movimento nos eixos $Y$ e $Z$. | Recusa o encaixe, a peça sofre ação da gravidade e cai na bancada; exibe texto/ícone curto informando o motivo. |

### Seção 6. A tarefa e sua validação
* **Estado inicial:** Placa com trilho vazia. 4 disjuntores, 2 bornes e 1 barramento dispostos aleatoriamente sobre a bancada ao lado. LED indicador desligado (cor cinza escuro).
* **Estado final:** 4 disjuntores e 2 bornes encaixados em sequência no trilho sem frestas excessivas; barramento encaixado cobrindo os terminais superiores dos 4 disjuntores; LED indicador aceso (cor verde brilhante).
* **Ordem das etapas:** Semi-rígida. 
  1. Os disjuntores e bornes podem ser encaixados no trilho em qualquer ordem lateral.
  2. O barramento **só pode** ser encaixado após ao menos 2 disjuntores estarem alinhados lado a lado no trilho.
* **Validação do sistema:** O sistema verifica se: (a) a lista de objetos colidindo com as âncoras do trilho contém todos os componentes necessários; (b) a distância lateral entre disjuntores é $< 0,002\text{ m}$; (c) o barramento intercepta os conectores válidos.

### Seção 7. Regras de encaixe e tolerâncias
* **Tolerância de Posição Linear:** A peça precisa ser solta a no máximo $0,03\text{ m}$ ($3\text{ cm}$) de distância do eixo central do trilho.
* **Tolerância Angular (Graus):** A peça precisa estar orientada com desvio angular máximo de $\pm 10^\circ$ em relação ao plano perpendicular do trilho.
* **Raciocínio e Teste de Tolerância:** Se a folga angular for maior que $15^\circ$, aceita disjuntores visivelmente tortos. Se for menor que $5^\circ$, exige precisão excessiva e frustra o usuário no controle 3D. O intervalo de $10^\circ$ permite aceitar a pose manual sem esforço e ainda assim recusar a pose incorreta.

### Seção 8. Retorno ao usuário
* **Objeto mirado:** Ganha um contorno (*outline*) amarelo sutil.
* **Objeto apanhado:** O contorno muda para azul e a peça emite uma leve sombra de projeção sobre o painel.
* **Encaixe aceito:** Som sintético de clique metálico mecânico, vibração leve no controle (*haptics*) e a peça trava instantaneamente no trilho com piscada rápida verde.
* **Encaixe recusado:** Som grave de recusa ("buzz"), a peça pisca em vermelho e um ícone flutuante curto indica a causa: `"Pose angular incorreta"` ou `"Encaixe o disjuntor antes do barramento"`.
* **Tarefa concluída:** Emissão de som de energização elétrica (*hum* contínuo suave), o LED do painel acende em verde intenso e partículas brilhantes e discretas surgem ao redor do painel.

---

## Bloco C — A máquina

### Seção 9. Os três regimes

| Aspecto | Na tela (Desktop) | No visor (VR) | Pela câmera (AR) |
| :--- | :--- | :--- | :--- |
| **Como se olha** | Janela 3D via mouse/teclado (órbita de câmera com botão direito). | Visão estereoscópica 6DoF imersiva acoplada à cabeça. | Tela do smartphone sobrepondo o modelo ao mundo real. |
| **Como se aponta e age** | Raycast a partir do ponteiro do mouse + clique para segurar. | Apontamento via raio do controle de movimento 3D + gatilho (*grab*). | Toque direto na tela sensível (*touch*) apontando o raio da câmera. |
| **Escala da cena** | Reduzida na janela do monitor. | Escala real 1:1 (painel na altura do peito). | Escala reduzida ajustável sobre a mesa física. |
| **O que a cena faz de diferente** | Mostra linhas de guia de alinhamento 2D projetadas na tela. | Permite usar as duas mãos para segurar a peça com uma e ajustar o trilho com a outra. | Ancura o painel na mesa física e projeta a sombra do disjuntor na superfície real. |
| **O que NÃO existe neste regime** | Não há noção de profundidade real nem rastreamento de cabeça. | Não há cursores 2D de tela nem menus fixos sobrepostos no campo visual. | Não há locomoção virtual (o usuário caminha fisicamente ao redor da mesa). |

### Seção 10. Orçamento e desempenho
* **Contagem de objetos:** 10 objetos tridimensionais no total (1 placa, 1 trilho, 4 disjuntores, 2 bornes, 1 barramento, 1 LED).
* **Meta de fluidez:** 
  * *Desktop:* 60 FPS estáveis.
  * *AR (Celular):* 30 FPS estáveis.
  * *VR (Visor):* 72 FPS mínimos para evitar enjoo (*motion sickness*).
* **Repetição e instâncias:** Os 4 disjuntores compartilham a mesma malha tridimensional (`Disjuntor_Base.gltf`) e a mesma textura, alterando apenas a instância e o material do rótulo.
* **Ordem de degradação (se a taxa de FPS cair):**
  1. Desativar sombras em tempo real do cenário e manter apenas a sombra de contato do disjuntor com o trilho.
  2. Reduzir a resolução das texturas dos componentes importados de $2048\times2048$ para $1024\times1024$.
  3. Remover a iluminação dinâmica ambiente, passando a usar iluminação simplificada (*Unlit/Baked*).

### Seção 11. Erros, limites e degradação
* **Aparelho não suporta WebXR/Imersivo:** O sistema exibe um aviso modal `"Modo Imersivo indisponível neste dispositivo"` e força a execução no regime de tela (Desktop/Touch).
* **Permissão de câmera negada (AR):** Exibe a mensagem `"Acesso à câmera necessário para Ancoragem AR"`. Oferece um botão para tentar permitir novamente ou alternar para o modo 3D orbital em tela.
* **Perda de rastreamento (Câmera apontada para parede lisa):** O objeto ancorado no mundo congela em sua última pose válida no espaço, a opacidade do painel virtual é reduzida a 50% e um aviso visual flutuante diz `"Procurando superfície..."`. A peça não desaparece abruptamente.
* **Pessoa sai do espaço útil / alça além do alcance:** A peça apanhada é automaticamente solta e retorna à sua posição original na bancada se a distância entre a mão virtual e o objeto ultrapassar $1,2\text{ m}$.

---

## Bloco D — O trabalho

### Seção 12. Ativos, formatos e licenças

| Arquivo | Origem | Licença | Endereço / Fonte |
| :--- | :--- | :--- | :--- |
| `disjuntor_din.gltf` | Sketchfab | Creative Commons Attribution (CC BY 4.0) | `https://sketchfab.com/3d-models/miniature-circuit-breaker` |
| `borne_terminal.gltf` | Poly Pizza | CC0 (Domínio Público) | `https://poly.pizza/m/borne_block` |
| `barramento_comb.gltf` | Modelado no Blender | Autoria Própria (Grupo) | Criado internamente no projeto. |
| `click_snap.wav` | Freesound | CC0 (Domínio Público) | `https://freesound.org/people/sample/sounds/click` |
| `electric_hum.wav` | Freesound | CC0 (Domínio Público) | `https://freesound.org/people/sample/sounds/hum` |

### Seção 13. Plano de construção por blocos
* **Bloco 1 (Cena estática e Raycast):** Placa, trilho e disjuntores renderizados na tela; sistema de seleção por Raycast (apontar e destacar) funcionando no regime Desktop.
* **Bloco 2 (Lógica de Encaixe e Regras):** Implementação da restrição de 1 grau de liberdade no trilho, verificação de tolerância angular/posicional e sistema de retorno visual e sonoro de recusa/sucesso.
* **Bloco 3 (Multi-regime VR/AR):** Suporte a controles WebXR 6DoF (VR) e ancoragem do painel em superfícies planas por detecção de plano via câmera de celular (AR).
* **Bloco 4 (Polimento e Degradação):** Validação da montagem do barramento, indicador de energização (LED), tratamento de erros de rastreamento e otimizações de orçamento.

### Seção 14. Riscos e decisões em aberto
* **Riscos mapeados:**
  * *Instabilidade do snap no trilho:* O objeto tremer quando preso ao trilho e acompanhando a mão. *Mitigação:* Travar matematicamente as coordenadas nos eixos $Y$ e $Z$ assim que o estado mudar para `preso_ao_trilho`.
  * *Perda de desempenho em celulares:* Desempenho instável no modo AR. *Mitigação:* Testes contínuos no Bloco 3 e ativação imediata da ordem de degradação.
* **Decisões em aberto:** O valor exato da tolerância angular ($10^\circ$) será calibrado após a realização do primeiro teste prático com os controles do visor.