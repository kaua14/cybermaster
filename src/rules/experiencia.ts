import type { Fonte } from "./fonte";
import { NIVEL_MAX } from "./pericias";

/**
 * PE necessários para subir do nível atual ao próximo.
 * 1º nível: 10 PE. Depois: nível atual × 10. Tudo vezes o multiplicador da perícia.
 */
export function custoProximoNivel(nivelAtual: number, mult: number): number | null {
  if (nivelAtual >= NIVEL_MAX) return null;
  const base = nivelAtual <= 0 ? 10 : nivelAtual * 10;
  return base * Math.max(1, mult);
}

export const FONTE_PE: Fonte = {
  pagina: "53–54",
  verificar: true,
  nota: "Confirmado: nível × 10 × multiplicador (ex.: +4→+5 com ×3 custa 120). Não está claro se o multiplicador vale para o 1º nível (10 PE).",
};

export const FONTE_GANHO_PE: Fonte = {
  pagina: "54",
  nota: "O mestre dá PE na perícia que foi usada: estudo (só até +2), professor ou experiência. Sugestão: até 6 PE por perícia por sessão.",
};
