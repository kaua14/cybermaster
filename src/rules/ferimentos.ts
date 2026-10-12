import type { Atributos } from "./atributos";
import type { Fonte } from "./fonte";

export const CAIXAS = 40;
export const POR_ESTADO = 4;

export type Estado = { indice: number; nome: string; atordoamento: number };

// Dez estados de 4 caixas. Penalidade no teste contra atordoamento: 0 a −9.
export const ESTADOS: Estado[] = [
  "Leve", "Grave", "Crítico", "Mortal 0", "Mortal 1", "Mortal 2", "Mortal 3", "Mortal 4", "Mortal 5", "Mortal 6",
].map((nome, indice) => ({ indice, nome, atordoamento: -indice }));

export const FONTE_FERIMENTOS: Fonte = { pagina: "103–104" };

export function estadoDoDano(dano: number): Estado | null {
  if (dano <= 0) return null;
  return ESTADOS[Math.min(ESTADOS.length - 1, Math.floor((Math.min(dano, CAIXAS) - 1) / POR_ESTADO))];
}

const metadeParaCima = (v: number) => Math.ceil(v / 2);
const terçoParaCima = (v: number) => Math.ceil(v / 3);

/** REF, INT e AuCon depois dos efeitos do ferimento. */
export function atributosFeridos(a: Atributos, dano: number): Pick<Atributos, "REF" | "INT" | "AuCon"> {
  const e = estadoDoDano(dano);
  if (!e || e.indice === 0) return { REF: a.REF, INT: a.INT, AuCon: a.AuCon };
  if (e.indice === 1) return { REF: Math.max(0, a.REF - 2), INT: a.INT, AuCon: a.AuCon };
  if (e.indice === 2) return { REF: metadeParaCima(a.REF), INT: metadeParaCima(a.INT), AuCon: metadeParaCima(a.AuCon) };
  return { REF: terçoParaCima(a.REF), INT: terçoParaCima(a.INT), AuCon: terçoParaCima(a.AuCon) };
}

export type Avisos = { efeito: string; atordoamento: string | null; morte: string | null };

export function avisos(tco: number, dano: number): Avisos {
  const e = estadoDoDano(dano);
  if (!e) return { efeito: "Sem ferimentos.", atordoamento: null, morte: null };
  const efeito = [
    "Sem penalidade. Só dói.",
    "−2 em REF em todas as ações.",
    "REF, INT e AuCon pela metade (arredonde para cima).",
  ][e.indice] ?? "REF, INT e AuCon divididos por 3 (arredonde para cima).";
  const alvoAtord = tco + e.atordoamento;
  const atordoamento = `Ao sofrer dano: teste contra atordoamento, 1d10 ≤ ${alvoAtord} (TCO ${tco}${e.atordoamento === 0 ? ", sem penalidade" : ` − ${-e.atordoamento}`}). Falhou: fora de combate; tente de novo a cada turno.`;
  let morte: string | null = null;
  if (e.indice >= 3) {
    const nivel = e.indice - 3;
    morte = `Ferimento mortal: teste contra morte a cada turno sem estabilização, 1d10 ≤ ${tco - nivel} (TCO ${tco} − ${nivel}). Falhou: morre no fim do turno. Estabilize com Primeiros Socorros ou Tecnologia Médica.`;
  }
  return { efeito, atordoamento, morte };
}

export const FONTE_MORTE: Fonte = {
  pagina: "104",
  verificar: true,
  nota: "A regra diz “menor ou igual”, mas o exemplo do livro diz “menor que”. Usamos ≤.",
};
