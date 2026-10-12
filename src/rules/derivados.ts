import type { Atributos } from "./atributos";
import type { Fonte } from "./fonte";

export type Derivado = { id: string; rotulo: string; valor: string; fonte: Fonte };

/** Modificador de Tipo Corporal (MTC). Valores do livro; −5 (sobre-humano) só com implantes. */
export function mtc(tco: number): number {
  if (tco <= 2) return 0;
  if (tco <= 4) return -1;
  if (tco <= 7) return -2;
  if (tco <= 9) return -3;
  return -4;
}
export const FONTE_MTC: Fonte = {
  pagina: "26–29, 103",
  verificar: true,
  nota: "Valores 0 a −4 confirmados. As faixas de TCO (2 / 3–4 / 5–7 / 8–9 / 10) estão ilegíveis no OCR abaixo de 8.",
};

export const correr = (mov: number) => mov * 3;
export const salto = (mov: number) => Math.floor((correr(mov) / 4) * 10) / 10;
export const carregar = (tco: number) => tco * 10;
export const levantar = (tco: number) => tco * 40;
export const humanidadeBase = (emp: number) => emp * 10;

/** Humanidade atual e EMP atual: a cada 10 pontos de Humanidade perdidos, −1 de EMP. */
export function humanidade(emp: number, custoCyberware: number) {
  const perda = Math.max(0, custoCyberware);
  const atual = humanidadeBase(emp) - perda;
  return { base: humanidadeBase(emp), atual, empAtual: emp - Math.floor(perda / 10) };
}
export const FONTE_HUMANIDADE: Fonte = { pagina: "26–29, 75", nota: "Humanidade = EMP × 10. Cada 10 pontos perdidos tiram 1 de EMP." };

export function derivados(a: Atributos, custoCyberware = 0): Derivado[] {
  const h = humanidade(a.EMP, custoCyberware);
  return [
    { id: "correr", rotulo: "Corrida (MOV × 3)", valor: `${correr(a.MOV)} m`, fonte: { pagina: "26–29", nota: "Por turno de combate; ×3 num turno completo de 10 s." } },
    { id: "salto", rotulo: "Salto (Corrida ÷ 4)", valor: `${salto(a.MOV).toLocaleString("pt-BR")} m`, fonte: { pagina: "26–29" } },
    { id: "carregar", rotulo: "Carregar (TCO × 10)", valor: `${carregar(a.TCO)} kg`, fonte: { pagina: "26–29" } },
    { id: "levantar", rotulo: "Levantar (TCO × 40)", valor: `${levantar(a.TCO)} kg`, fonte: { pagina: "26–29", nota: "Com esforço muito grande." } },
    { id: "vitalidade", rotulo: "Vitalidade (= TCO)", valor: String(a.TCO), fonte: { pagina: "26–29" } },
    { id: "mtc", rotulo: "MTC", valor: String(mtc(a.TCO)), fonte: FONTE_MTC },
    { id: "humanidade", rotulo: "Humanidade (EMP × 10)", valor: custoCyberware > 0 ? `${h.atual} de ${h.base}` : String(h.base), fonte: FONTE_HUMANIDADE },
  ];
}
