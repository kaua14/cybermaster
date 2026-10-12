import type { Fonte } from "./fonte";

// Ordem e siglas da ficha da edição Devir.
export const SIGLAS = ["INT", "REF", "TEC", "AuCon", "ATR", "SOR", "MOV", "TCO", "EMP"] as const;
export type Sigla = (typeof SIGLAS)[number];
export type Atributos = Record<Sigla, number>;

export const ATRIBUTOS: Record<Sigla, { nome: string; resumo: string }> = {
  INT: { nome: "Inteligência", resumo: "Entender, resolver problemas, perceber e lembrar." },
  REF: { nome: "Reflexos", resumo: "Destreza e coordenação: dirigir, lutar, atirar, feitos atléticos." },
  TEC: { nome: "Habilidade Técnica", resumo: "Lidar com equipamento e tecnologia." },
  AuCon: { nome: "Autocontrole", resumo: "Aguentar pressão, medo e dor; parecer durão." },
  ATR: { nome: "Atratividade", resumo: "Boa aparência." },
  SOR: { nome: "Sorte", resumo: "Pontos que se somam a testes críticos, declarados antes de rolar; voltam ao fim de cada sessão." },
  MOV: { nome: "Capacidade de Movimento", resumo: "Velocidade de corrida." },
  TCO: { nome: "Tipo Corporal", resumo: "Força, resistência, dano que aguenta, peso que carrega." },
  EMP: { nome: "Empatia", resumo: "Relacionar-se com os outros; cai com a perda de Humanidade." },
};

export const ATRIBUTO_MIN = 2;
export const ATRIBUTO_MAX = 10;
export const FONTE_ATRIBUTOS: Fonte = { pagina: "26" };

export type Metodo = "aleatorio" | "rapido" | "cinematografico";

export const METODOS: Record<Metodo, { nome: string; resumo: string; soMestre?: boolean }> = {
  aleatorio: { nome: "Aleatório", resumo: "Role 9d10 e some. O total são seus pontos para distribuir entre os nove atributos." },
  rapido: { nome: "Rápido", resumo: "Role 1d10 para cada atributo, rolando de novo resultados 2 ou menos, e coloque cada resultado onde quiser." },
  cinematografico: { nome: "Cinematográfico", resumo: "Só o mestre usa: ele define o total conforme a importância do personagem.", soMestre: true },
};
export const FONTE_METODOS: Fonte = { pagina: "25" };

// Totais sugeridos pelo livro para o método cinematográfico.
export const CINEMATOGRAFICO = [
  { pontos: 80, nome: "Herói principal" },
  { pontos: 75, nome: "Herói menor" },
  { pontos: 70, nome: "Coadjuvante principal" },
  { pontos: 60, nome: "Coadjuvante menor" },
  { pontos: 50, nome: "Pessoa comum" },
] as const;
