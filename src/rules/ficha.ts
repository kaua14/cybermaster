import { z } from "zod";
import { ATRIBUTO_MAX, ATRIBUTO_MIN, SIGLAS, type Atributos, type Metodo } from "./atributos";
import { CLASSE_POR_ID, PONTOS_CARREIRA, type Classe } from "./classes";
import { custoProximoNivel } from "./experiencia";
import { NIVEL_MAX, PERICIA_POR_ID } from "./pericias";

const inteiro = (min: number, max: number) => z.number().int().min(min).max(max);
const texto = (max: number) => z.string().max(max);

export const PericiaFichaSchema = z.object({
  /** id da lista de perícias, ou "livre" para uma perícia criada na mesa. */
  chave: z.string().min(1).max(60),
  /** Idioma, especialidade, ou o nome da perícia livre. */
  complemento: texto(60).optional(),
  /** Só para perícia livre ou para ajustar idioma. */
  atributo: z.enum(SIGLAS).nullable().optional(),
  mult: inteiro(1, 5).optional(),
  carreira: inteiro(0, NIVEL_MAX),
  opcional: inteiro(0, NIVEL_MAX),
  melhoria: inteiro(0, NIVEL_MAX),
  pe: inteiro(0, 100_000),
});
export type PericiaFicha = z.infer<typeof PericiaFichaSchema>;

export const ArmaSchema = z.object({
  nome: texto(60),
  tipo: texto(20),
  prec: texto(6),
  dano: texto(20),
  mun: texto(10),
  cdt: texto(10),
  alcance: texto(12),
});
export type Arma = z.infer<typeof ArmaSchema>;

export const LOCAIS = [
  { id: "cabeca", nome: "Cabeça", d10: "1" },
  { id: "torso", nome: "Torso", d10: "2–4" },
  { id: "bracoD", nome: "Braço dir.", d10: "5" },
  { id: "bracoE", nome: "Braço esq.", d10: "6" },
  { id: "pernaD", nome: "Perna dir.", d10: "7–8" },
  { id: "pernaE", nome: "Perna esq.", d10: "9–10" },
] as const;
export type Local = (typeof LOCAIS)[number]["id"];

export const CyberwareSchema = z.object({ nome: texto(80), ch: inteiro(0, 100), notas: texto(200) });
export type Cyberware = z.infer<typeof CyberwareSchema>;

export const DadosSchema = z.object({
  idade: inteiro(0, 200).nullable(),
  metodo: z.enum(["aleatorio", "rapido", "cinematografico"]),
  pontos: inteiro(18, 90).nullable(),
  atributos: z.object(Object.fromEntries(SIGLAS.map((s) => [s, inteiro(ATRIBUTO_MIN, ATRIBUTO_MAX)])) as Record<(typeof SIGLAS)[number], z.ZodNumber>),
  pericias: z.array(PericiaFichaSchema).max(150),
  armas: z.array(ArmaSchema).max(20),
  armadura: z.object({
    ...(Object.fromEntries(LOCAIS.map((l) => [l.id, inteiro(0, 60)])) as Record<Local, z.ZodNumber>),
    descricao: texto(300),
  }),
  cyberware: z.array(CyberwareSchema).max(40),
  equipamento: texto(4000),
  dinheiro: inteiro(0, 1_000_000_000),
  historia: texto(8000),
});
export type Dados = z.infer<typeof DadosSchema>;

export const FichaEditavelSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome ao personagem.").max(60),
  classe: z.string().refine((c) => CLASSE_POR_ID.has(c), "Classe desconhecida."),
  dados: DadosSchema,
});
export type FichaEditavel = z.infer<typeof FichaEditavelSchema>;

export function dadosIniciais(metodo: Metodo, pontos: number | null, classe: string): Dados {
  const c = CLASSE_POR_ID.get(classe);
  return {
    idade: null,
    metodo,
    pontos,
    atributos: Object.fromEntries(SIGLAS.map((s) => [s, ATRIBUTO_MIN])) as Atributos,
    // Já começa com as perícias fixas do pacote da classe.
    pericias: (c?.pacote ?? []).filter((v): v is string => typeof v === "string").map((chave) => ({ chave, carreira: 0, opcional: 0, melhoria: 0, pe: 0 })),
    armas: [],
    armadura: { cabeca: 0, torso: 0, bracoD: 0, bracoE: 0, pernaD: 0, pernaE: 0, descricao: "" },
    cyberware: [],
    equipamento: "",
    dinheiro: 0,
    historia: "",
  };
}

// ---------- perícias ----------

export const chavePericia = (p: Pick<PericiaFicha, "chave" | "complemento">) =>
  p.complemento ? `${p.chave}:${p.complemento.trim().toLowerCase()}` : p.chave;

export function infoPericia(p: PericiaFicha) {
  const base = PERICIA_POR_ID.get(p.chave);
  const nomeBase = base?.nome ?? "Perícia livre";
  const nome = p.complemento ? (base ? `${nomeBase}: ${p.complemento}` : p.complemento) : nomeBase;
  const nivel = Math.min(NIVEL_MAX, p.carreira + p.opcional + p.melhoria);
  const mult = p.mult ?? base?.mult ?? 1;
  return {
    nome,
    atributo: p.atributo !== undefined ? p.atributo : (base?.atributo ?? null),
    mult,
    nivel,
    especial: !!base?.especial,
    fonte: base?.fonte,
    custo: custoProximoNivel(nivel, mult),
  };
}

type Elegibilidade = { fixas: Set<string>; vagas: { rotulo: string; opcoes: Set<string>; quantidade: number }[] };

export function elegibilidade(classe: Classe | undefined): Elegibilidade {
  const fixas = new Set<string>();
  const vagas = new Map<string, { rotulo: string; opcoes: Set<string>; quantidade: number }>();
  for (const v of classe?.pacote ?? []) {
    if (typeof v === "string") fixas.add(v);
    else {
      const atual = vagas.get(v.rotulo);
      if (atual) atual.quantidade++;
      else vagas.set(v.rotulo, { rotulo: v.rotulo, opcoes: new Set(v.opcoes), quantidade: 1 });
    }
  }
  return { fixas, vagas: [...vagas.values()] };
}

/** A perícia pode receber pontos de carreira nesta classe? */
export function podeCarreira(el: Elegibilidade, chave: string) {
  return el.fixas.has(chave) || el.vagas.some((v) => v.opcoes.has(chave));
}

// ---------- resumo e validação ----------

export type Contador = { usados: number; total: number | null };

export type Resumo = {
  atributos: Contador;
  carreira: Contador;
  opcionais: Contador;
  problemas: string[];
};

export function resumo(classe: string, d: Dados): Resumo {
  const problemas: string[] = [];
  const c = CLASSE_POR_ID.get(classe);
  const el = elegibilidade(c);

  const somaAtr = SIGLAS.reduce((s, k) => s + d.atributos[k], 0);
  const totalAtr = d.metodo === "rapido" ? null : d.pontos;
  if (totalAtr !== null && somaAtr > totalAtr) problemas.push(`Atributos passam do total: ${somaAtr} de ${totalAtr}.`);
  if (d.metodo !== "rapido" && totalAtr === null) problemas.push("Informe o total de pontos de personagem.");
  if (d.metodo === "rapido" && SIGLAS.some((k) => d.atributos[k] < 3)) {
    problemas.push("No método rápido, resultados 2 ou menos são rolados de novo: cada atributo vale pelo menos 3.");
  }

  let carreira = 0;
  let opcionais = 0;
  const vistas = new Set<string>();
  for (const p of d.pericias) {
    const i = infoPericia(p);
    const k = chavePericia(p);
    if (vistas.has(k)) problemas.push(`${i.nome} aparece duas vezes.`);
    vistas.add(k);
    carreira += p.carreira;
    opcionais += p.opcional;
    if (p.carreira > 0 && !podeCarreira(el, p.chave)) problemas.push(`${i.nome} não é Perícia Profissional de ${c?.nome ?? "?"}: não recebe pontos de carreira.`);
    if (p.opcional > 0 && (el.fixas.has(p.chave) || p.carreira > 0)) problemas.push(`${i.nome} é Perícia Profissional: pontos opcionais não podem subi-la.`);
    if (p.carreira + p.opcional + p.melhoria > NIVEL_MAX) problemas.push(`${i.nome} passa de +${NIVEL_MAX}.`);
    if (!PERICIA_POR_ID.has(p.chave) && p.chave !== "livre") problemas.push(`Perícia desconhecida: ${p.chave}.`);
  }
  for (const v of el.vagas) {
    const escolhidas = d.pericias.filter((p) => p.carreira > 0 && v.opcoes.has(p.chave)).length;
    if (escolhidas > v.quantidade) problemas.push(`${v.rotulo}: escolha no máximo ${v.quantidade}.`);
  }

  const totalOpc = d.atributos.REF + d.atributos.INT;
  if (carreira > PONTOS_CARREIRA) problemas.push(`Pontos de carreira passam do limite: ${carreira} de ${PONTOS_CARREIRA}.`);
  if (opcionais > totalOpc) problemas.push(`Pontos opcionais passam do limite: ${opcionais} de ${totalOpc} (REF + INT).`);

  return {
    atributos: { usados: somaAtr, total: totalAtr },
    carreira: { usados: carreira, total: PONTOS_CARREIRA },
    opcionais: { usados: opcionais, total: totalOpc },
    problemas,
  };
}

export const custoCyberware = (d: Dados) => d.cyberware.reduce((s, c) => s + c.ch, 0);

/**
 * Depois de concluída a criação, o jogador não mexe em atributos, método,
 * classe nem nos pontos das perícias: isso só muda por PE ou pelo mestre.
 * Mantém os valores guardados e devolve a versão permitida.
 */
export function travarCriacao(antes: FichaEditavel, depois: FichaEditavel): FichaEditavel {
  const guardadas = new Map(antes.dados.pericias.map((p) => [chavePericia(p), p]));
  const pericias: PericiaFicha[] = [];
  const mantidas = new Set<string>();
  for (const p of depois.dados.pericias) {
    const k = chavePericia(p);
    const g = guardadas.get(k);
    if (g) {
      pericias.push({ ...p, chave: g.chave, complemento: g.complemento, atributo: g.atributo, mult: g.mult, carreira: g.carreira, opcional: g.opcional, melhoria: g.melhoria, pe: g.pe });
      mantidas.add(k);
    } else {
      pericias.push({ ...p, carreira: 0, opcional: 0, melhoria: 0, pe: 0 });
    }
  }
  // Perícia com nível ou PE não some.
  for (const [k, g] of guardadas) {
    if (!mantidas.has(k) && (g.carreira + g.opcional + g.melhoria > 0 || g.pe > 0)) pericias.push(g);
  }
  return {
    nome: depois.nome,
    classe: antes.classe,
    dados: { ...depois.dados, metodo: antes.dados.metodo, pontos: antes.dados.pontos, atributos: antes.dados.atributos, pericias },
  };
}
