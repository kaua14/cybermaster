"use client";
import { useMemo, useState } from "react";
import { Fonte } from "@/components/Fonte";
import { Painel } from "@/components/Painel";
import { SIGLAS, type Atributos, type Sigla } from "@/rules/atributos";
import { CLASSE_POR_ID, FONTE_CARREIRA, FONTE_OPCIONAIS } from "@/rules/classes";
import { FONTE_GANHO_PE, FONTE_PE } from "@/rules/experiencia";
import { chavePericia, elegibilidade, infoPericia, podeCarreira, type PericiaFicha, type Resumo } from "@/rules/ficha";
import { NIVEL_MAX, PERICIAS, PERICIA_POR_ID } from "@/rules/pericias";

type Props = {
  classe: string;
  pericias: PericiaFicha[];
  atributos: Atributos;
  /** REF, INT e AuCon com o efeito do ferimento. */
  feridos: Pick<Atributos, "REF" | "INT" | "AuCon">;
  resumo: Resumo;
  travada: boolean;
  mestre: boolean;
  onChange: (pericias: PericiaFicha[]) => void;
  onSubir: (p: PericiaFicha) => void;
  onDarPe: (p: { chave: string; complemento?: string; quantidade: number; motivo: string }) => Promise<string | null>;
};

const GRUPOS: { titulo: string; filtro: (id: string, atr: Sigla | null, especial: boolean) => boolean }[] = [
  { titulo: "Habilidades especiais", filtro: (_i, _a, e) => e },
  ...SIGLAS.map((s) => ({ titulo: s, filtro: (_i: string, a: Sigla | null, e: boolean) => !e && a === s })),
];

function Contador({ rotulo, usados, total, fonte }: { rotulo: string; usados: number; total: number; fonte: Parameters<typeof Fonte>[0]["fonte"] }) {
  const resta = total - usados;
  return (
    <span className="linha" style={{ gap: 6 }}>
      <span className={resta < 0 ? "pontos estourou" : "pontos"}>{rotulo}: restam {resta} de {total}</span>
      <Fonte fonte={fonte} />
    </span>
  );
}

export function Pericias(p: Props) {
  const el = useMemo(() => elegibilidade(CLASSE_POR_ID.get(p.classe)), [p.classe]);
  const [nova, setNova] = useState("");
  const [complemento, setComplemento] = useState("");
  const [livre, setLivre] = useState({ nome: "", atributo: "INT" as Sigla, mult: 1 });

  const linhas = useMemo(() => {
    const ordem = (x: PericiaFicha) => {
      const b = PERICIA_POR_ID.get(x.chave);
      if (b?.especial) return 0;
      if (podeCarreira(el, x.chave)) return 1;
      return 2;
    };
    return p.pericias
      .map((x, i) => ({ x, i, info: infoPericia(x) }))
      .sort((a, b) => ordem(a.x) - ordem(b.x) || a.info.nome.localeCompare(b.info.nome, "pt-BR"));
  }, [p.pericias, el]);

  function atualizar(i: number, mudanca: Partial<PericiaFicha>) {
    p.onChange(p.pericias.map((x, j) => (j === i ? { ...x, ...mudanca } : x)));
  }

  const base = PERICIA_POR_ID.get(nova);
  const jaTem = (chave: string, comp?: string) => p.pericias.some((x) => chavePericia(x) === chavePericia({ chave, complemento: comp || undefined }));

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    const comp = base.complemento ? complemento.trim() : undefined;
    if (base.complemento && !comp) return;
    if (jaTem(base.id, comp)) return;
    p.onChange([...p.pericias, { chave: base.id, complemento: comp, carreira: 0, opcional: 0, melhoria: 0, pe: 0 }]);
    setNova("");
    setComplemento("");
  }

  function adicionarLivre(e: React.FormEvent) {
    e.preventDefault();
    const nome = livre.nome.trim();
    if (!nome || jaTem("livre", nome)) return;
    p.onChange([...p.pericias, { chave: "livre", complemento: nome, atributo: livre.atributo, mult: livre.mult, carreira: 0, opcional: 0, melhoria: 0, pe: 0 }]);
    setLivre({ ...livre, nome: "" });
  }

  const atr = (s: Sigla | null) => (s === null ? 0 : s === "REF" || s === "INT" || s === "AuCon" ? p.feridos[s] : p.atributos[s]);

  return (
    <Painel legenda="Perícias">
      <div className="linha" style={{ gap: 10, marginBottom: 6 }}>
        <Contador rotulo="Carreira" usados={p.resumo.carreira.usados} total={p.resumo.carreira.total!} fonte={FONTE_CARREIRA} />
        <Contador rotulo="Opcionais" usados={p.resumo.opcionais.usados} total={p.resumo.opcionais.total!} fonte={FONTE_OPCIONAIS} />
      </div>
      <p className="nota-pe" style={{ margin: "8px 0 4px" }}>
        Teste = 1d10 + atributo + nível. Barra dourada à esquerda: Perícia Profissional da classe.
        {p.travada && " Criação concluída: os pontos só mudam com PE."}
      </p>

      <div className="tabela-rolavel">
        <table className="tab-pericias">
          <thead>
            <tr>
              <th>Perícia</th>
              <th title="Pontos de carreira">Carr.</th>
              <th title="Pontos opcionais">Opc.</th>
              <th>Nível</th>
              <th>Teste</th>
              <th>PE <Fonte fonte={FONTE_PE} /></th>
              <th><span className="sr">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ x, i, info }) => {
              const pro = podeCarreira(el, x.chave);
              const podeSubir = info.custo !== null && x.pe >= info.custo;
              // Só sai da lista o que não tem nível nem PE.
              const removivel = info.nivel === 0 && x.pe === 0;
              const id = `per-${i}`;
              return (
                <tr key={chavePericia(x)} className={pro ? "pro" : undefined}>
                  <td className="nome-pericia">
                    <div id={id}>{info.especial && "◆ "}{info.nome}</div>
                    <div className="meta">
                      {info.atributo ?? "sem atributo"}{info.mult > 1 && ` · ×${info.mult}`}{" "}
                      {info.fonte && <Fonte fonte={info.fonte} />}
                    </div>
                  </td>
                  <td>
                    <input className="num" type="number" min={0} max={NIVEL_MAX} value={x.carreira} aria-label={`Pontos de carreira de ${info.nome}`}
                      disabled={p.travada || !pro} onChange={(e) => atualizar(i, { carreira: limitar(e.target.value) })} />
                  </td>
                  <td>
                    <input className="num" type="number" min={0} max={NIVEL_MAX} value={x.opcional} aria-label={`Pontos opcionais de ${info.nome}`}
                      disabled={p.travada || el.fixas.has(x.chave)} onChange={(e) => atualizar(i, { opcional: limitar(e.target.value) })} />
                  </td>
                  <td className="nivel">+{info.nivel}</td>
                  <td className="meta" style={{ whiteSpace: "nowrap" }}>{info.atributo === null ? `+${info.nivel}` : `1d10 + ${atr(info.atributo) + info.nivel}`}</td>
                  <td className="meta" style={{ whiteSpace: "nowrap" }}>
                    {x.pe}{info.custo !== null && ` / ${info.custo}`}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {podeSubir && <button type="button" className="btn btn-principal btn-p" onClick={() => p.onSubir(x)}>Subir</button>}{" "}
                    {removivel && (
                      <button type="button" className="btn btn-p" aria-label={`Tirar ${info.nome}`}
                        onClick={() => p.onChange(p.pericias.filter((_, j) => j !== i))}>Tirar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-titulo">Adicionar perícia</div>
      <form className="linha" style={{ alignItems: "flex-end" }} onSubmit={adicionar}>
        <div style={{ flex: 2, minWidth: 220 }}>
          <label htmlFor="add-pericia">Perícia</label>
          <SeletorPericia id="add-pericia" valor={nova} onChange={setNova} />
        </div>
        {base?.complemento && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="add-comp">{base.complemento}</label>
            <input id="add-comp" value={complemento} onChange={(e) => setComplemento(e.target.value)} maxLength={60} required />
          </div>
        )}
        <button className="btn btn-p" disabled={!base}>Adicionar</button>
      </form>
      <details style={{ marginTop: 12 }}>
        <summary className="rotulo" style={{ cursor: "pointer" }}>Perícia que não está na lista</summary>
        <form className="linha" style={{ alignItems: "flex-end", marginTop: 8 }} onSubmit={adicionarLivre}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label htmlFor="livre-nome">Nome</label>
            <input id="livre-nome" value={livre.nome} onChange={(e) => setLivre({ ...livre, nome: e.target.value })} maxLength={60} />
          </div>
          <div style={{ width: 90 }}>
            <label htmlFor="livre-atr">Atributo</label>
            <select id="livre-atr" value={livre.atributo} onChange={(e) => setLivre({ ...livre, atributo: e.target.value as Sigla })}>
              {SIGLAS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ width: 70 }}>
            <label htmlFor="livre-mult">Mult. PE</label>
            <input id="livre-mult" className="num" type="number" min={1} max={5} value={livre.mult} onChange={(e) => setLivre({ ...livre, mult: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} />
          </div>
          <button className="btn btn-p">Adicionar</button>
        </form>
        <p className="nota-pe" style={{ marginTop: 6 }}>O livro permite criar perícias novas com o mestre (p. 54).</p>
      </details>

      {p.mestre && <DarPe pericias={p.pericias} onDarPe={p.onDarPe} />}
    </Painel>
  );
}

function SeletorPericia({ id, valor, onChange, extra }: { id: string; valor: string; onChange: (v: string) => void; extra?: React.ReactNode }) {
  return (
    <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">Escolha…</option>
      {extra}
      {GRUPOS.map((g) => (
        <optgroup key={g.titulo} label={g.titulo}>
          {PERICIAS.filter((x) => g.filtro(x.id, x.atributo, !!x.especial)).map((x) => (
            <option key={x.id} value={x.id}>{x.nome}{x.mult > 1 ? ` (×${x.mult})` : ""}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function DarPe({ pericias, onDarPe }: { pericias: PericiaFicha[]; onDarPe: Props["onDarPe"] }) {
  const [alvo, setAlvo] = useState("");
  const [comp, setComp] = useState("");
  const [qtd, setQtd] = useState(1);
  const [motivo, setMotivo] = useState("experiencia");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  // "f:<índice>" = perícia já na ficha; senão, id da lista.
  const daFicha = alvo.startsWith("f:") ? pericias[Number(alvo.slice(2))] : undefined;
  const base = daFicha ? undefined : PERICIA_POR_ID.get(alvo);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const chave = daFicha?.chave ?? base?.id;
    if (!chave) return;
    const complemento = daFicha?.complemento ?? (base?.complemento ? comp.trim() : undefined);
    const erro = await onDarPe({ chave, complemento, quantidade: qtd, motivo });
    setMsg(erro ? { ok: false, texto: erro } : { ok: true, texto: `+${qtd} PE dados.` });
  }

  return (
    <>
      <div className="card-titulo">Dar PE (mestre) <Fonte fonte={FONTE_GANHO_PE} /></div>
      <form className="linha" style={{ alignItems: "flex-end" }} onSubmit={enviar}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label htmlFor="pe-pericia">Perícia usada</label>
          <SeletorPericia id="pe-pericia" valor={alvo} onChange={(v) => { setAlvo(v); setMsg(null); }}
            extra={
              <optgroup label="Na ficha">
                {pericias.map((x, i) => <option key={chavePericia(x)} value={`f:${i}`}>{infoPericia(x).nome}</option>)}
              </optgroup>
            } />
        </div>
        {base?.complemento && (
          <div style={{ flex: 1, minWidth: 120 }}>
            <label htmlFor="pe-comp">{base.complemento}</label>
            <input id="pe-comp" value={comp} onChange={(e) => setComp(e.target.value)} required maxLength={60} />
          </div>
        )}
        <div style={{ width: 80 }}>
          <label htmlFor="pe-qtd">PE</label>
          <input id="pe-qtd" className="num" type="number" min={1} max={100} value={qtd} onChange={(e) => setQtd(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label htmlFor="pe-motivo">Como aprendeu</label>
          <select id="pe-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="experiencia">Experiência</option>
            <option value="ensino">Professor</option>
            <option value="estudo">Estudo (até +2)</option>
          </select>
        </div>
        <button className="btn btn-principal btn-p" disabled={!daFicha && !base}>Dar PE</button>
      </form>
      {msg && <p className={msg.ok ? "ok" : "erro"} role="status">{msg.texto}</p>}
    </>
  );
}

const limitar = (v: string) => Math.max(0, Math.min(NIVEL_MAX, Math.floor(Number(v) || 0)));
