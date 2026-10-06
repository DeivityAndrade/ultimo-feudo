# ⚜️ O Último Feudo

Um jogo de estratégia econômica medieval em tempo real: construa seu reino, organize a produção e conquiste novas regiões.
Mundo em **3D estilizado com câmera 2.5D** (Three.js), arte própria e animações com licença livre (CC0).

Estado do código: **v0.8.0**, conferido em **02/10/2026** (`KM.VERSION` em `js/config.js`). Próximos passos e pendências estão no [ROADMAP.md](ROADMAP.md).

## ▶️ Como jogar

**Online:** abra **https://deivityandrade.github.io/ultimo-feudo/** no Chrome, Edge ou Firefox. Não precisa instalar nada. No Chrome ou Edge, use "Instalar aplicativo" na barra de endereço quando disponível. O modo offline depende dos arquivos já carregados e armazenados no cache; não há download prévio de todos os assets. Áudio solicitado em streaming (Range) não entra nesse cache. O multijogador online exige conexão.

**No computador (offline):** Dê dois cliques em **`Jogar.bat`**. Ele liga um pequeno servidor local e abre o jogo no navegador (Chrome, Edge ou Firefox).
Deixe a janela preta aberta enquanto joga; feche-a para encerrar.

> Abrir o `index.html` direto não funciona mais: o navegador bloqueia o carregamento dos modelos 3D a partir de arquivos locais.

**Câmera:** `WASD`/setas/bordas movem · roda do mouse aproxima · **botão do meio arrastado gira e inclina** · `,` e `.` giram · botão direito arrastado (sem tropas selecionadas) arrasta o mapa.

**Tropas:** `Shift+A` prepara ataque-mover (botão direito no destino) · `Shift+S` manda parar. `WASD` continua movendo a câmera com tropas selecionadas.

## 🎮 Modos

| Modo | Descrição |
|---|---|
| **🎓 Tutorial** | Missão tranquila com 26 passos, da construção à produção de pão, encomendas, recrutas e comandos militares |
| **👑 Conquista** | 10 fases com controle de passagens, postos avançados, reconstrução, defesa, preparação de uma expedição e guerras entre reinos. Rivais com personalidade, alianças e desafios opcionais que valem coroas (até 4 por fase). Novos biomas acompanham a progressão |
| **Campanha "A Reunificação de Aldor"** | 14 missões com briefing, objetivos, aliados e até 3 inimigos simultâneos |
| **Escaramuça** | Mapa procedural ou feito no editor, 1 a 3 oponentes, aliado opcional, IA com economia real ou em ondas |
| **Multijogador online** | **Salas por código de 5 letras** para **2 a 4 humanos**, até 4 reinos contando as IAs: um cria a sala e os amigos digitam o código. WebRTC em estrela, com o anfitrião repassando comandos, nos modos todos contra todos, cooperativo ou 2 contra 2, e chat. Cooperativo contra IA precisa de uma vaga livre para ela. O modo manual aceita 2 humanos, trocando códigos longos |
| **Editor de mapas** | Terreno, relevo, árvores, rochas, minérios, até 4 bases e casas prontas. Salva localmente e exporta/importa arquivos |

## 🆕 Novidades da versão 0.8
- **Girar prédios:** ao construir, `R` (ou o botão ⟳ Girar no painel) gira a casa 90°; a porta pode ficar ao sul, leste, norte ou oeste. `Shift`+`R` gira para o outro lado.
- **Quartel mais cedo:** agora exige só a Serraria. O novo **Camponês armado** (vida 40, ataque 7) sai do Quartel sem arma nenhuma, só com o recruta.
- **Alcance visível:** ao selecionar Lenhador, Pedreira, Fazenda, Vinícola, Pescador ou Torre aparece um círculo no chão com a área de trabalho (ou de tiro) e o valor no painel.
- **Regressões:** verificações de pegada e entrada nas quatro rotações, recrutamento do Camponês armado e configuração/sincronia de partidas com quatro humanos.

## 🆕 Novidades da versão 0.7
- **Multijogador para até 4:** a sala por código aceita até 3 convidados. O anfitrião vê as vagas, escolhe o modo (todos contra todos, cooperativo contra a IA ou 2 contra 2) e quantas IAs ocupam as vagas livres. Se um convidado cair, a IA assume o reino dele ao mesmo tempo em todos os navegadores, sem travar a partida.
- **Começo enxuto:** na Escaramuça e na Conquista o reino começa só com 2 construtores e 2 carregadores. O resto do povo sai da Escola (1 ouro cada; o ouro inicial subiu para 55).
- **Obras que pesam:** cada construção pede 50% a mais de material, e nivelar o terreno e assentar cada peça leva mais tempo. Ao terminar, a obra comemora com faíscas, poeira e o nome da casa subindo no céu.
- **Paz territorial:** na Escaramuça e no multijogador o mapa é dividido em 4 quadrantes. Até a paz acabar (10 min no Normal), cada reino só constrói, anda e ataca no próprio quadrante. A divisa aparece como uma cerca de luz no chão e tracejada no minimapa, e o fim da paz é anunciado.
- **IA menos insistente:** depois de cada ataque, a IA espera mais antes do próximo (cerca de 5½ min no Normal), as ondas ficaram mais espaçadas e os saques só começam depois da paz.
- **Rota das tropas:** com um grupo selecionado, uma trilha tracejada mostra o caminho até o destino, com marcas onde cada soldado vai parar e um estandarte fincado no ponto final. Ataques mostram uma linha vermelha até o alvo.
- **Bordas do mapa:** em vez de um corte seco, o mapa continua em colinas, mata fechada e serras que escurecem e somem na névoa.
- **Personagens novos:** o povo e os soldados agora usam modelos de [Quaternius](https://quaternius.com) (CC0): roupas de camponês e de patrulheiro, cabeças com rosto, cabelos, barbas e as animações da Universal Animation Library. Cada profissão tem tom de roupa e ferramenta próprios; soldados usam tabardo, escudo e capacete na cor do reino. Espada, machado, picareta e escudo vêm do Fantasy Props MegaKit (Quaternius, CC0); as demais ferramentas e armas foram modeladas com as mesmas texturas de madeira, metal e tecido. Homens e mulheres variam em pele, cabelo e barba, e todos estão maiores. Cada pessoa é desenhada numa só malha com texturas num atlas, então o desempenho é o mesmo dos bonecos antigos.
- **Escola protegida:** a última Escola do reino não pode ser demolida.

## 🆕 Novidades da versão 0.6
- **IA econômica:** mesma cidade inicial na Escaramuça, desbloqueios e fome das tropas iguais aos do jogador, sem concessões periódicas de recursos. Prioriza abastecimento, substitui pedreiras e minas esgotadas e usa o Mercado para comprar pedra ou ouro com madeira excedente. A dificuldade muda ritmo e estratégia, sem acelerar receitas ou gerar recursos.
- **Combate:** a direção real de cada soldado define frente, lado (+15%) e costas (+30%) nos golpes corpo a corpo. Montanhas e construções bloqueiam tiros, inclusive das torres. O jogo indica flancos atingidos.
- **Tutorial completo:** 26 passos em uma missão sem inimigos, com acompanhamento de produção, encomendas, recrutas e movimento de tropas. Pode ser reaberto no menu da partida; a Missão I da campanha mantém seu guia básico de 13 passos.
- **Conquista:** alternativas de vitória, condições iniciais próprias e pontos estratégicos com guarnições. Casas essenciais aparecem marcadas e sua perda pode encerrar a missão.
- **Biomas:** Pradaria desde o início, Bosque de outono na fase III, Pântano na IV e Tundra na VIII. Ao abrir essas fases, o bioma também fica disponível na Escaramuça. Pântanos têm mais água; na Tundra, os campos levam 25% mais tempo para crescer. O tipo de mapa continua sendo uma escolha independente do bioma.
- **Identidade:** menus e ajuda apresentam O Último Feudo com seu próprio nome e suas regras.

## 🆕 Recursos das versões anteriores
- **Tutorial interativo básico:** 13 passos guiados, com destaque nos botões e uma seta no mapa. Os passos avançam sozinhos quando você faz a ação pedida.
- **Aviso "⚠ sem estrada"** sobre qualquer casa que não esteja ligada ao Armazém, o erro mais comum de quem está começando.
- **Visual:** chão com textura e variação de tons, sombra nos vales (oclusão), grama alta e flores balançando ao vento, árvores com vento.
- **Áudio:**
  - Música medieval com alaúde dedilhado, flauta doce, sanfona e tambor, com reverberação de salão.
  - São 5 peças compostas na hora, mais uma trilha de batalha.
  - Efeitos refeitos com som posicional estéreo e vento ambiente.
  - Vozes dos soldados opcionais.
- **Opções** (aba ⚙️): volume geral, de música e de efeitos; qualidade gráfica (alta, média ou baixa, para PCs fracos); rolar pela borda da tela.
- **IA mais esperta:**
  - Defende a própria cidade quando é atacada.
  - Reúne o exército antes de atacar, em vez de mandar soldados aos poucos.
  - Encomenda nas oficinas só o que falta.
  - O tamanho dos ataques foi calibrado por dificuldade.
- **Estatísticas da partida** com gráficos (cidadãos, soldados, casas e recursos ao longo do tempo) e uma tabela por jogador, na tela final e na aba Objetivos.
- **Mensagens recentes** na aba Objetivos, e a tecla `Z` leva até o último aviso.
- **Conselheiro 🧙:** avisa quando acaba o ouro (e a Escola para), a pedra ou a madeira com obras esperando, ou quando o povo passa fome. Ele também diz o que construir para resolver.
- **Economia inicial (histórico):** versões anteriores usavam 40 ouros; desde a v0.7, o início enxuto usa 55. Soldados parados reagem a inimigos próximos.
- **Instalável e offline (PWA):** no Chrome ou Edge, use "Instalar aplicativo" na barra de endereço. Sem internet, o jogo depende dos arquivos já armazenados no cache, conforme explicado em Como jogar.

## 🧪 Ferramenta de balanceamento
Com Node.js disponível, execute `node tools/check.js` para verificar regras de combate, IA, tutorial, objetivos, inicialização das 25 missões/fases em três dificuldades e continuidade após salvar/carregar. `node tools/check.js --balance` também simula três mapas por até 40 minutos cada. São amostras de diagnóstico, não uma estimativa da taxa de vitória de jogadores humanos. `node tools/net-check.js` testa o multijogador (repasse das jogadas entre 4 jogadores, sala cheia e queda de jogador) sem navegador.

## Estatísticas de acesso

O `index.html` carrega o Google Analytics 4 com o ID de medição `G-KX6FD4BVTY` somente em `https://deivityandrade.github.io/ultimo-feudo/`. A integração registra visualizações e permite medir usuários, sessões e tempo de interação pelas métricas automáticas do GA4. Execuções locais e outras prévias não carregam a tag.

### Tempo dentro das partidas

`js/analytics.js` envia `game_start` ao iniciar/carregar uma partida, `game_play_time` a cada 30 segundos de tempo medido (e ao interromper a medição), e `game_end` ao vencer, perder, sair, substituir a partida ou fechar a página. O tempo é real, independente da velocidade da simulação, e conta somente a partida sem pausa com a página visível e em foco. Menu principal, briefing pausado, editor e segundo plano não contam. Continuar após uma vitória ou restaurar a página pelo histórico inicia um novo trecho de jogo. A medição não prova interação contínua com mouse/teclado; se a partida continuar em foco, o tempo conta.

No GA4, crie em **Administrador → Definições personalizadas → Métricas personalizadas** a métrica **Tempo jogado**, parâmetro `play_time_seconds`, unidade **Segundos**. A soma dessa métrica representa o tempo jogado enviado nos intervalos, sem duplicar os totais de encerramento. Opcionalmente, crie **Tempo por trecho encerrado**, parâmetro `session_play_seconds`, unidade **Segundos**, para analisar os totais de `game_end`. Não some as duas métricas. Para comparar modos/fases, registre as dimensões de evento `game_mode`, `mission_id`, `difficulty`, `entry_source` e `end_reason`.

Use **Analisar → Formato livre** para adicionar **Tempo jogado**, **Usuários ativos** e dimensões desejadas. Para uma média por usuário no mesmo período, divida o tempo total pelos usuários correspondentes. `game_start` inclui partidas retomadas e continuações; sua contagem não representa somente partidas novas. Fechamentos abruptos/bloqueadores ou falhas de rede podem impedir envios; os intervalos reduzem a perda. Os dados são coletados a partir da publicação, sem recuperar partidas anteriores. Verifique o temporizador com `node tools/analytics-check.js`.

Após publicar a alteração, abra o site e confira o relatório **Tempo real** na propriedade correspondente em https://analytics.google.com/. Os relatórios consolidados podem levar até 48 horas para atualizar; a integração não recupera acessos anteriores à instalação.

Verificação local em **02/10/2026**, com **Node.js v24.19.0**: `node tools/check.js` passou em **25 grupos**, e `node tools/net-check.js` em **4 grupos**. Os testes usam simulação e canais falsos; não validam conexões WebRTC reais, o serviço de encontro, gráficos, toque ou instalação PWA. Não há workflow de CI no repositório. Nesta revisão documental, `--balance` não foi executado.

Para conferir visualmente cada fase sem desbloquear a Conquista, abra `tools/playtest.html` no servidor local. A prévia começa pausada e não faz autosave. Ela permite examinar briefing, mapa e pontos estratégicos.

`tools/sim.js` simula partidas inteiras sem desenhar nada: 40 minutos de jogo rodam em poucos segundos. Com o jogo aberto, cole no console do navegador:
```js
const s = document.createElement('script'); s.src = 'tools/sim.js'; document.body.appendChild(s);
KM.sim.bots({ seed: 7, minutes: 40 })               // IA contra IA, registro a cada 5 minutos
KM.sim.bots({ seed: 7, minutes: 40, fair: true })   // "jogador justo" (como um humano) contra a IA
```


## ⚖️ Mercado e novas mecânicas (v0.5)
- **Mercado** (liberado depois da Taverna e da Pedreira):
  - Troque o que sobra pelo que falta: escolha o que vender e o que comprar e encomende trocas.
  - Os carregadores levam a mercadoria até o Mercado, e o que foi comprado vai para o Armazém.
  - Os preços seguem o valor de cada recurso, mais 50% de taxa do mercador. Não substitui a produção, mas salva quando falta ouro ou pedra.
- **Estrada inteligente:** ao arrastar, a estrada contorna casas, árvores e água e aproveita as estradas que já existem.
- **Prioridade de obra:** ☆ no painel da obra. Construtores e carregadores atendem essa obra primeiro, e uma ⭐ aparece sobre ela.
- **Alertas no minimapa:** ataques e avisos piscam no minimapa.
- **Tendência dos recursos:** a barra do topo mostra quanto cada recurso sobe ou desce por minuto (▲/▼).
- **Produção e consumo em tempo real:** clique no botão de gráfico junto aos recursos no topo ou em **Estoque → Produção e consumo**. O painel mostra produzido, gasto e saldo dos 28 recursos nos últimos 60 segundos de jogo e atualiza quatro vezes por segundo. Conta coleta, fabricação, Mercado, alimentação, materiais usados em obras/estradas, treino, equipamento e munição; transportar entre casas não conta. A janela inicial mostra somente o que já aconteceu, sem projeção. Pausa e velocidade seguem o tempo do jogo, e o histórico recente acompanha o salvamento; saves anteriores começam a medição ao carregar.
- **Produção de cada casa:** o painel mostra quanto a casa produziu e o aproveitamento (% do tempo trabalhando), com aviso quando ela passa muito tempo parada.
- **Recuperação:** soldados bem alimentados recuperam vida devagar depois de 8 s sem lutar.
- **IA tática:**
  - Escolhe o alvo pesando distância, defesas (soldados e torres) e valor (Armazém, Escola e Quartel).
  - Recua quando o ataque fracassa, com menos de 30% das tropas.
- **Ponto de encontro do Quartel:** com o Quartel selecionado, o botão direito no mapa define onde os novos soldados se reúnem (🚩).
- **Comandos de exército:** `Tab` alterna entre seus grupos (`Shift+Tab` volta). O botão direito no minimapa manda as tropas selecionadas para lá (`Shift` = ataque-mover).
- **Casas em chamas:** construções muito danificadas pegam fogo e soltam fumaça escura. Os construtores consertam quando o inimigo sai de perto.
- **Vila viva:** cidadãos ociosos passeiam em volta do seu posto, e os carregadores circulam pelas estradas.
- **Tutorial na Conquista:** aparece na fase I para quem ainda não concluiu nem fechou o tutorial.
- **Desempenho:** as 6 partes do corpo de cada personagem viram uma malha só, e só o corpo projeta sombra. Numa batalha com 209 soldados, o tempo por quadro caiu de 24,6 ms para 14,2 ms.

- **Acabamento visual:**
  - **Estradas** de terra batida pintadas, com pedras chatas e bordas que se fundem ao gramado (antes eram ladrilhos de pedra com cara de carimbo).
  - **Campos lavrados** com sulcos irregulares e bordas suaves que emendam com os vizinhos.
  - Árvores com verde mais fundo, gramado menos saturado e menos terra sob as casas.
  - Marcas discretas sob os soldados e estandartes de grupo pintados, com flâmula ondulante e número num escudo de pergaminho.
  - Planos de obra dos reinos inimigos ficam escondidos, como no original.
- **Ícones próprios na interface:** miniaturas renderizadas das construções e dos personagens no menu Construir, na Escola, no Quartel, na árvore de progresso, na aba Povo e nos painéis. Os ícones de recurso continuam como símbolos.
- **Servidor local mais robusto:** o `Jogar.bat` agora envia músicas e arquivos grandes em pedaços e não trava mais.
- **Celular e tablet:**
  - Toque seleciona; com tropas selecionadas, tocar no chão ou num inimigo dá a ordem.
  - Arrastar move a câmera, a pinça dá zoom e dois dedos girando giram a câmera.
  - O toque longo faz seleção por área.
  - Para construir, escolha a casa no menu ☰ e toque no mapa.
  - A barra lateral vira um menu retrátil, e o jogo pede para girar o celular na horizontal.
- **Áudio gravado:**
  - Trilhas medievais de verdade (RandomMind, CC0): músicas calmas na vila, trilha de batalha quando você é atacado e tema de vitória, com transições suaves.
  - Efeitos gravados (Kenney, CC0): machado, golpes de arma, moedas, passos das tropas marchando, panos e couro ao selecionar e dar ordens, metal da forja, rangido de demolição e porta ao concluir obras.
  - O som gerado por código continua como reserva. Em Opções dá para trocar "Música: gravada/gerada".
- **Multijogador por sala:** "Criar sala" gera um código de 5 letras; o amigo toca em "Entrar com código" e digita. Os navegadores se apresentam pelo serviço público gratuito ntfy.sh, que só repassa o convite de conexão (sem conta e sem dados da partida), e depois jogam direto entre si. A partida continua andando mesmo com a janela minimizada ou atrás de outra, e o outro jogador não fica travado. O modo manual continua disponível.
- **Tipos de mapa:** continente, rio (com vaus), lagos, cordilheiras, floresta densa e planalto central (montanha rica em minério disputada por todos). Escolha na Escaramuça ou use "Surpresa". Cada fase da Conquista tem um tipo próprio, e todas as bases continuam ligadas por terra.
- **Estratégias da IA:** cada reino ataca de um jeito.
  - **Assalto:** exército concentrado.
  - **Pinça:** divide o exército, que ataca por dois lados ao mesmo tempo.
  - **Cerco:** derruba primeiro as torres.
  - **Saque:** grupos rápidos atacam fazendas, minas e lenhadores mal defendidos e recuam quando apanham.

  Na Conquista, o estilo segue a personalidade de cada reino e aparece no briefing.

## 👑 Modo Conquista
- **I:** eliminar o primeiro rival. **II:** eliminar o rival ou controlar a passagem por 3 minutos.
- **III:** eliminar o rival ou reparar as seis casas marcadas a 90% e sobreviver por 14 minutos. Perder uma dessas casas causa derrota.
- **IV:** eliminar os rivais ou manter os dois postos por 2 minutos. **V:** eliminar os rivais ou resistir por 16 minutos, protegendo o Armazém inicial.
- **VI:** eliminar os rivais ou manter a jazida por 4 minutos e ter uma Fundição de ouro. **VII:** guerra entre quatro reinos sem alianças.
- **VIII:** guerra na Tundra com cidade e tropas avançadas. **IX:** proteger o Armazém inicial e sobreviver por 20 minutos, reunindo simultaneamente 30 soldados, 40 pães e 30 ouros. **X:** a guerra final contra três aliados.
- **Controle:** pelo menos 3 soldados no raio indicado e nenhum soldado rival. A contagem reinicia se ficar vazio ou contestado. Postos também exigem um Armazém no raio conectado por estrada pronta ao Armazém inicial.
- Na vitória por guerra, um reino cai quando fica sem Armazém, Escola e Quartel prontos e sem nenhum soldado.
- **Desafios opcionais** (construir algo, formar tropas, vencer rápido) valem **coroas**: 1 pela vitória e 1 por desafio, até 4 por fase. As melhores marcas ficam salvas.
- Cada fase descreve sua cidade, guarnições e condições iniciais. As construções seguintes respeitam a árvore de progressão.
- A dificuldade (Fácil, Normal ou Difícil) muda a força dos rivais e o tempo de paz.
- Os testes mostraram que as minas se esgotavam em minutos (só 10 minérios). Agora cada veio tem de 14 a 35 minérios por ladrilho, e a mina alcança 5 casas.

## 🌳 Progressão
O jogo começa só com o básico: **Armazém, Escola, Lenhador e Pedreira**, e os profissionais correspondentes (carregador, construtor, lenhador, pedreiro). Cada construção erguida libera novas opções:

`Lenhador → Serraria → Taverna / Fazenda / Oficina de armas → Moinho → Padaria · Criação de porcos → Açougue / Curtume · Minas → Fundições → Ferrarias · Serraria → Quartel → Torre / Estábulo`

- A aba **Construir** mostra os **Próximos passos** (o que construir para liberar o quê), casas bloqueadas com cadeado e o selo **NOVO** no que acabou de liberar.
- Cada botão mostra quantas construções prontas daquele tipo existem no seu reino, inclusive pausadas ou esgotadas. O indicador **+N obras** soma as planejadas e em construção; a dica separa os estados. Demolições e cancelamentos atualizam a contagem.
- Ao escolher uma construção, seus prédios desse tipo ficam marcados no mapa e no minimapa: dourado para prontos e azul tracejado para obras. Os demais prédios perdem parte da cor; terreno, minério e prévia de posicionamento mantêm suas cores.
- **Localizar**, no painel de construção, leva a câmera até um prédio existente e sai do modo de posicionamento. **Localizar próxima**, no painel do prédio selecionado, percorre os outros do mesmo tipo, incluindo obras.
- A **Escola** só treina profissões cujas casas já estão liberadas; o **Recruta** exige um Quartel.
- O **Quartel** libera soldados conforme as oficinas e ferrarias construídas (espadachins exigem as ferrarias; cavalaria exige o Estábulo).
- A **Árvore de progresso** (aba Objetivos) mostra tudo, dividido em eras.
- Na Escaramuça há a opção **"Tudo liberado (modo livre)"** para jogar sem progressão.
- As regras ficam em `KM.TECH` e `KM.SOLDIER_REQ` no `js/config.js`.

## 🏰 Mecânicas

- **Logística por estradas:** carregadores só entregam entre casas ligadas ao mesmo Armazém. Cada trecho de estrada custa 1 pedra.
- **Construção em etapas:** terreno de terra → nivelamento → fundação → andaime → casa pronta. Construtores também reparam casas danificadas.
- **28 recursos e 27 construções**, com cadeias de alimentos, mineração, armas e armaduras.
- **Escola, 14 profissões e recrutas.** O treino automático é opcional.
- **Encomendas** nas oficinas e ferrarias, **distribuição** de carvão, ferro, trigo e madeira, **bloqueio** de recursos no Armazém, casas pausáveis.
- **Fome:** cidadãos comem na Taverna. Soldados recebem comida levada pelos carregadores e morrem se passarem fome.
- **Exército em grupos:** formação, girar, colunas, dividir, unir, alimentar, ataque-mover, anti-cavalaria e bônus de flanco.
- **Torres com recruta e pedras. IA** que constrói a cidade, planta, minera, forja armas, treina e ataca.
- **Até 4 jogadores por mapa, com times e aliados. Névoa de guerra.**

## 🎨 Direção de arte própria: "vila medieval ilustrada"
- **Personagens Quaternius:** roupas de camponês e patrulheiro, cabeças, cabelos e barbas combinados com ferramentas e peças próprias em `js/people.js`. São 14 profissões (incluindo recruta) e 10 tipos de soldado. Cada pessoa usa **uma única malha** com atlas de texturas e cores de profissão/reino. Cavalos animados são de Quaternius; cavaleiros levam manta na cor do reino. O visual procedural anterior permanece como alternativa quando os personagens não carregam.
- **Construções feitas pelo próprio jogo** (`js/art.js`), sem modelos prontos: são 27 projetos com silhueta própria.
  - Materiais: enxaimel com reboco caiado, tábuas, toras, pedra de cantaria; telhados de palha, telha ou ardósia.
  - Exemplos: moinho de vento com pás girando, taverna com andar avançado, escola com torre do sino, quartel com ameias, mina escorada em madeira, fornalhas com brasa, chiqueiro e estábulo com animais vivos.
  - A cor do reino aparece em portas, venezianas e estandartes que tremulam.
- **Estilo pintado:**
  - Sombreamento em faixas (toon) e contorno a tinta sépia.
  - Gradação quente com sombras arroxeadas, hachuras de pena nas áreas escuras, grão de papel e vinheta.
  - Tudo isso é um pós-processamento próprio.
- **Natureza facetada:**
  - Carvalhos, pinheiros, arbustos floridos, capim, rochas com musgo e minério aparente.
  - Pedras, carvão, ferro e ouro usam assets próprios feitos no Blender (`assets/own/resources`), com fraturas e cores minerais. O renderer mantém instâncias e material toon, com alternativa procedural se um arquivo não carregar.
  - Montanhas rochosas com estratos e fendas, e trigo balançando ao vento.
  - Chão com pinceladas e manchas de capim seco e relva fresca.
  - Água pintada: turquesa na margem, azul-profundo no meio, espuma batendo na costa.
- **Obras próprias:** terreno marcado com estacas, fundação, estrutura de madeira, paredes e andaime. Construções destruídas viram ruínas.
- **Fundação de pedra** que acompanha o relevo, com sombras longas de sol de fim de tarde e sombras de nuvens.
- **Obras em etapas** com andaime e pilhas de material; prédios destruídos viram ruínas com fumaça.
- **Personagens animados:** a Universal Animation Library de Quaternius fornece as animações usadas para movimento, trabalho, interação e combate. Cavaleiros e batedores montam cavalos animados; o caminho visual anterior usa esqueletos e animações KayKit.
- **Menu principal** com uma vila viva ao fundo e a câmera girando devagar.
- **Sons e música procedurais** com volume pela distância da câmera e panorâmica estéreo.

## 📦 Créditos e licenças
**© 2026 Deivity Andrade. Todos os direitos reservados.** O código, a arte própria, os textos e o nome do jogo não podem ser copiados, modificados, redistribuídos ou usados sem autorização por escrito. O repositório é público apenas para leitura; não é software livre. Os termos estão em [LICENSE](LICENSE). Os componentes de terceiros abaixo seguem as licenças próprias.

- Músicas: **RandomMind** (OpenGameArt): The Bard's Tale, Minstrel Dance, Market Day, Harvest Season, Battle e Victory Theme. Efeitos: **Kenney – RPG Audio** (kenney.nl). Detalhes em `assets/audio/CREDITS.txt`.
- Construções, natureza, texturas e efeitos: **arte própria** gerada por código (`js/art.js`)
- Personagens, roupas, cabelos, barbas e animações: **Quaternius**, CC0; integração e peças adicionais próprias em `js/people.js`. Espada, machado, picareta, escudo e texturas vêm do **Fantasy Props MegaKit**, também de Quaternius.
- Esqueletos e animações do visual anterior: **KayKit – Character Pack: Adventurers**, por Kay Lousberg (kaylousberg.com), CC0. A sombra das nuvens usa o KayKit Medieval Hexagon Pack. Arte procedural alternativa em `js/art.js`.
- **Animated Animal Pack** e **Farm Animal Pack**, por Quaternius (quaternius.com), via poly.pizza
- **Three.js** (licença MIT)

Os assets externos são CC0; Three.js é MIT. Licenças e créditos estão em `assets/kaykit/LICENSE_characters.txt`, `assets/kaykit/LICENSE_medieval.txt`, `assets/quaternius/chars/LICENSE_quaternius.txt`, `assets/quaternius/props/LICENSE_quaternius.txt`, `assets/audio/CREDITS.txt`, `assets/audio/sfx/LICENSE_kenney.txt` e `js/vendor/three/LICENSE`.

## 🗂️ Estrutura do código

```
Jogar.bat         inicia o servidor local e abre o jogo
serve.ps1         servidor HTTP local
index.html        página, menus e ajuda (carrega o Three.js como módulo)
css/style.css     visual da interface
assets/           modelos 3D (KayKit, Quaternius)
js/vendor/three/  Three.js 0.186 + GLTFLoader + SkeletonUtils
js/config.js      DADOS: recursos, casas, receitas, profissões, soldados, distribuição, dificuldades
js/util.js        RNG determinístico, ruído, heap
js/map.js         geração de mapa com relevo, A*, malha de estradas, nivelamento
js/world.js       jogadores/times, casas, unidades, cidades iniciais, névoa por jogador
js/economy.js     carregadores, construtores, reparo, produção, escola, torres
js/units.js       movimento e tarefas dos cidadãos
js/military.js    grupos, formações, combate, fome dos soldados, projéteis
js/ai.js          IA (economia real / ondas / posto avançado), uma por jogador
js/campaign.js    tutorial, 14 missões, 10 fases de Conquista, objetivos e progresso
js/cmd.js         comandos: toda ação do jogador (base do multijogador)
js/tutorial.js    tutorial completo e guia básico da Missão I
js/art.js         arte própria: texturas pintadas, materiais, construções, obras, natureza
js/people.js      personagens Quaternius, atlas, peças por profissão e animações
js/render3d.js    motor 3D: terreno, água, névoa, instâncias, personagens, câmera, pós-processamento ilustrado
js/ui.js          painéis, abas, minimapa, briefing, menus
js/input.js       mouse, teclado, seleção por raio no relevo
js/editor.js      editor de mapas
js/net.js         multijogador WebRTC com lockstep
js/audio.js       áudio gravado CC0 e sons, música e vozes procedurais (Web Audio)
js/main.js        laço de 20 ticks/s, lockstep, salvar/carregar, histórico para os gráficos
tools/sim.js      simulador de partidas para balanceamento
tools/check.js    regressões da simulação, sem dependências externas
tools/net-check.js  regressões do multijogador (lockstep em estrela), sem navegador
tools/playtest.html  prévia pausada de fases para inspeção visual
sw.js, manifest.webmanifest, icon.svg   modo offline e instalação como aplicativo
```

**Determinismo:** a simulação usa um RNG próprio guardado no estado do jogo e roda em ticks fixos. Todas as ações dos jogadores passam por `js/cmd.js`. Com isso, dois computadores com a mesma semente e os mesmos comandos chegam exatamente ao mesmo estado.

O multijogador por sala comporta 2 a 4 humanos, até 4 reinos contando as IAs; o modo manual aceita 2 humanos. Todos devem usar a mesma versão do jogo. Há troca periódica de checksum com aviso de dessincronização. Se um convidado cai, a IA assume seu reino no mesmo turno nos participantes restantes; se o anfitrião cai, cada convidado continua localmente com IAs, sem reconexão à partida compartilhada.

Saves e progresso ficam no `localStorage` do navegador e da origem usada (site online e localhost têm armazenamentos separados). Partidas multijogador não são salvas. O carregamento rejeita formatos anteriores a `KM.SAVE_V` e aplica ajustes pontuais nos estados aceitos; não há migração geral entre versões.
