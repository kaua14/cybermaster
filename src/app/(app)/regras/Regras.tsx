"use client";
import { useMemo, useState } from "react";
import { Fonte } from "@/components/Fonte";
import { BASE, CATEGORIAS, type Categoria, type Registro } from "@/rules/base";

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function textoDe(r: Registro) {
  return sem([r.titulo, r.resumo, ...(r.itens ?? []), ...r.palavras, ...(r.tabela?.linhas.flat() ?? [])].join(" "));
}

export function Regras() {
  const [busca, setBusca] = useState("");
  const indice = useMemo(() => BASE.map((r) => ({ r, t: textoDe(r) })), []);
  const termos = sem(busca).split(/\s+/).filter(Boolean);
  const achados = termos.length ? indice.filter(({ t }) => termos.every((x) => t.includes(x))).map(({ r }) => r) : BASE;
  const grupos = (Object.keys(CATEGORIAS) as Categoria[])
    .map((c) => ({ c, regras: achados.filter((r) => r.categoria === c) }))
    .filter((g) => g.regras.length);

  return (
    <>
      <div className="campo" style={{ maxWidth: 420, marginBottom: 26 }}>
        <label htmlFor="r-busca">Procurar</label>
        <input id="r-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: atordoamento, PE, cabeça" autoComplete="off" />
      </div>
      {grupos.length === 0 && <p className="nota-pe">Nada encontrado. Confira o livro.</p>}
      {grupos.map(({ c, regras }) => (
        <section key={c} className="grupo-regras" aria-labelledby={`cat-${c}`}>
          <h2 id={`cat-${c}`}>{CATEGORIAS[c]}</h2>
          {regras.map((r) => (
            <details key={r.id} className="regra" id={r.id} open={termos.length > 0 && regras.length <= 3}>
              <summary>
                {r.titulo}
                <span className="pag">p. {r.fonte.pagina}</span>
              </summary>
              <div className="corpo">
                <p>{r.resumo}</p>
                {r.itens && <ul>{r.itens.map((i) => <li key={i}>{i}</li>)}</ul>}
                {r.tabela && (
                  <div className="tabela-rolavel">
                    <table>
                      <thead><tr>{r.tabela.colunas.map((x) => <th key={x}>{x}</th>)}</tr></thead>
                      <tbody>{r.tabela.linhas.map((l, i) => <tr key={i}>{l.map((x, j) => <td key={j}>{x}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
                <Fonte fonte={r.fonte} />
              </div>
            </details>
          ))}
        </section>
      ))}
    </>
  );
}
