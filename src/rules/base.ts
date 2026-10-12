import { FONTE_CARREIRA, FONTE_OPCIONAIS } from "./classes";
import { FONTE_HUMANIDADE, FONTE_MTC } from "./derivados";
import { FONTE_GANHO_PE, FONTE_PE } from "./experiencia";
import { FONTE_FERIMENTOS, FONTE_MORTE } from "./ferimentos";
import type { Fonte } from "./fonte";
import { FONTE_PONTOS_MESA, PONTOS_PERSONAGEM } from "./mesa";

/**
 * Base de regras própria: resumos escritos com palavras nossas, valores numéricos e página do livro.
 * Não copia texto nem tabelas formatadas do livro. A página Regras e o assistente usam esta mesma base.
 */
export type Registro = {
  id: string;
  categoria: Categoria;
  titulo: string;
  resumo: string;
  itens?: string[];
  tabela?: { colunas: string[]; linhas: string[][] };
  fonte: Fonte;
  /** Termos que alguém usaria para perguntar (ajudam a busca). */
  palavras: string[];
};

export type Categoria = "testes" | "personagem" | "experiencia" | "combate" | "dano" | "ferimentos" | "cyberware" | "net" | "mesa";

export const CATEGORIAS: Record<Categoria, string> = {
  mesa: "Regras da mesa",
  testes: "Testes e dificuldades",
  personagem: "Personagem",
  experiencia: "Experiência (PE)",
  combate: "Combate",
  dano: "Dano e armadura",
  ferimentos: "Ferimentos",
  cyberware: "Cyberware e Humanidade",
  net: "Netrunner",
};

export const BASE: Registro[] = [
  // ---------------- mesa ----------------
  {
    id: "mesa-pontos",
    categoria: "mesa",
    titulo: "Pontos de personagem da mesa",
    resumo: `Nesta mesa todo personagem tem ${PONTOS_PERSONAGEM} pontos para distribuir entre os nove atributos, cada um de 2 a 10. Isso substitui a rolagem de dados da criação.`,
    itens: [
      "No livro há três jeitos de gerar os pontos: somar 9d10, rolar 1d10 por atributo (rolando de novo 2 ou menos) ou o mestre escolher um total.",
      `No método do mestre, 80 é herói principal, 75 herói menor, 70 coadjuvante principal, 60 coadjuvante menor e 50 pessoa comum. A mesa usa ${PONTOS_PERSONAGEM}.`,
    ],
    fonte: FONTE_PONTOS_MESA,
    palavras: ["pontos de personagem", "criação", "criar personagem", "atributos", "75", "distribuir", "método", "cinematográfico"],
  },

  // ---------------- testes ----------------
  {
    id: "teste-pericia",
    categoria: "testes",
    titulo: "Teste de perícia",
    resumo: "Some 1d10 ao atributo mais adequado e a uma perícia relacionada. Se o total for igual ou maior que a Dificuldade, deu certo.",
    itens: [
      "Só uma perícia por teste.",
      "Sem perícia adequada, rola só 1d10 + atributo.",
      "Quem define a Dificuldade é o mestre.",
    ],
    fonte: { pagina: "41–42" },
    palavras: ["teste", "rolar", "perícia", "dificuldade", "DV", "sucesso", "1d10", "como rolar", "habilidade básica"],
  },
  {
    id: "dificuldades",
    categoria: "testes",
    titulo: "Dificuldades",
    resumo: "O mestre classifica a tarefa de Fácil a Quase Impossível; cada nível tem um número que o teste precisa alcançar.",
    tabela: {
      colunas: ["Tarefa", "Dificuldade"],
      linhas: [["Fácil", "10"], ["Média", "15"], ["Difícil", "20"], ["Muito Difícil", "25"], ["Quase Impossível", "30"]],
    },
    fonte: { pagina: "41–42", verificar: true, nota: "Confirmados no texto: Fácil, Muito Difícil, Quase Impossível (30). Nomes e valores do meio estão ilegíveis no OCR." },
    palavras: ["dificuldade", "DV", "fácil", "difícil", "quase impossível", "número alvo", "tabela de dificuldade"],
  },
  {
    id: "modificadores-dificuldade",
    categoria: "testes",
    titulo: "Modificadores de dificuldade",
    resumo: "Situações ruins somam pontos à Dificuldade. O mestre pode montar a Dificuldade somando esses modificadores.",
    tabela: {
      colunas: ["Situação", "Soma à Dificuldade"],
      linhas: [
        ["Nunca fez a tarefa antes", "+1"],
        ["Fechadura complexa / muito complexa", "+3 / +5"],
        ["Informação escondida ou obscura", "+3"],
        ["Acrobacia difícil / muito difícil", "+3 / +4"],
        ["Bêbado, drogado ou cansado", "+4"],
        ["Ambiente hostil", "+4"],
        ["Ferramenta, arma ou veículo desconhecido", "+4"],
        ["Reparo muito complexo", "+4"],
        ["Nunca foi feito antes por ninguém", "+6"],
      ],
    },
    fonte: { pagina: "42", verificar: true, nota: "Só os valores legíveis no OCR. A tabela do livro tem mais linhas." },
    palavras: ["modificador", "penalidade", "dificuldade", "bêbado", "cansado", "ferramenta", "fechadura", "acrobacia"],
  },
  {
    id: "testes-opostos",
    categoria: "testes",
    titulo: "Testes opostos",
    resumo: "Quando a ação é contra outra pessoa, ela também rola 1d10 + atributo + perícia para resistir. Empate fica com quem está defendendo.",
    fonte: { pagina: "42" },
    palavras: ["oposto", "contra outro personagem", "resistir", "empate", "disputa"],
  },
  {
    id: "critico",
    categoria: "testes",
    titulo: "Falha crítica e sucesso decisivo",
    resumo: "Tirar 1 no dado é falha crítica: rola mais 1d10 na tabela de falhas. Tirar 10 é sucesso decisivo: rola mais 1d10 e soma ao resultado.",
    itens: ["Vale o dado puro, antes de somar qualquer coisa.", "A tabela de falhas fica na p. 43."],
    fonte: { pagina: "42–43" },
    palavras: ["crítico", "falha crítica", "fumble", "1 natural", "10 natural", "sucesso decisivo", "explodir", "rolar de novo"],
  },
  {
    id: "sorte",
    categoria: "testes",
    titulo: "Sorte",
    resumo: "Os pontos de Sorte podem ser somados a qualquer teste. Anuncie antes de rolar. Gasta quanto quiser até acabar; tudo volta no fim da sessão de jogo.",
    fonte: { pagina: "26–27, 42" },
    palavras: ["sorte", "SOR", "luck", "gastar sorte", "somar sorte"],
  },

  // ---------------- personagem ----------------
  {
    id: "pericias-iniciais",
    categoria: "personagem",
    titulo: "Perícias iniciais",
    resumo: "Cada classe tem dez Perícias Profissionais (a habilidade especial e mais nove); divida 40 pontos entre elas. Depois some REF + INT para ter os pontos de Perícias Opcionais, que vão para qualquer outra perícia.",
    itens: ["Pontos opcionais não podem subir Perícias Profissionais.", "Perícias vão de 0 a 10."],
    fonte: { pagina: "44–46", nota: `${FONTE_CARREIRA.nota} ${FONTE_OPCIONAIS.nota}` },
    palavras: ["perícias profissionais", "carreira", "40 pontos", "opcionais", "REF + INT", "pacote", "criação"],
  },
  {
    id: "habilidades-especiais",
    categoria: "personagem",
    titulo: "Habilidades especiais",
    resumo: "Cada classe tem uma habilidade só dela. Ela funciona como uma perícia e entra nos 40 pontos de carreira.",
    tabela: {
      colunas: ["Classe", "Habilidade", "Para que serve"],
      linhas: [
        ["Solo", "Noção de Combate", "Soma o nível à Iniciativa e aos testes de Atenção/Notar."],
        ["Roqueiro", "Liderança Carismática", "Controlar multidões (nível² × 200 pessoas). AuCon."],
        ["Netrunner", "Interface", "Usar as funções do Menu na Net. INT."],
        ["Técnico", "Reparos Improvisados", "Consertar ou alterar algo por 1d6 turnos por nível; não é conserto definitivo."],
        ["Tecnomédico", "Tecnologia Médica", "Cirurgias e reparos médicos grandes."],
        ["Mídia", "Credibilidade", "Fazer o público acreditar no que você diz. INT."],
        ["Policial", "Autoridade", "Intimidar ou controlar pela posição de agente da lei. AuCon."],
        ["Corporativo", "Recursos", "Pedir recursos da corporação, como persuasão. INT."],
        ["Atravessador", "Negociar", "Achar pessoas, coisas e informação pela rede de contatos. AuCon."],
        ["Nômade", "Família", "Chamar membros do clã (nível × 2). INT."],
      ],
    },
    fonte: { pagina: "4–22, 46–47" },
    palavras: ["habilidade especial", "noção de combate", "interface", "autoridade", "recursos", "negociar", "família", "credibilidade", "liderança carismática", "reparos improvisados", "tecnologia médica", "classe"],
  },
  {
    id: "derivados",
    categoria: "personagem",
    titulo: "Valores derivados",
    resumo: "Alguns números da ficha saem direto dos atributos. O app calcula todos sozinho.",
    tabela: {
      colunas: ["Valor", "Conta"],
      linhas: [
        ["Corrida (m por turno)", "MOV × 3 (×3 de novo num turno completo de 10 s)"],
        ["Salto (m)", "Corrida ÷ 4"],
        ["Carregar (kg)", "TCO × 10"],
        ["Levantar (kg, com esforço)", "TCO × 40"],
        ["Vitalidade", "= TCO"],
        ["Humanidade", "EMP × 10"],
      ],
    },
    fonte: { pagina: "26–29" },
    palavras: ["corrida", "correr", "salto", "carregar", "levantar", "vitalidade", "derivados", "MOV", "TCO", "quanto corre", "quanto carrega"],
  },
  {
    id: "mtc",
    categoria: "dano",
    titulo: "Modificador de Tipo Corporal (MTC)",
    resumo: "Corpo forte segura dano. Depois da armadura, tire o MTC do dano que passou. O dano nunca cai abaixo de 1 por causa do MTC.",
    tabela: {
      colunas: ["TCO", "Tipo", "MTC"],
      linhas: [["2", "Muito fraco", "0"], ["3–4", "Fraco", "−1"], ["5–7", "Médio", "−2"], ["8–9", "Forte", "−3"], ["10", "Muito forte", "−4"], ["11+ (só com implantes)", "Sobre-humano", "−5"]],
    },
    fonte: FONTE_MTC,
    palavras: ["MTC", "BTM", "modificador de tipo corporal", "tipo corporal", "reduz dano", "corpo"],
  },

  // ---------------- experiência ----------------
  {
    id: "pe-custo",
    categoria: "experiencia",
    titulo: "Quanto custa subir uma perícia",
    resumo: "O 1º nível custa 10 PE. Depois, para subir de um nível ao próximo, custa o nível atual × 10. Perícias difíceis têm multiplicador, que multiplica esse custo.",
    itens: ["Ex.: Briga +4 → +5 custa 40 PE; +5 → +6 custa 50.", "Ex.: Choi Li Fut (×3) +4 → +5 custa 120 PE.", "No app, os PE ficam na própria perícia e o botão Subir aparece quando dá."],
    fonte: FONTE_PE,
    palavras: ["PE", "experiência", "subir perícia", "custo", "melhorar", "multiplicador", "quanto custa", "nível", "evoluir"],
  },
  {
    id: "pe-ganho",
    categoria: "experiencia",
    titulo: "Como ganhar PE",
    resumo: "O mestre dá PE na perícia que foi usada. Há três jeitos: estudar sozinho (só até +2, cerca de 1 PE por dia), ter um professor (que ensina até a média entre a perícia dele e Pedagogia, 1 a 5 PE por lição) e experiência em jogo.",
    tabela: {
      colunas: ["PE", "Quando dar (resumo)"],
      linhas: [
        ["1", "Usou bastante, mesmo sem efeito"],
        ["2", "Usou com eficácia"],
        ["3", "Usou muito e bem"],
        ["4", "Fez algo fora do comum"],
        ["5–6", "Uso muito ou extremamente inteligente"],
        ["7–8", "Decisivo para o jogador ou para o grupo"],
        ["9", "Algo realmente incrível"],
      ],
    },
    itens: ["Sugestão do livro: no máximo 6 PE por perícia por sessão.", "Premie também interpretação e trabalho em equipe."],
    fonte: FONTE_GANHO_PE,
    palavras: ["ganhar PE", "dar PE", "recompensa", "experiência", "professor", "estudo", "pedagogia", "quantos PE"],
  },

  // ---------------- combate ----------------
  {
    id: "iniciativa",
    categoria: "combate",
    titulo: "Iniciativa",
    resumo: "No começo do combate cada um rola 1d10 + REF. Quem tirar mais age primeiro.",
    itens: [
      "Solos somam o nível de Noção de Combate.",
      "Amplificadores de reflexos somam o bônus deles.",
      "Para agilizar: um líder rola pelo grupo e cada um soma o próprio REF ao resultado.",
    ],
    fonte: { pagina: "97" },
    palavras: ["iniciativa", "ordem", "quem age primeiro", "turno", "rodada", "REF", "noção de combate"],
  },
  {
    id: "sacar-rapido",
    categoria: "combate",
    titulo: "Sacar rápido",
    resumo: "Declare no começo da rodada: +3 na Iniciativa e −3 no ataque. Não dá para usar mira telescópica nem outros auxílios de pontaria.",
    fonte: { pagina: "97" },
    palavras: ["sacar rápido", "tiro rápido", "iai-jutsu", "golpe relâmpago", "iniciativa"],
  },
  {
    id: "acoes",
    categoria: "combate",
    titulo: "Ações no turno",
    resumo: "Por turno você faz uma ação: mover até MOV × 3 metros, atirar até a cadência (CdT) da arma, atacar corpo a corpo, esquivar, aparar, escapar.",
    itens: [
      "Mais de uma ação no turno: −3 em cada ação a mais.",
      "Duas armas ao mesmo tempo: −3 nas duas.",
      "Emboscada ou ataque pelas costas: +5 no ataque.",
    ],
    fonte: { pagina: "98" },
    palavras: ["ação", "ações", "turno", "duas armas", "emboscada", "pelas costas", "mover", "esquivar", "aparar"],
  },
  {
    id: "alcance",
    categoria: "combate",
    titulo: "Tiro: distância e Dificuldade",
    resumo: "Para acertar, 1d10 + REF + perícia da arma precisa alcançar o número da distância. O alcance total depende da arma.",
    tabela: {
      colunas: ["Distância", "Quanto é", "Para acertar"],
      linhas: [
        ["Queima-roupa", "até 1 m", "10"],
        ["Perto", "¼ do alcance", "15"],
        ["Médio", "½ do alcance", "20"],
        ["Longe", "alcance total", "25"],
        ["Extremo", "2× o alcance", "30"],
      ],
    },
    itens: ["Alcance: armas curtas 50 m, submetralhadoras 150 m; arremesso 10 m × TCO."],
    fonte: { pagina: "105", verificar: true, nota: "Confirmados: Longe 25 e Extremo 30, e as faixas de distância. Queima-roupa, Perto e Médio estão ilegíveis no OCR." },
    palavras: ["tiro", "acertar", "distância", "alcance", "queima-roupa", "perto", "médio", "longe", "extremo", "atirar", "armas de fogo"],
  },
  {
    id: "modificadores-ataque",
    categoria: "combate",
    titulo: "Modificadores de ataque",
    resumo: "Alguns ajustes que entram na rolagem de quem ataca.",
    tabela: {
      colunas: ["Situação", "Ajuste"],
      linhas: [
        ["Mirar numa parte do corpo", "−4"],
        ["Mirando com calma", "+1 por rodada, até 3"],
        ["Sacar rápido", "−3"],
        ["Emboscada", "+5"],
        ["Fogo automático, perto", "+1 a cada 10 tiros"],
        ["Fogo automático, outras distâncias", "−1 a cada 10 tiros"],
      ],
    },
    fonte: { pagina: "100, 105–106", verificar: true, nota: "A tabela do livro tem muitos outros modificadores, ilegíveis no OCR." },
    palavras: ["modificador de ataque", "mirar", "mira", "tiro mirado", "fogo automático", "rajada", "bônus para acertar"],
  },
  {
    id: "localizacao",
    categoria: "dano",
    titulo: "Onde o tiro pegou",
    resumo: "Se o ataque não mirou num lugar, role 1d10 para ver onde acertou. Use bom senso: alvo atrás de um muro baixo não leva tiro na perna, rola de novo.",
    tabela: {
      colunas: ["1d10", "Local"],
      linhas: [["1", "Cabeça (dano dobrado)"], ["2–4", "Torso"], ["5", "Braço direito"], ["6", "Braço esquerdo"], ["7–8", "Perna direita"], ["9–10", "Perna esquerda"]],
    },
    fonte: { pagina: "100, 103", verificar: true, nota: "No texto: 7–8 é perna direita e tiro na cabeça dobra o dano. O resto vem da ficha do livro, ilegível no OCR." },
    palavras: ["localização", "onde acertou", "cabeça", "torso", "braço", "perna", "dano na cabeça", "headshot", "dobra"],
  },
  {
    id: "armadura",
    categoria: "dano",
    titulo: "Armadura (PB)",
    resumo: "Cada local do corpo tem um Poder de Bloqueio. Tire o PB do dano; se o dano for menor que o PB, nada passa.",
    itens: [
      "Ordem: dano − PB do local, depois − MTC (mínimo 1), depois dobra se for cabeça.",
      "Até 3 camadas ao mesmo tempo, só uma rígida.",
      "Cada armadura tem Valor de Carga (VC); a soma dos VCs sai do REF. A 2ª camada tem −1 extra e a 3ª, −2.",
      "Camadas, ou armadura atrás de cobertura, não somam direto: use a tabela de armadura proporcional do livro.",
    ],
    fonte: { pagina: "101–103" },
    palavras: ["armadura", "PB", "SP", "poder de bloqueio", "colete", "jaqueta", "camadas", "valor de carga", "VC", "cobertura"],
  },
  {
    id: "perda-membro",
    categoria: "dano",
    titulo: "Perda de membro",
    resumo: "Mais de 8 pontos de dano num braço ou perna em um só ataque: o membro quebra ou é arrancado, e o personagem faz teste contra morte como se estivesse em Mortal 0. Na cabeça, morre na hora.",
    fonte: { pagina: "103" },
    palavras: ["perder membro", "arrancar braço", "amputar", "membro", "8 pontos"],
  },

  // ---------------- ferimentos ----------------
  {
    id: "estados-ferimento",
    categoria: "ferimentos",
    titulo: "Estados de ferimento",
    resumo: "A trilha tem 40 caixas, em estados de 4 caixas: Leve, Grave, Crítico e Mortal 0 a 6. Marque uma caixa por ponto de dano.",
    tabela: {
      colunas: ["Estado", "Dano", "Efeito"],
      linhas: [
        ["Leve", "1–4", "Sem penalidade."],
        ["Grave", "5–8", "−2 em REF."],
        ["Crítico", "9–12", "REF, INT e AuCon pela metade (arredonda para cima)."],
        ["Mortal 0–6", "13–40", "REF, INT e AuCon ÷ 3 (arredonda para cima). Teste contra morte a cada turno."],
      ],
    },
    fonte: FONTE_FERIMENTOS,
    palavras: ["ferimento", "estado", "leve", "grave", "crítico", "mortal", "trilha de dano", "caixas", "penalidade de ferimento"],
  },
  {
    id: "atordoamento",
    categoria: "ferimentos",
    titulo: "Teste contra atordoamento",
    resumo: "Sempre que levar dano (ou certas drogas), role 1d10: precisa tirar igual ou menos que o TCO, menos a penalidade do estado de ferimento. Falhou: fora de combate; tenta de novo a cada turno.",
    tabela: {
      colunas: ["Estado", "Penalidade no teste"],
      linhas: [["Leve", "0"], ["Grave", "−1"], ["Crítico", "−2"], ["Mortal 0", "−3"], ["Mortal 1", "−4"], ["Mortal 2", "−5"], ["Mortal 3", "−6"], ["Mortal 4", "−7"], ["Mortal 5", "−8"], ["Mortal 6", "−9"]],
    },
    itens: ["Ex.: TCO 8 com ferimento Grave precisa de 7 ou menos."],
    fonte: { pagina: "29, 104" },
    palavras: ["atordoamento", "atordoado", "stun", "desmaiar", "nocaute", "fora de combate", "vitalidade", "teste de vitalidade"],
  },
  {
    id: "morte",
    categoria: "ferimentos",
    titulo: "Teste contra morte",
    resumo: "Ferido em estado Mortal, role 1d10 a cada turno sem estabilização: precisa tirar igual ou menos que TCO menos o número do Mortal. Falhou: morre no fim do turno.",
    itens: ["Ex.: TCO 10 em Mortal 4 precisa de 6 ou menos.", "Só a estabilização tira o personagem desse ciclo."],
    fonte: FONTE_MORTE,
    palavras: ["morte", "morrer", "teste contra morte", "mortal", "sangrando", "death save"],
  },
  {
    id: "estabilizacao",
    categoria: "ferimentos",
    titulo: "Estabilização",
    resumo: "Outra pessoa (não o ferido) rola 1d10 + TEC + perícia médica. Se o total alcançar o dano total do ferido, ele está estabilizado e para de fazer teste contra morte, até levar outro ferimento.",
    tabela: { colunas: ["Recurso", "Bônus"], linhas: [["Hospital completo com cirurgia", "+5"], ["Ambulância do Trauma Team", "+3"], ["Tanque de suspensão de vida", "+3"]] },
    itens: ["Ex.: com 20 pontos de dano, precisa de 20 ou mais.", "Recuperação e cura: seção do Trauma Team (p. 116)."],
    fonte: { pagina: "104–105" },
    palavras: ["estabilizar", "estabilização", "primeiros socorros", "salvar", "médico", "tecnomédico", "parar sangramento"],
  },

  // ---------------- cyberware ----------------
  {
    id: "humanidade",
    categoria: "cyberware",
    titulo: "Humanidade e ciberpsicose",
    resumo: "Humanidade começa em EMP × 10. Cada implante tem Custo de Humanidade (CH); a cada 10 pontos perdidos, perde 1 de EMP (arredonda para baixo).",
    itens: [
      "EMP 3: frio, sem emoção. EMP 2: assustador e desagradável. EMP 1: violento, à beira de perder o controle.",
      "Com terapia de um ciberpsicólogo, recupera 2 pontos de CH por semana até voltar à EMP original.",
      "Na ficha, anote o CH rolado de cada implante: o app soma e mostra a EMP atual.",
    ],
    fonte: FONTE_HUMANIDADE,
    palavras: ["humanidade", "ciberpsicose", "ciberpsicopata", "custo de humanidade", "CH", "EMP", "implante", "cyberware", "terapia"],
  },

  // ---------------- net ----------------
  {
    id: "interface",
    categoria: "net",
    titulo: "Netrunner: Interface",
    resumo: "Interface é a habilidade especial do Netrunner, baseada em INT. É ela que se usa para as funções do Menu na Net: localização remota, executar programa, controlar sistema remoto, ligação de longa distância, carregar, criar e apagar.",
    itens: ["Outros personagens podem entrar na Net, mas não usam o Menu.", "Enquanto o netrunner está conectado, o corpo dele fica vulnerável: protejam."],
    fonte: { pagina: "10, 46" },
    palavras: ["netrunner", "net", "interface", "menu", "cyberdeck", "hackear", "rede", "programa"],
  },
  {
    id: "net-resto",
    categoria: "net",
    titulo: "Net, programas e Black ICE",
    resumo: "As regras completas da Net (combate de programas, ICE, Black ICE, fortalezas de dados) ainda não estão resumidas no app.",
    fonte: { pagina: "131", verificar: true, nota: "Capítulo da Net ainda não conferido. Consulte o livro." },
    palavras: ["black ice", "ICE", "programa", "fortaleza de dados", "combate na net", "vírus", "daemon"],
  },
];

export const REGISTRO_POR_ID = new Map(BASE.map((r) => [r.id, r]));
