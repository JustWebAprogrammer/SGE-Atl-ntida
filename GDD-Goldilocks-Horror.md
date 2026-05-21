# GDD — Goldilocks: The Bearlons' House
## *An Anthology Horror Game — Episode 1*

---

# Índice

1. [Visão Geral do Jogo](#1-visão-geral-do-jogo)
2. [História e Narrativa](#2-história-e-narrativa)
3. [Personagens](#3-personagens)
4. [Jogabilidade e Mecânicas](#4-jogabilidade-e-mecânicas)
5. [Estrutura de Nível — A Casa dos Bearlons](#5-estrutura-de-nível--a-casa-dos-bearlons)
6. [Sistema de Investigação e Pistas](#6-sistema-de-investigação-e-pistas)
7. [Sistema de Combate e Sobrevivência](#7-sistema-de-combate-e-sobrevivência)
8. [Inteligência Artificial — Goldilocks](#8-inteligência-artificial--goldilocks)
9. [Áudio e Atmosfera](#9-áudio-e-atmosfera)
10. [Interface e UI](#10-interface-e-ui)
11. [Roadmap de Desenvolvimento (Unity)](#11-roadmap-de-desenvolvimento-unity)
12. [Assets e Referências](#12-assets-e-referências)
13. [Apêndice — Diagrama de Fluxo do Jogo](#13-apêndice--diagrama-de-fluxo-do-jogo)

---

# 1. Visão Geral do Jogo

## 1.1 Título e Premissa

**Título provisório:** *"Fairy Tale Horrors — Episode 1: The Bearlons' House"*

**Género:** Horror de Sobrevivência / Investigação em Primeira Pessoa (First-Person Survival Horror)

**Plataforma-alvo:** PC (Windows) — eventualmente console se houver escala

**Engine:** Unity (2022 LTS ou superior)

**Estilo visual:** Realismo estilizado — gráficos semi-realistas com ênfase em iluminação e atmosfera, algo entre *Silent Hill: Shattered Memories* (realismo psicológico) e *Outlast* (imersão em primeira pessoa). A casa deve parecer normal à primeira vista — demasiado normal — para que o contraste com o horror seja mais violento.

**Duração estimada:** 45–90 minutos por episódio

## 1.2 Concept Pitch

> "Você é o Oficial Marcus Reed, um polícia rural destacado para atender a uma queixa de desaparecimento. O que parecia ser mais um dia pacato na vila de São Urso transforma-se numa luta pela sobrevivência quando descobre que os residentes — a família Bearlon — foram massacrados e a sua casa agora é o território de uma jovem mulher que há muito perdeu a humanidade. Bem-vindo ao conto que a avó nunca lhe contou."

## 1.3 Público-alvo

- Jogadores de horror psicológico (18+)
- Fãs de *Outlast*, *Amnesia*, *Alien: Isolation*, *Silent Hill*
- Pessoas que apreciam *dark fantasy* e releituras twisted de contos clássicos
- Jogadores que valorizam narrativa ambiental e história contada através do cenário

## 1.4 Tom e Atmosfera

| Elemento | Descrição |
|----------|-----------|
| Tom geral | Tensão crescente, desconforto psicológico, horror visceral |
| Primeiro ato | Investigativo, calmo, "algo está errado mas não sei o quê" |
| Segundo ato | Revelação, pânico, corrida — o momento do congelador |
| Terceiro ato | Sobrevivência, stealth, cat-and-mouse com Goldilocks |
| Final | Clímax emocional e físico, escapatória ou sacrifício |

---

# 2. História e Narrativa

## 2.1 Sinopse

A história começa **in media res** — o Padre Urso (um urso pardo alto que veste batina) chega à esquadra local e reporta o desaparecimento da família Bearlon. A família frequentava a missa todos os domingos sem falta. Já faltaram a dois domingos consecutivos, o que é altamente invulgar.

Os Oficiais **Marcus Reed** (o jogador) e **Elena Vasquez** (parceira, NPC) são enviados para fazer uma verificação de bem-estar.

O que encontram é uma casa que parece perfeitamente normal: luzes ligadas, aquecimento a funcionar, louça posta na mesa, camas feitas. Mas pequenos detalhes começam a não bater certo: a comida no frigorífico é demasiada para três pessoas, há um arranhão recente na porta da cave, um cheiro estranho que vem do corredor...

Quando abrem o congelador vertical, encontram os corpos da família Bearlon embalados como carne de talho. Antes que possam processar o que veem, Goldilocks ataca Elena com uma pá (spade) — o golpe é tão violento que lhe separa a perna direita.

A partir daí, Marcus (agora sozinho e em pânico) tem que sobreviver, encontrar uma saída, e descobrir a verdade antes que Goldilocks acabe o serviço.

## 2.2 Backstory Detalhada (Goldilocks)

**Nome verdadeiro:** Desconhecido. Na sua vila de origem, chamavam-lhe "Goldie" em tom de escárnio.

**Idade:** ~23 anos (18 anos quando foi banida + 5 anos na natureza)

**Aparência:**
- Cabelo lojo-sujo, comprido, cheio de nós e sujidade
- Pele pálida e marcada por cicatrizes de vida selvagem
- Vestida com uma mistura das suas roupas originais (um vestido azul rasgado e sujo) e peças que roubou dos Bearlons (um casaco de lã do Papai Urso, botas de caça)
- Olhos — o detalhe mais perturbador. Não são olhos de raiva, são olhos vazios. Ela não odeia, não sente prazer. Simplesmente... age.
- Leva sempre consigo uma pá enferrujada (o instrumento que usou para matar os Bearlons e que usou para cavar abrigos na floresta)

**História de origem:**

Goldilocks nasceu numa pequena vila agrícola a centenas de quilómetros de São Urso. Desde pequena que os pais notavam que ela era "diferente". Não no sentido cognitivo — ela era inteligente — mas havia algo na sua forma de interagir que deixava as pessoas desconfortáveis.

Ela não entendia certas regras sociais: invadia o espaço pessoal, tocava nas pessoas sem aviso, aparecia onde não era esperada. Quando confrontada, não demonstrava arrependimento ou vergonha — apenas uma confusão genuína que era quase mais assustadora do que se ela fosse agressiva.

Aos 12 anos, matou o gato do vizinho. Não por maldade — disse que queria "ver como era por dentro". A vila começou a evitá-la. Aos 16, um rapaz desapareceu durante três dias. Foi encontrado na floresta, desorientado e com ferimentos. Ele disse que Goldilocks o tinha levado para uma "brincadeira". Não havia provas, mas todos sabiam.

Aos 18, foi oficialmente banida. Expulsa da vila com uma mochila, um cobertor, e a ordem de nunca mais voltar.

Passou 5 anos a vaguear pela floresta. Aprendeu a caçar, a construir abrigos, a movimentar-se sem ser vista. Neste período, algo nela se partiu ou solidificou — já não havia qualquer resquício da criança confusa que tentava perceber o mundo. Havia apenas uma predadora.

Quando encontrou a casa dos Bearlons (isolada na orla da floresta de São Urso), viu uma oportunidade. Observou-os durante duas semanas, aprendendo as suas rotinas, os seus hábitos, as suas fragilidades. Atacou numa noite de sexta-feira, quando o Papai Urso estava a guardar a lenha no galpão.

## 2.3 A Família Bearlon

**Papai Urso (Bartholomew Bearlon):**
- Urso pardo, ~45 anos, marceneiro reformado
- Protetor, desconfiado com estranhos
- Notou sinais de presença na floresta e deixou uma carta por enviar aos guardas florestais
- Pista: *Lista de compras* no bolso do casale — "veneno para animais selvagens, armadilhas de urso, luzes de movimento"

**Mamãe Ursa (Martha Bearlon):**
- Urso pardo, ~42 anos, professora na escola local
- Observadora, meticulosa, escrevia tudo num diário
- Anotou nos dias anteriores que os "guaxinins" (que ela assumiu serem guaxinins) estavam a roubar vegetais da horta
- Pista: *Diário pessoal* — entradas tornam-se progressivamente mais preocupantes: "Há pegadas que não consigo identificar", "Acho que alguém mexeu no galinheiro esta noite"

**Júnior (Benjamin Bearlon):**
- Urso pardo, ~16 anos, curioso e inteligente
- Foi o primeiro a detetar Goldilocks
- Tinha um telescópio apontado para a floresta (para observação de pássaros, inicialmente; para vigilância, nos últimos dias)
- Pista: *Carta ao guarda florestal* escrita mas nunca enviada, e um desenho perturbador de uma figura feminina esquelética na capoeira

## 2.4 Estrutura Narrativa

O jogo segue uma estrutura de três atos com um prólogo e um epílogo:

**Prólogo (5–10 min):** Chegada à casa. Conversa com o Padre Urso (cutscene ou diálogo in-game). Viagem de carro com Elena (world-building, personagens secundários). Primeira impressão da casa.

**Ato I — "Tudo Parece Normal" (10–20 min):** Exploração da casa. Descoberta de pistas que sugerem que algo está errado. Tensão crescente. Jogador pode sentir que está a ser observado (Goldilocks esconde-se nos cantos, move-se em quartos adjacentes). Não há confronto direto.

**Ato II — "O Congelador" (5 min):** Elena dirige-se à cozinha para verificar a fonte do cheiro. Encontra o congelador. Momento de horror quando o abre — cenas dos corpos. Goldilocks ataca. Cena impressionante da perna decepada. Elena é arrastada para as sombras. Jogador agora está sozinho.

**Ato III — "Sobrevivência" (20–30 min):** Jogador tem que sobreviver. Goldilocks patrulha a casa. Jogador pode esconder-se, fugir, usar objetos para distrair, tentar sair. No entanto, a casa está trancada (Goldilocks escondeu as chaves em algum lado). Objetivos: (1) encontrar as chaves do carro ou um meio de fuga, (2) descobrir a verdade completa sobre Goldilocks, (3) sobreviver.

**Epílogo (5 min):** Fuga — ou não. Vários finais possíveis consoante as ações do jogador.

## 2.5 Finais Possíveis

**Final A — "Fuga" (Neutral Good):**
Jogador encontra as chaves, consegue ligar o rádio da viatura, pede reforços. Goldilocks é capturada. O jogador sobrevive. Elena é encontrada com vida (mas gravemente ferida).

**Final B — "Vingança" (Chaotic Good):**
Jogador mata Goldilocks (improvisa uma arma). Luta final intensa. Jogador foge. A casa fica para trás como uma cena de crime. O jogador está traumatizado, mas vivo.

**Final C — "Não Acorda" (Bad):**
Jogador é morto. Ecrã preto. Última coisa que ouve é Goldilocks a arrastar o seu corpo para a cave. O jogo acaba, sem música de vitória.

**Final D — "O Ciclo" (True Horror — Secret):**
Jogador descobre que Goldilocks não é a primeira. Há registos de desaparecimentos semelhantes nesta região nos últimos 30 anos. A casa dos Bearlons é a quarta casa. O jogador foge, mas percebe, nos segundos finais, que ela está a segui-lo — e que ele próprio se tornou o alvo. O epílogo mostra uma notícia de jornal: "POLICIAL DESAPARECIDO — Temem-se o pior". E, no dia seguinte, uma figura loira a observar a próxima casa.

---

# 3. Personagens

## 3.1 Marcus Reed (Protagonista / Jogador)

- **Idade:** 34 anos
- **Profissão:** Policial rural, 12 anos de força
- **Personalidade:** Profissional, cansado da vida, mas ainda com um sentido de dever. Não é um herói de ação: é um homem comum que está a fazer o seu trabalho quando a merda atinge o ventoinha.
- **Voz:** Sim, o personagem fala (voz over e diálogos). Não é um avatar silencioso — a sua reação ao horror é uma parte importante da narrativa.
- **Condição física:** Em forma razoável (consegue correr e saltar), mas não excecional. Não é militar. O seu treino deu-lhe conhecimentos básicos de primeiros socorros e táticas de contenção, mas nada que o prepare para uma predadora humana.

## 3.2 Elena Vasquez (Parceira / NPC)

- **Idade:** 28 anos
- **Profissão:** Policial, 5 anos de força
- **Personalidade:** Determinada, empática, mais crente na bondade das pessoas do que Marcus. Serve como contraste emocional — ela acredita que "há uma explicação para tudo", o que torna a sua morte/ferimento ainda mais trágico.
- **Role no jogo:** Companhia no ato inicial. Serve como catalisadora para a revelação (é ela que abre o congelador). A sua ausência (depois do ataque) aumenta a sensação de solidão.

## 3.3 Goldilocks (Antagonista)

- **Humanidade restante:** Mínima. Ela não é um monstro no sentido literal, mas sim uma pessoa cuja humanidade foi corroída pelo trauma, isolamento e sobrevivência.
- **Motivação:** Não é maldade consciente. Ela vê a casa como o seu território agora. Os invasores (os polícias) são ameaças a eliminar.
- **Padrão de comportamento:**
  - **Patrulha:** Move-se pela casa num padrão semi-aleatório.
  - **Caça:** Quando deteta o jogador (visual ou auditivamente), torna-se agressiva.
  - **Emboscada:** Se o jogador faz muito barulho repetidamente, ela pode parar de patrulhar e esconder-se, esperando que ele passe.
  - **Retirada:** Às vezes, ela recua para a cave (covil), dando ao jogador uma janela de oportunidade.
- **Terrifying detail:** Ela canta. Cantarola canções de embalar distorcidas enquanto patrulha. A música funciona como um sonar narrativo para o jogador — se ouvires a cantoria, ela está perto.

## 3.4 Padre Urso (NPC de Abertura)

- **Espécie:** Urso pardo (a vila é maioritariamente ursina — um mundo onde animais antropomórficos e humanos coexistem, o que adiciona uma camada de uncanny valley ao jogo)
- **Personalidade:** Preocupado, paternal, ligeiramente ansioso. A sua preocupação genuína com os Bearlons estabelece o tom emocional do jogo.
- **Função:** Exposição inicial. Conta ao jogador que os Bearlons eram pessoas de rotina, nunca faltavam à missa. Dá pistas subtis que só farão sentido mais tarde.

---

# 4. Jogabilidade e Mecânicas

## 4.1 Perspetiva e Controlos

| Elemento | Especificação |
|----------|---------------|
| Perspetiva | Primeira pessoa (First Person) |
| Movimento | WASD + Mouse (look) |
| Correr | Shift (stamina limitada) |
| Agachar | C (stealth obrigatório para evitar Goldilocks) |
| Interagir | E (examinar objetos, abrir portas, pegar itens) |
| Inventário | Tab (pistas, documentos, chaves) |
| Lanterna | F (bateria limitada — encontrar pilhas pelo mapa) |
| Esconder | Automático perto de certos objetos (armários, baixo de camas, cortinados) |
| Olhar para trás | Q (olhar por cima do ombro enquanto corre — essencial para momentos de tensão) |

## 4.2 Sistema de Vida e Ferimentos

Marcus não tem "vida" no sentido tradicional. Em vez disso, há um sistema de **estado físico**:

| Estado | Efeito |
|--------|--------|
| Normal | Movimento normal, visão normal |
| Ferido ligeiro | Visão ligeiramente turva, stamina reduzida (após ser atingido ou cair) |
| Ferido grave | Mancar (movimento mais lento), visão muito turva, stamina crítica |
| Exausto | Stamina a 0 — jogador não pode correr, visão periférica escurece |

**Cura:** Não há kits médicos mágicos. O jogador pode encontrar ligaduras e analgésicos na casa (armário da casa de banho, estojo de primeiros socorros no carro).

## 4.3 Sistema de Lanterna e Visibilidade

A lanterna é a única fonte de luz confiável do jogador. A casa tem luzes elétricas, mas algumas salas podem ter lâmpadas fundidas, ou o jogador pode optar por desligar as luzes para não ser visto (e arriscar-se a não ver também).

| Elemento | Detalhe |
|----------|---------|
| Bateria base | 10 minutos de uso contínuo |
| Pilhas extra | Espalhadas pela casa (3–4 recargas) |
| Modo frugal | Botão R para ligar/desligar — usar apenas quando necessário |
| Luz ambiente | Quando a lanterna está desligada, apenas luz da lua/luzes da casa iluminam |

## 4.4 Sistema de Pistas (Investigação)

O jogo funciona como uma *investigação interativa*. O jogador não recebe marcadores de objetivo. Em vez disso, deve explorar e interpretar as pistas que encontra.

**Tipos de pista:**

| Tipo | Exemplo |
|------|---------|
| Documentos | Diário da Mamãe Ursa, carta do Júnior, lista de compras |
| Audio logs | Mensagens no atendedor de chamadas |
| Ambientais | Pegadas na horta, arranhões na porta, telescópio apontado à floresta |
| Visuais | Manchas no chão, cheiro a morte na cave |
| Objetos | Pá no canto da cozinha, cadeado partido na porta da cave |

**Progressão:** Cada pista desbloqueia uma entrada no **Caderno de Investigação** (diário do Marcus), que ele vai escrevendo mentalmente. O caderno mostra as conclusões parciais do jogador, ajudando-o a ligar os pontos.

## 4.5 Sistema de Furtividade

Goldilocks deteta o jogador com base em três fatores:

1. **Visão:** Linha de visão direta. Distância máxima: ~20 metros. Se estiver escuro, muito menos.
2. **Audição:** Correr faz barulho. Portas abertas rapidamente fazem barulho. Objetos a cair fazem muito barulho. Andar agachado é silencioso.
3. **Tempo de alerta:** Se Goldilocks ouve um barulho mas não vê o jogador, entra em estado de alerta e investiga a fonte. Se não encontra nada, volta à patrulha após ~30 segundos.

**Esconderijos:**

| Local | Segurança |
|-------|-----------|
| Armário da sala | Moderada — Goldilocks pode abrir se suspeitar |
| Baixo da cama do Júnior | Alta — mal se vê |
| Cortinados pesados | Baixa — só funciona com pouca luz |
| Cave (esconderijo) | Muito alta — Goldilocks raramente desce |

---

# 5. Estrutura de Nível — A Casa dos Bearlons

## 5.1 Mapa Geral

```
                    FLORESTA (Zona Exterior)
                         |
                    --- GARAGEM / CARRO DA PATRULHA ---
                         |
                    PORTA DA FRENTE
                         |
     +-------------------+--------------------+
     |                                        |
 SALA DE ESTAR                          COZINHA
 (lareira, sofás,       <-->          (frigorífico,
 TV, estante)                           congelador,
     |                                  ilha central)
     |                  +-------------------+
     |                  |   CORREDOR        |
     |                  | (escadas,         |
     |                  |  armário,         |
     |                  |  telefone)        |
     |                  +-------------------+
     |                        |
+----------+       +---------------------+
| CASAO     |       | ESCRITÓRIO          |
| DE JANTAR |       | (secretária,       |
| (mesa     |       |  estante de livros,|
| posta)    |       |  computador)       |
+----------+       +---------------------+
                          |
                    +-----------+
                    | DESPENSA  |
                    | (porta    |
                    |  para a   |
                    |  cave)    |
                    +-----------+
                          |
                    +-----------+
                    |  CAVE     |
                    | (covil de |
                    | Goldilocks)|
                    +-----------+

       ANDAR DE CIMA
     +------------------------+
     |   QUARTO PRINCIPAL     |
     |   (cama de casal,      |
     |    guarda-roupa,       |
     |    casa de banho)      |
     +------------------------+
     +------------------------+
     |   QUARTO DO JÚNIOR     |
     |   (telescópio,         |
     |    cartas, desenhos)   |
     +------------------------+
     +------------------------+
     |   CASA DE BANHO        |
     |   (armário de          |
     |    medicamentos)       |
     +------------------------+
```

## 5.2 Descrição das Divisões e Conteúdo

**Sala de Estar (Rés-do-chão):**
- Ambiente acolhedor, lareira acesa (Goldilocks manteve o fogo)
- TV ligada num canal de estática (pista: alguém estava a ver TV?)
- Estante com livros, alguns sobre carpintaria, outros romances
- Fotografias de família na lareira — três ursos felizes
- **Pista:** Cinzeiro com beatas no parapeito da janela — alguém fumou ali recentemente. A família Bearlon não fumava.

**Cozinha (Rés-do-chão):**
- Luz acesa, louça no escorredor
- Cheiro forte a lixívia (tentativa de limpar o sangue?)
- Frigorífico: comida normal, mas numa quantidade suspeita para 3 pessoas
- **PONTO DE NÃO RETORNO:** Congelador vertical. Ao abrir, os corpos são revelados. Goldilocks ataca.
- **Pista:** Página rasgada de um livro de receitas na lixeira — "Como conservar carne por longos períodos"

**Sala de Jantar (Rés-do-chão):**
- Mesa posta para três pessoas
- Comida nas panelas no fogão (já estragada — data de ~2 semanas)
- **Pista:** Garfo no chão, como se alguém tivesse sido arrastado durante a refeição

**Escritório (Rés-do-chão):**
- Secretária com papéis, cartas, contas por pagar
- Gaveta trancada (chave no quarto principal)
- **Pista (gaveta):** Carta do Júnior para os guardas florestais sobre "campistas suspeitos"
- **Pista:** Lista de tarefas do Papai Urso — "comprar veneno, armar ratoeiras, ligar guards florestais (urgente)"

**Despensa e Acesso à Cave (Rés-do-chão):**
- Porta da cave trancada com cadeado novo (Goldilocks não quer que ninguém desça)
- **Pista:** O cheiro piora perto da porta
- **Evento:** Jogador precisa de encontrar o corta-cadeados ou a chave para descer

**Cave (Covil de Goldilocks):**
- Escura, húmida, cheiro a terra e decomposição
- Beliche improvisado (sacos de dormir, cobertores roubados dos Bearlons)
- Paredes com desenhos perturbadores feitos a carvão — figuras humanas, árvores, casas
- **Pista crucial:** Diário de Goldilocks (escrita infantil, confusa, que se torna cada vez mais coerente e ameaçadora ao longo do tempo)
- **Pista:** Mapa da região com X em quatro locais diferentes — uma casa por ano, durante quatro anos

**Quarto Principal (1.º Andar):**
- Cama desfeita, uma mala no chão (Papai Urso estava a pensar fugir?)
- Casa de banho principal — espelho partido
- **Pista:** Frase no espelho escrita em batom: "NÃO É TUA CASA" (escrita de Goldilocks)
- **Pista:** Chave do escritório na gaveta da mesa de cabeceira
- **Pista:** Fotografia de casamento com o padre — no verso, uma data e "Que Deus nos proteja"

**Quarto do Júnior (1.º Andar):**
- Ambiente de adolescente: posters de bandas, livros de ciências, telescópio
- **Pista principal:** Telescópio montado na janela, apontado para um ponto específico da floresta — onde Goldilocks tinha o seu acampamento
- **Pista:** Desenho infantil perturbador — uma figura magra com cabelo amarelo a sair de entre as árvores
- **Pista:** Carta não enviada aos guardas florestais (escrita, dobrada, mas sem selo)

**Casa de Banho do Corredor (1.º Andar):**
- Armário de medicamentos — ligaduras, analgésicos, desinfetante (útil)
- **Pista:** Frasco de comprimidos vazio no lixo — um dos Bearlons estava a tomar medicação para ansiedade

---

# 6. Sistema de Investigação e Pistas

## 6.1 Caderno de Investigação

O caderno funciona como diário de bordo do Marcus. É aberto com a tecla **J** e mostra:

| Aba | Conteúdo |
|-----|----------|
| Pistas | Lista de documentos e objetos encontrados (com texto completo) |
| Anotações | Resumo automático das conclusões parciais |
| Mapa | Mapa simples da casa (não muito detalhado) |
| Estado | Estado físico de Marcus |

**Atualizações:** O caderno é atualizado automaticamente quando o jogador encontra pistas importantes, mas as anotações são escritas na perspetiva de Marcus — por vezes ele tira conclusões erradas, e cabe ao jogador corrigi-las.

## 6.2 Pistas Obrigatórias vs Opcionais

| Tipo | Necessidade | Exemplo |
|------|-------------|---------|
| Obrigatórias | Necessárias para progredir | Chave do carro, código do cadeado da cave |
| Narrativas | Contam a história | Diários, cartas, fotografias |
| Lore | Contexto mundial | Recortes de jornal, mapas com X |
| Sobrevivência | Ajudam no combate | Ligaduras, pilhas, analgésicos |

**Totais estimados:**
- Pistas obrigatórias: 7
- Pistas narrativas: 14
- Pistas de lore: 5
- Itens de sobrevivência: 8

## 6.3 Árvore de Investigação

```
CENA INICIAL
├── Conversa com Padre Urso (exposição)
├── Entrada na casa
│   ├── Fotografias na sala (família feliz)
│   ├── Comida no fogão (data estragada)
│   ├── Cinzeiro com beatas (alguém fumou aqui)
│   └── Diário da Mamãe Ursa (primeiras entradas — "guaxinins")
│       └── Entradas posteriores (crescente preocupação)
│           └── Última entrada: "Acho que ela está aqui"
│               └── Telescópio do Júnior + Desenho
│                   └── Carta do Júnior (não enviada)
│                       └── Lista de compras do Papai Urso
│                           └── (gatilho para explorar a cozinha)
│                               └── ABRIR CONGELADOR (PONTO DE NÃO RETORNO)
```

---

# 7. Sistema de Combate e Sobrevivência

## 7.1 Filosofia: O Jogador Não É um Herói de Ação

Marcus não é um soldado. Ele é um polícia rural que nunca disparou a sua arma em serviço. O combate direto é **difícil, desencorajado e punitivo**.

## 7.2 Armas Disponíveis

| Arma | Onde encontrar | Efetividade | Munição |
|------|----------------|-------------|---------|
| Pistola de serviço (9mm) | Coldre do Marcus (desde o início) | Moderada contra Goldilocks (5 tiros para a abater) | 15 balas no total (carregador + 10 extras no carro) |
| Pá | Cozinha (depois do ataque) | Alta — mas alcance curto e lenta | Ilimitada (corpo a corpo) |
| Faca de caça | Gaveta da cozinha | Baixa — último recurso | Ilimitada (corpo a corpo) |
| Objetos arremessáveis | Garrafas, livros, pratos | Baixa — útil para distrair | Descartáveis |

## 7.3 Lógica do Combate

- **Atirar em Goldilocks:** Ela não morre com um tiro. Leva 5 tiros para cair. Cada tiro a atrasa momentaneamente, dando tempo ao jogador para fugir.
- **Combate corpo a corpo:** Extremamente arriscado. Goldilocks é mais forte e mais rápida que Marcus. Um golpe mal sucedido resulta em dano grave.
- **Estratégia recomendada:** Fugir e esconder-se. Usar objetos para distrair. Encontrar a saída.

## 7.4 Objetos de Sobrevivência

| Objeto | Efeito | Ocorrências |
|--------|--------|-------------|
| Ligaduras | Cura ferimentos ligeiros | 3 |
| Analgésicos | Remove penalidades de ferimentos (temporário) | 2 |
| Pilhas | Alimentam a lanterna | 4 |
| Comida enlatada | Recupera stamina | 3 (na despensa) |
| Chave do carro | Vitória (Final A) | 1 (no corpo de Goldilocks — é preciso derrotá-la) |
| Rádio da patrulha | Pedir reforços (ajuda no Final A) | No carro |

---

# 8. Inteligência Artificial — Goldilocks

## 8.1 State Machine

Goldilocks tem cinco estados principais:

```
                    +-----------------+
                    |   PATROL       |
                    | (andar lento,  |
                    |  cantarolar    |
                    |  baixinho)     |
                    +-------+--------+
                            |
              +-------------+-------------+
              |                           |
    +--------v--------+          +--------v--------+
    |     ALERTA      |          |   INVESTIGAÇÃO  |
    | (ouviu algo,    |          | (fonte do som)  |
    |  parou,       |          |                 |
    |  à escuta)     |          |                 |
    +--------+--------+          +--------+--------+
              |                           |
              +-------------+-------------+
                            |
                    +-------v--------+
                    |     CAÇA       |
                    | (corre atrás   |
                    |  do jogador)   |
                    +-------+--------+
                            |
              +-------------+-------------+
              |                           |
    +--------v--------+          +--------v--------+
    |  EMBOSCADA     |          |   RETIRADA      |
    | (esconde-se    |          | (volta à cave,  |
    |  e espera)     |          |  regenera)      |
    +-----------------+          +-----------------+
```

## 8.2 Comportamentos Específicos

**Patrulha:**
- Percorre um caminho pré-definido pela casa
- Cantarola baixinho (o jogador ouve-a antes de a ver)
- Ocacionalmente para para olhar em volta

**Alerta:**
- Quando ouve um som alto (corrida, objeto a cair, porta a bater)
- Para imediatamente, vira-se para a direção do som
- Fica imóvel 5–10 segundos, à escuta
- Se ouve novamente, passa a Investigação

**Investigação:**
- Move-se rapidamente para a última fonte de som
- Examina a área (portas de armário, olha debaixo de mesas)
- Se não encontra o jogador, volta à Patrulha após 30s
- Se encontra, passa a Caça

**Caça:**
- Corre após o jogador (mais rápida que Marcus a correr)
- Consegue abrir portas
- Escala curtas distâncias (pula móveis)
- Se perde o jogador de vista, faz uma busca rápida e volta à Patrulha
- Se o jogador se esconde num armário, ela pode abrir e descobri-lo (dependendo da dificuldade)

**Emboscada:**
- Se o jogador faz demasiado barulho repetidamente, Goldilocks deixa de patrulhar
- Esconde-se num ponto de passagem provável (esquina, porta)
- Espera que o jogador passe para atacar
- **Muito perigoso** — o jogador pode não a ver antes de ser tarde demais

**Retirada:**
- Após um período sem detetar o jogador (2 min), Goldilocks volta à cave
- Durante este período, o jogador tem uma janela segura para explorar áreas mais arriscadas
- Ela fica na cave durante 1 minuto (a "comer" — implícito, nunca mostrado)

## 8.3 Parâmetros de Dificuldade

| Parâmetro | Normal | Difícil | Pesadelo |
|-----------|--------|---------|----------|
| Velocidade de caça | 1.1x jogador | 1.3x jogador | 1.5x jogador |
| Distância de deteção visual | 15m | 20m | 25m |
| Distância de deteção auditiva | 10m | 15m | 20m |
| Tempo de alerta | 8s | 12s | 20s |
| Esconderijos seguros | 3 | 1 | 0 (todos podem ser descobertos) |
| Respawn após morte | Último checkpoint | Início do ato | Início do jogo |

---

# 9. Áudio e Atmosfera

## 9.1 Design de Som

| Elemento | Descrição |
|----------|-----------|
| Ambiente exterior | Silêncio da floresta, grilos, vento, ocasionalmente um galho a partir |
| Ambiente interior | Rangidos da madeira, aquecimento a funcionar, tic-tac de um relógio |
| Tensão | Som ambiente que aumenta subtilmente quando Goldilocks está perto |
| Stinger | Ruído alto e agudo quando Goldilocks aparece |
| Goldilocks cantarolando | Canção de embalar distorcida (uma versão macabra de "Rock-a-bye Baby") |
| Goldilocks a correr | Passos pesados, respiração ofegante |
| Marcus (voz over) | Comentários sussurrados, respiração pesada quando ferido |

## 9.2 Música (Trilha Sonora)

A música é **esparsa** — usada apenas em momentos chave (ataque de Goldilocks, descoberta do congelador, final). Durante a maior parte do jogo, apenas som ambiente e efeitos sonoros.

| Momento | Música |
|---------|--------|
| Título | Piano minimalista, nota sustentada |
| Prólogo | Apenas ambiente |
| Ato I (tensão) | Drone grave e baixo (subcutâneo) |
| Abertura do congelador | SILÊNCIO TOTAL → depois, stinger orquestral |
| Caça (Goldilocks ativa) | Percussão rápida, distorcida |
| Cave | Ambiente húmido, pingos de água, terra |
| Final A | Música de alívio agridoce |
| Final B | Música heróica mas triste |
| Final D (Secret) | Música de criança (music box) distorcida |

## 9.3 Sistema de Som Dinâmico

O motor de áudio de Unity será usado para:
- **Oclusão:** Som muda consoante o jogador está no mesmo cômodo que Goldilocks ou separado por paredes
- **Reverberação:** A cave soa oca e húmida; a sala de estar soa acolhedora
- **Doppler:** Goldilocks a correr por corredores
- **3D spatial blend:** Goldilocks cantarolando pode ser ouvida à distância, dando ao jogador informação espacial valiosa

---

# 10. Interface e UI

## 10.1 HUD (Heads-Up Display)

A UI é **minimalista** — sem barras de vida visíveis, sem contadores de balas. A informação é transmitida através do estado do jogo:

| Informação | Como é mostrada |
|------------|-----------------|
| Saúde | Visão turva, respiração ofegante, ecrã a escurecer nas bordas |
| Stamina | Ofegante audível, ecrã a pulsar quando a correr |
| Bateria da lanterna | Intensidade da luz a diminuir (sem indicador numérico) |
| Pistas encontradas | Caderno de Investigação (tecla J) |
| Perigo | Som heartbeat quando Goldilocks está muito perto |

## 10.2 Ecrã de Morte

Quando Marcus morre:

1. Ação congela
2. Ecrã fade para preto lentamente (3 segundos)
3. Último som: Goldilocks a arrastar o corpo (passos, peso)
4. Texto: "O conto termina aqui."
5. Opção: "Recomeçar do último checkpoint"

## 10.3 Ecrã de Pausa

| Elemento | Descrição |
|----------|-----------|
| Continuar | Volta ao jogo |
| Caderno | Lê pistas encontradas (pausado) |
| Definições | Áudio, vídeo, controlos, sensibilidade do rato |
| Menu principal | (Confirmação: "Todo o progresso não salvo será perdido") |

## 10.4 Cutscenes

- Cutscenes em **engine** (não vídeo pré-renderizado)
- Controlo limitado ao jogador durante cutscenes (câmara fixa mas jogador pode olhar em volta)
- Cutscenes acionadas por: entrada na casa, abertura do congelador, primeiros segundos do ataque

---

# 11. Roadmap de Desenvolvimento (Unity)

## 11.1 Estrutura de Projeto Sugerida (Pasta Unity)

```
Assets/
├── Art/
│   ├── Materials/
│   ├── Models/
│   │   ├── Environment/
│   │   │   ├── House_Interior.fbx
│   │   │   ├── Furniture/
│   │   │   └── Props/
│   │   └── Characters/
│   │       ├── Marcus.fbx
│   │       ├── Elena.fbx
│   │       └── Goldilocks.fbx
│   ├── Textures/
│   └── Shaders/
├── Audio/
│   ├── Music/
│   ├── SFX/
│   └── Voice/
├── Prefabs/
│   ├── InteractiveObjects/
│   ├── Pickups/
│   └── Triggers/
├── Scenes/
│   ├── 0_TitleScreen/
│   ├── 1_Prologue_Exterior/
│   ├── 2_House_Exploration/
│   ├── 3_House_Chase/
│   └── 4_Epilogue/
├── Scripts/
│   ├── AI/
│   │   ├── GoldilocksFSM.cs
│   │   ├── DetectionSystem.cs
│   │   └── NavigationBaker.cs
│   ├── Player/
│   │   ├── PlayerController.cs
│   │   ├── FlashlightController.cs
│   │   ├── StaminaSystem.cs
│   │   └── HealthSystem.cs
│   ├── Interaction/
│   │   ├── InteractableBase.cs
│   │   ├── DocumentPickup.cs
│   │   ├── KeyItem.cs
│   │   └── DoorController.cs
│   ├── UI/
│   │   ├── NotebookUI.cs
│   │   ├── PauseMenu.cs
│   │   └── DeathScreen.cs
│   ├── Audio/
│   │   ├── AudioManager.cs
│   │   └── GoldilocksSinging.cs
│   └── Systems/
│       ├── GameManager.cs
│       ├── SaveSystem.cs
│       └── ClueTracker.cs
├── Animation/
├── Resources/
└── Plugins/
```

## 11.2 Milestones

| Fase | Duração estimada | Entregáveis |
|------|------------------|-------------|
| **Prototype** | 4 semanas | Movimento do jogador, lanterna, interação básica, sala de estar e cozinha, Goldilocks com AI básica |
| **Alpha** | 8 semanas | Casa completa, todas as pistas, AI completa, sistema de investigação, UI básica |
| **Beta** | 4 semanas | Cutscenes, áudio completo, polimento visual, testes de jogo |
| **Gold** | 4 semanas | Debug, balancing, finais, testes de performance, build final |

# 12. Assets e Referências

## 12.1 Assets Recomendados (Unity Asset Store)

| Categoria | Asset |
|-----------|-------|
| Modelos interiores | [POLYGON - Interior Pack] ou [House Interior Kit] |
| Personagens | Modelos personalizados recomendados (Fuse + Mixamo para rigging) |
| Áudio | [Horror Sound Effects Pack], [Ambient Audio Bundle] |
| AI/Navegação | Unity NavMesh + A* Pathfinding Project (opcional) |
| UI | [Modern UI Pack] ou UI personalizada |
| Iluminação | [Emission Particles] para efeitos de luz sujos |

## 12.2 Referências Visuais

- **Outlast** (estilo first-person horror, lanterna como ferramenta central)
- **Alien: Isolation** (AI que aprende e não segue padrões previsíveis)
- **Silent Hill: Shattered Memories** (psicologia, ambientação, subversão de expectativas)
- **What Remains of Edith Finch** (narrativa ambiental, casa como personagem)
- **Anatomy** (jogo indie) — terror doméstico, objetos do quotidiano como fontes de horror

## 12.3 Referências Narrativas

- **The Wicker Man** (1973) — comunidade isolada, estranheza subtil
- **Midsommar** — horror à luz do dia, o "normal" como fachada
- **The Texas Chain Saw Massacre** — família como alvo, casa como território de caça
- **Contos de Fadas Originais (Grimm)** — versões originais violentas e sem moralidade

---

# 13. Apêndice — Diagrama de Fluxo do Jogo

```
                     +---------------------+
                     |   ECRÃ DE TÍTULO    |
                     | "Fairy Tale Horrors  |
                     |  - The Bearlons"     |
                     +----------+----------+
                                |
                     +----------v----------+
                     |   PRÓLOGO            |
                     | - Esquadra           |
                     | - Conversa com       |
                     |   Padre Urso         |
                     | - Viagem de carro    |
                     | - Chegada à casa     |
                     +----------+----------+
                                |
                     +----------v----------+
                     |   ATO I: EXPLORAÇÃO  |
                     | - Sala de estar      |
                     | - Cozinha (parcial)   |
                     | - Escritório          |
                     | - Quartos (parcial)   |
                     | - Pistas iniciais     |
                     +----------+----------+
                                |
                     +----------v----------+
                     |   ATO II: REVELAÇÃO  |
                     | - Abrir congelador   |
                     | - Ataque de Goldilocks|
                     | - Elena ferida        |
                     | - O jogador sozinho   |
                     +----------+----------+
                                |
                     +----------v----------+
                     |   ATO III: SOBREVIVÊNCIA |
                     | - Goldilocks ativa    |
                     | - Explorar com        |
                     |   stealth             |
                     | - Descer à cave       |
                     | - Descobrir a verdade |
                     | - Encontrar saída     |
                     +----------+----------+
                                |
            +-------------------+-------------------+
            |                   |                   |
    +-------v-------+   +-----v--------+   +------v---------+
    | FINAL A       |   | FINAL B       |   | FINAL C        |
    | Fuga + Reforços|   | Matar         |   | Morte          |
    | (Neutral Good) |   | Goldilocks    |   | (Bad)          |
    +-------+-------+   +-------+-------+   +--------+-------+
            |                   |                     |
    +-------v-------+   +-----v--------+             |
    | Créditos      |   | Créditos     |             |
    | (agridoce)    |   | (heróico)    |             |
    +---------------+   +--------------+             |
                                |                    |
                    +----------v-----------+         |
                    |   FINAL D (Secret)   |<--------+
                    | "O Ciclo"            |
                    | Notícia de jornal    |
                    | Próximo alvo         |
                    +----------------------+
                    |   CRÉDITOS (FINAS)   |
                    | + CENA PÓS-CRÉDITOS  |
                    | (Goldilocks no carro |
                    |  atrás do jogador?)  |
                    +----------------------+
```

---

# Versão do Documento

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 21/05/2026 | Criação inicial do GDD |

---

> **Nota final:** Este documento é um guia de design, não uma bíblia imutável. Durante o desenvolvimento, coisas vão mudar — mecânicas que parecem boas no papel podem não funcionar na prática, a história pode evoluir, e novas ideias vão surgir. O importante é manter a visão central: **uma antologia de terror que subverte contos de fadas, colocando o jogador no papel de uma vítima vulnerável num cenário doméstico que se transforma em pesadelo.**