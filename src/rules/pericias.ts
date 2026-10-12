import type { Sigla } from "./atributos";
import type { Fonte } from "./fonte";

export type Pericia = {
  id: string;
  nome: string;
  /** Atributo somado no teste. `null` = não se soma a um atributo (Noção de Combate). */
  atributo: Sigla | null;
  /** Multiplicador de PE. */
  mult: number;
  /** Habilidade especial de uma classe. */
  especial?: boolean;
  /** Pede um complemento no nome (qual idioma, qual especialidade). */
  complemento?: string;
  fonte: Fonte;
};

const DESC: Fonte = { pagina: "46–53" };
const ESPECIAIS: Fonte = { pagina: "46–47" };

function p(id: string, nome: string, atributo: Sigla | null, mult = 1, extra: Partial<Pericia> = {}): Pericia {
  return { id, nome, atributo, mult, fonte: DESC, ...extra };
}

// Lista da edição Devir, na ordem do livro. Atributo de cada grupo conforme a lista de perícias (p. 45).
export const PERICIAS: Pericia[] = [
  // Habilidades especiais
  p("autoridade", "Autoridade", "AuCon", 1, { especial: true, fonte: ESPECIAIS }),
  p("lideranca-carismatica", "Liderança Carismática", "AuCon", 1, { especial: true, fonte: ESPECIAIS }),
  p("nocao-combate", "Noção de Combate", null, 1, {
    especial: true,
    fonte: { ...ESPECIAIS, nota: "Soma-se aos testes de Iniciativa e de Atenção/Notar." },
  }),
  p("credibilidade", "Credibilidade", "INT", 1, { especial: true, fonte: ESPECIAIS }),
  p("familia", "Família", "INT", 1, { especial: true, fonte: ESPECIAIS }),
  p("interface", "Interface", "INT", 1, { especial: true, fonte: ESPECIAIS }),
  p("reparos-improvisados", "Reparos Improvisados", "TEC", 1, {
    especial: true,
    fonte: { ...ESPECIAIS, verificar: true, nota: "O texto não diz o atributo; TEC é suposição." },
  }),
  p("tecnologia-medica", "Tecnologia Médica", "TEC", 1, {
    especial: true,
    fonte: { ...ESPECIAIS, verificar: true, nota: "O texto não diz o atributo; TEC é suposição." },
  }),
  p("recursos", "Recursos", "INT", 1, { especial: true, fonte: ESPECIAIS }),
  p("negociar", "Negociar", "AuCon", 1, { especial: true, fonte: ESPECIAIS }),

  // Atratividade
  p("cuidados-pessoais", "Cuidados Pessoais", "ATR"),
  p("roupa-estilo", "Roupa e Estilo", "ATR"),

  // Tipo Corporal
  p("resistencia", "Resistência", "TCO"),
  p("feitos-forca", "Feitos de Força", "TCO"),
  p("natacao", "Natação", "TCO"),

  // Autocontrole
  p("interrogatorio", "Interrogatório", "AuCon"),
  p("intimidacao", "Intimidação", "AuCon"),
  p("oratoria", "Oratória", "AuCon"),
  p("resistencia-tortura", "Resistência a Torturas/Drogas", "AuCon"),
  p("manha", "Manha", "AuCon"),

  // Empatia
  p("percepcao", "Percepção", "EMP"),
  p("entrevista", "Entrevista", "EMP"),
  p("lideranca", "Liderança", "EMP"),
  p("seducao", "Sedução", "EMP"),
  p("trato-social", "Trato Social", "EMP"),
  p("persuasao", "Persuasão e Lábia", "EMP"),
  p("atuacao", "Atuação", "EMP"),

  // Inteligência
  p("contabilidade", "Contabilidade", "INT"),
  p("antropologia", "Antropologia", "INT"),
  p("atencao", "Atenção/Notar", "INT"),
  p("biologia", "Biologia", "INT"),
  p("botanica", "Botânica", "INT"),
  p("quimica", "Química", "INT"),
  p("composicao", "Composição", "INT"),
  p("diagnose", "Diagnose", "INT"),
  p("educacao", "Educação e Cultura Geral", "INT"),
  p("especialista", "Especialista", "INT", 1, { complemento: "Especialidade" }),
  p("jogo", "Jogo", "INT"),
  p("geologia", "Geologia", "INT"),
  p("esconder", "Esconder/Evadir", "INT"),
  p("historia", "História", "INT"),
  p("idioma", "Idioma", "INT", 1, {
    complemento: "Idioma",
    fonte: { ...DESC, nota: "O multiplicador depende da família do idioma (1 a 3). Ajuste na ficha." },
  }),
  p("pesquisa", "Pesquisa em Biblioteca", "INT"),
  p("matematica", "Matemática", "INT"),
  p("fisica", "Física", "INT"),
  p("programacao", "Programação", "INT"),
  p("sombra", "Sombra/Rastreamento", "INT"),
  p("mercado-acoes", "Mercado de Ações", "INT"),
  p("conhecimento-sistemas", "Conhecimento de Sistemas", "INT"),
  p("pedagogia", "Pedagogia", "INT"),
  p("sobrevivencia", "Sobrevivência", "INT"),
  p("zoologia", "Zoologia", "INT"),

  // Reflexos
  p("arqueirismo", "Arqueirismo", "REF"),
  p("atletismo", "Atletismo", "REF"),
  p("briga", "Briga", "REF"),
  p("danca", "Dança", "REF"),
  p("esquiva", "Esquiva/Escape", "REF"),
  p("conducao", "Condução", "REF"),
  p("esgrima", "Esgrima", "REF"),
  p("armas-curtas", "Armas Curtas", "REF"),
  p("armas-pesadas", "Armas Pesadas", "REF", 1, {
    fonte: { ...DESC, verificar: true, nota: "O OCR não mostra multiplicador; confira se é (2)." },
  }),
  p("am-aikido", "Artes Marciais: Aikido", "REF", 3),
  p("am-boxe", "Artes Marciais: Boxe", "REF", 1),
  p("am-capoeira", "Artes Marciais: Capoeira", "REF", 3),
  p("am-choi-li-fut", "Artes Marciais: Choi Li Fut", "REF", 3),
  p("am-judo", "Artes Marciais: Judô", "REF", 1),
  p("am-karate", "Artes Marciais: Karatê", "REF", 2),
  p("am-kung-fu", "Artes Marciais: Kung Fu", "REF", 3),
  p("am-greco-romana", "Artes Marciais: Luta Greco-Romana", "REF", 1),
  p("am-tae-kwon-do", "Artes Marciais: Tae Kwon Do", "REF", 3, {
    fonte: { ...DESC, verificar: true, nota: "A descrição diz (3); a tabela de artes marciais do combate parece dizer (4)." },
  }),
  p("am-boxe-tailandes", "Artes Marciais: Boxe Tailandês", "REF", 4),
  p("am-savate", "Artes Marciais: Savate", "REF", 2, {
    fonte: { pagina: "98–99", verificar: true, nota: "Aparece só na tabela de artes marciais do combate." },
  }),
  p("armas-brancas", "Armas Brancas", "REF"),
  p("motocicleta", "Motocicleta", "REF"),
  p("maquinaria-pesada", "Operação de Maquinaria Pesada", "REF"),
  p("pilotagem-giro", "Pilotagem de Giro", "REF", 3),
  p("pilotagem-asa-fixa", "Pilotagem de Asa Fixa", "REF", 2),
  p("pilotagem-dirigivel", "Pilotagem de Dirigível", "REF", 2),
  p("pilotagem-vetorial", "Pilotagem de Veículo de Impulso Vetorial", "REF", 3),
  p("fuzil", "Fuzil", "REF"),
  p("furtividade", "Furtividade", "REF", 2),
  p("submetralhadora", "Submetralhadora", "REF"),

  // Técnica
  p("aero-tec", "Aero Tec", "TEC", 2),
  p("av-tec", "AV Tec", "TEC", 3),
  p("tecnologia-basica", "Tecnologia Básica", "TEC", 2),
  p("tanque-criogenico", "Operação de Tanque Criogênico", "TEC"),
  p("projeto-ciberterminal", "Projeto de Ciberterminal", "TEC", 2),
  p("cibertecnologia", "Cibertecnologia", "TEC", 2),
  p("demolicoes", "Demolições", "TEC", 2),
  p("disfarce", "Disfarce", "TEC"),
  p("eletronica", "Eletrônica", "TEC"),
  p("seguranca-eletronica", "Segurança Eletrônica", "TEC", 2),
  p("primeiros-socorros", "Primeiros Socorros", "TEC"),
  p("falsificacao", "Falsificação", "TEC"),
  p("giro-tec", "Giro Tec", "TEC", 3),
  p("pintura", "Pintura e Desenho", "TEC"),
  p("fotografia", "Fotografia e Filmagem", "TEC"),
  p("medicamentos", "Medicamentos", "TEC", 2),
  p("arrombamento", "Arrombamento", "TEC"),
  p("punga", "Punga", "TEC"),
  p("tocar-instrumento", "Tocar Instrumento", "TEC"),
  p("armeiro", "Armeiro", "TEC", 2),
];

export const PERICIA_POR_ID = new Map(PERICIAS.map((x) => [x.id, x]));
export const ARTES_MARCIAIS = PERICIAS.filter((x) => x.id.startsWith("am-")).map((x) => x.id);

export const NIVEL_MAX = 10;
