"use client";
import { Fonte } from "@/components/Fonte";
import { Painel } from "@/components/Painel";
import { CAIXAS, ESTADOS, FONTE_FERIMENTOS, FONTE_MORTE, POR_ESTADO, avisos, estadoDoDano } from "@/rules/ferimentos";
import { FONTE_HUMANIDADE, humanidade } from "@/rules/derivados";
import { LOCAIS, type Arma, type Cyberware, type Dados } from "@/rules/ficha";

// ---------- trilha de ferimentos ----------

export function Ferimentos({ dano, tco, onChange }: { dano: number; tco: number; onChange: (d: number) => void }) {
  const estado = estadoDoDano(dano);
  const a = avisos(tco, dano);
  return (
    <Painel legenda="Ferimentos">
      <div className="linha" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <span className="rotulo" style={{ margin: 0 }}>
          Dano: <b style={{ color: "var(--tinta)" }}>{dano}</b> de {CAIXAS} · Estado: <b style={{ color: estado ? "var(--ocre)" : "var(--tinta)" }}>{estado?.nome ?? "Ileso"}</b>
        </span>
        <Fonte fonte={FONTE_FERIMENTOS} />
      </div>
      <div className="trilha" role="group" aria-label="Trilha de dano: toque na caixa para marcar até ela">
        {ESTADOS.map((e) => (
          <div key={e.nome} className={estado?.indice === e.indice ? "grupo atual" : "grupo"}>
            <div className="rotulo">{e.nome} <span className="pag">atord. {e.atordoamento}</span></div>
            <div className="caixas">
              {Array.from({ length: POR_ESTADO }, (_, k) => {
                const n = e.indice * POR_ESTADO + k + 1;
                return (
                  <button key={n} type="button" className={n <= dano ? "marcada" : undefined}
                    aria-label={`${n} de dano`} aria-pressed={n <= dano}
                    onClick={() => onChange(n === dano ? n - 1 : n)} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="terminal espaco">
        {a.efeito}
        {a.atordoamento && `\n${a.atordoamento}`}
        {a.morte && `\n${a.morte}`}
      </div>
      {a.morte && <div style={{ marginTop: 6 }}><Fonte fonte={FONTE_MORTE} /></div>}
      <div className="linha" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-p" disabled={dano === 0} onClick={() => onChange(Math.max(0, dano - 1))}>Tirar 1</button>
        <button type="button" className="btn btn-p" disabled={dano >= CAIXAS} onClick={() => onChange(Math.min(CAIXAS, dano + 1))}>Marcar 1</button>
        <button type="button" className="btn btn-p" disabled={dano === 0} onClick={() => confirm("Zerar todo o dano?") && onChange(0)}>Zerar</button>
      </div>
    </Painel>
  );
}

// ---------- armas ----------

const ARMA_VAZIA: Arma = { nome: "", tipo: "", prec: "", dano: "", mun: "", cdt: "", alcance: "" };
const COLUNAS: { k: keyof Arma; rotulo: string; largura: number }[] = [
  { k: "nome", rotulo: "Arma", largura: 160 },
  { k: "tipo", rotulo: "Tipo", largura: 70 },
  { k: "prec", rotulo: "Prec", largura: 50 },
  { k: "dano", rotulo: "Dano", largura: 80 },
  { k: "mun", rotulo: "Mun", largura: 55 },
  { k: "cdt", rotulo: "CdT", largura: 50 },
  { k: "alcance", rotulo: "Alcance", largura: 70 },
];

export function Armas({ armas, onChange }: { armas: Arma[]; onChange: (a: Arma[]) => void }) {
  return (
    <Painel legenda="Armas">
      {armas.length > 0 && (
        <div className="tabela-rolavel">
          <table className="tab-edit">
            <thead>
              <tr>{COLUNAS.map((c) => <th key={c.k}>{c.rotulo}</th>)}<th><span className="sr">Ações</span></th></tr>
            </thead>
            <tbody>
              {armas.map((a, i) => (
                <tr key={i}>
                  {COLUNAS.map((c) => (
                    <td key={c.k}>
                      <input style={{ minWidth: c.largura }} value={a[c.k]} maxLength={c.k === "nome" ? 60 : 20} aria-label={`${c.rotulo} da arma ${i + 1}`}
                        onChange={(e) => onChange(armas.map((x, j) => (j === i ? { ...x, [c.k]: e.target.value } : x)))} />
                    </td>
                  ))}
                  <td><button type="button" className="btn btn-p" onClick={() => onChange(armas.filter((_, j) => j !== i))}>Tirar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" className="btn btn-p" style={{ marginTop: 10 }} disabled={armas.length >= 20} onClick={() => onChange([...armas, { ...ARMA_VAZIA }])}>
        Adicionar arma
      </button>
      <p className="nota-pe" style={{ marginTop: 8 }}>Prec = precisão. CdT = cadência de tiro. Copie os valores da tabela de armas do livro (p. 62–66).</p>
    </Painel>
  );
}

// ---------- armadura ----------

export function Armadura({ armadura, onChange }: { armadura: Dados["armadura"]; onChange: (a: Dados["armadura"]) => void }) {
  return (
    <Painel legenda="Armadura (PB por local)">
      <table>
        <thead><tr><th>Local</th><th>1d10</th><th>PB</th></tr></thead>
        <tbody>
          {LOCAIS.map((l) => (
            <tr key={l.id}>
              <td>{l.nome}</td>
              <td className="pag">{l.d10}</td>
              <td style={{ width: 80 }}>
                <input className="num" type="number" min={0} max={60} value={armadura[l.id]} aria-label={`PB ${l.nome}`}
                  onChange={(e) => onChange({ ...armadura, [l.id]: Math.max(0, Math.min(60, Math.floor(Number(e.target.value) || 0))) })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="campo">
        <label htmlFor="arm-desc">Armadura vestida</label>
        <input id="arm-desc" value={armadura.descricao} maxLength={300} onChange={(e) => onChange({ ...armadura, descricao: e.target.value })} />
      </div>
      <p className="nota-pe">Dano no local − PB; o que passar, − MTC (mínimo 1). Cabeça: dano dobrado. <Fonte fonte={{ pagina: "100–103", nota: "Localização do dano, armadura e MTC." }} /></p>
    </Painel>
  );
}

// ---------- cyberware ----------

export function CyberwareLista({ itens, emp, onChange }: { itens: Cyberware[]; emp: number; onChange: (c: Cyberware[]) => void }) {
  const total = itens.reduce((s, c) => s + c.ch, 0);
  const h = humanidade(emp, total);
  return (
    <Painel legenda="Cyberware">
      {itens.length > 0 && (
        <div className="tabela-rolavel">
          <table className="tab-edit">
            <thead><tr><th>Implante</th><th title="Custo de Humanidade">CH</th><th>Notas</th><th><span className="sr">Ações</span></th></tr></thead>
            <tbody>
              {itens.map((c, i) => (
                <tr key={i}>
                  <td><input style={{ minWidth: 150 }} value={c.nome} maxLength={80} aria-label={`Implante ${i + 1}`} onChange={(e) => onChange(itens.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} /></td>
                  <td style={{ width: 70 }}><input className="num" type="number" min={0} max={100} value={c.ch} aria-label={`Custo de Humanidade do implante ${i + 1}`}
                    onChange={(e) => onChange(itens.map((x, j) => (j === i ? { ...x, ch: Math.max(0, Math.min(100, Math.floor(Number(e.target.value) || 0))) } : x)))} /></td>
                  <td><input style={{ minWidth: 150 }} value={c.notas} maxLength={200} aria-label={`Notas do implante ${i + 1}`} onChange={(e) => onChange(itens.map((x, j) => (j === i ? { ...x, notas: e.target.value } : x)))} /></td>
                  <td><button type="button" className="btn btn-p" onClick={() => onChange(itens.filter((_, j) => j !== i))}>Tirar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" className="btn btn-p" style={{ marginTop: 10 }} disabled={itens.length >= 40} onClick={() => onChange([...itens, { nome: "", ch: 0, notas: "" }])}>
        Adicionar implante
      </button>
      <div className="dado-linha" style={{ marginTop: 12 }}><span>Humanidade perdida</span><b>{total}</b></div>
      <div className="dado-linha"><span>Humanidade atual</span><b>{h.atual} de {h.base}</b></div>
      <div className="dado-linha"><span>EMP atual</span><b>{h.empAtual}{h.empAtual !== emp && ` (era ${emp})`}</b></div>
      <p className="nota-pe" style={{ marginTop: 6 }}>Role o CH de cada implante ao instalar e anote o resultado. <Fonte fonte={FONTE_HUMANIDADE} /></p>
    </Painel>
  );
}

// ---------- histórico ----------

export type Registro = { id: string; autor: string; tipo: string; descricao: string; custo_pe: number | null; quando: string };

export function Historico({ itens }: { itens: Registro[] | null }) {
  return (
    <Painel legenda="Histórico">
      {itens === null ? (
        <p className="nota-pe">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="nota-pe">Nada registrado ainda.</p>
      ) : (
        <ul className="historico">
          {itens.map((r) => (
            <li key={r.id}>
              <time dateTime={r.quando}>{new Date(r.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time>
              <span><b style={{ color: "var(--tinta)", fontWeight: 600 }}>{r.autor}</b> {r.descricao}</span>
              <span className="custo">{r.custo_pe !== null ? `${r.custo_pe} PE` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}
