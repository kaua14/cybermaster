import type { Fonte as F } from "@/rules/fonte";

/**
 * Página do livro. Com `verificar`, vira um aviso discreto que abre a nota ao tocar
 * (title não funciona no celular).
 */
export function Fonte({ fonte }: { fonte?: F }) {
  if (!fonte) return null;
  if (!fonte.verificar) {
    return <span className="pag" title={fonte.nota}>p. {fonte.pagina}</span>;
  }
  return (
    <details className="fonte-verificar">
      <summary className="pag verificar">p. {fonte.pagina} · conferir</summary>
      <span className="nota-pe">{fonte.nota ?? "Não confirmado no livro."}</span>
    </details>
  );
}
