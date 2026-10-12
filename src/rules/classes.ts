import type { Fonte } from "./fonte";
import { ARTES_MARCIAIS } from "./pericias";

/** Vaga do pacote de carreira: uma perícia fixa ou uma escolha entre opções. */
export type Vaga = string | { rotulo: string; opcoes: string[] };

export type Classe = {
  id: string;
  nome: string;
  habilidade: string; // id da perícia especial
  pacote: Vaga[]; // inclui a habilidade especial
  fonte: Fonte;
};

const TECNICAS = ["giro-tec", "aero-tec", "armeiro", "seguranca-eletronica"];
const tecnica = { rotulo: "Outra perícia técnica (Giro, Aero, Armas, Segurança Eletrônica)", opcoes: TECNICAS };

// Perícias Profissionais (p. 44). Nomes das classes como no texto do livro.
export const CLASSES: Classe[] = [
  {
    id: "solo", nome: "Solo", habilidade: "nocao-combate", fonte: { pagina: "8, 44" },
    pacote: ["nocao-combate", "atencao", "armas-curtas", { rotulo: "Briga ou Artes Marciais", opcoes: ["briga", ...ARTES_MARCIAIS] },
      "armas-brancas", "armeiro", "fuzil", "atletismo", "submetralhadora", "furtividade"],
  },
  {
    id: "roqueiro", nome: "Roqueiro", habilidade: "lideranca-carismatica", fonte: { pagina: "6, 44" },
    pacote: ["lideranca-carismatica", "atencao", "atuacao", "roupa-estilo", "composicao", "briga", "tocar-instrumento", "manha", "persuasao", "seducao"],
  },
  {
    id: "netrunner", nome: "Netrunner", habilidade: "interface", fonte: { pagina: "10, 44" },
    pacote: ["interface", "atencao", "tecnologia-basica", "educacao", "conhecimento-sistemas", "cibertecnologia", "projeto-ciberterminal", "composicao", "eletronica", "programacao"],
  },
  {
    id: "tecnico", nome: "Técnico", habilidade: "reparos-improvisados", fonte: { pagina: "12, 44" },
    pacote: ["reparos-improvisados", "atencao", "tecnologia-basica", "cibertecnologia", "educacao", "pedagogia", "eletronica", tecnica, tecnica, tecnica],
  },
  {
    id: "tecnomedico", nome: "Tecnomédico", habilidade: "tecnologia-medica", fonte: { pagina: "44" },
    pacote: ["tecnologia-medica", "atencao", "tecnologia-basica", "diagnose", "pesquisa", "educacao", "tanque-criogenico", "medicamentos", "zoologia", "percepcao"],
  },
  {
    id: "midia", nome: "Mídia", habilidade: "credibilidade", fonte: { pagina: "14, 44" },
    pacote: ["credibilidade", "atencao", "composicao", "educacao", "persuasao", "percepcao", "trato-social", "manha", "fotografia", "entrevista"],
  },
  {
    id: "policial", nome: "Policial", habilidade: "autoridade", fonte: { pagina: "16, 44" },
    pacote: ["autoridade", "atencao", "armas-curtas", "percepcao", "atletismo", "educacao", "briga", "armas-brancas", "interrogatorio", "manha"],
  },
  {
    id: "corporativo", nome: "Corporativo", habilidade: "recursos", fonte: { pagina: "18, 44" },
    pacote: ["recursos", "atencao", "percepcao", "educacao", "pesquisa", "trato-social", "persuasao", "mercado-acoes", "roupa-estilo", "cuidados-pessoais"],
  },
  {
    id: "atravessador", nome: "Atravessador", habilidade: "negociar", fonte: { pagina: "20, 44" },
    pacote: ["negociar", "atencao", "falsificacao", "armas-curtas", "briga", "armas-brancas", "arrombamento", "punga", "intimidacao", "persuasao"],
  },
  {
    id: "nomade", nome: "Nômade", habilidade: "familia", fonte: { pagina: "22, 44" },
    pacote: ["familia", "atencao", "resistencia", "armas-brancas", "fuzil", "conducao", "tecnologia-basica", "sobrevivencia", "briga", "atletismo"],
  },
];

export const CLASSE_POR_ID = new Map(CLASSES.map((c) => [c.id, c]));

export const PONTOS_CARREIRA = 40;
export const FONTE_CARREIRA: Fonte = { pagina: "44", nota: "40 pontos divididos entre as dez Perícias Profissionais da classe." };
export const FONTE_OPCIONAIS: Fonte = { pagina: "46", nota: "REF + INT pontos; não podem subir Perícias Profissionais." };
