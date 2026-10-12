import type { Fonte } from "./fonte";

// Regras da casa desta mesa. Não vêm do livro: mude aqui se a mesa decidir outra coisa.

/** Todos os personagens distribuem o mesmo total entre os nove atributos. */
export const PONTOS_PERSONAGEM = 75;

export const FONTE_PONTOS_MESA: Fonte = {
  pagina: "25",
  nota: `Regra da mesa: todos com ${PONTOS_PERSONAGEM} pontos. No livro, é o método cinematográfico; 75 é o total de "Herói menor".`,
};

/** Método e total fixos pela mesa, aplicados no servidor em toda gravação. */
export function comPontosDaMesa<T extends { metodo: string; pontos: number | null }>(dados: T): T {
  return { ...dados, metodo: "cinematografico", pontos: PONTOS_PERSONAGEM };
}
