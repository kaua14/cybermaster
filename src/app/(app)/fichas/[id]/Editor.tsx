"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/components/Api";
import { Fonte } from "@/components/Fonte";
import { Painel } from "@/components/Painel";
import { ATRIBUTOS, CINEMATOGRAFICO, FONTE_ATRIBUTOS, FONTE_METODOS, METODOS, SIGLAS, type Metodo, type Sigla } from "@/rules/atributos";
import { CLASSES, CLASSE_POR_ID } from "@/rules/classes";
import { derivados } from "@/rules/derivados";
import { atributosFeridos } from "@/rules/ferimentos";
import { custoCyberware, resumo, type FichaEditavel, type PericiaFicha } from "@/rules/ficha";
import { PERICIA_POR_ID } from "@/rules/pericias";
import { Pericias } from "./Pericias";
import { Armadura, Armas, CyberwareLista, Ferimentos, Historico, type Registro } from "./Secoes";
import { useFicha } from "./useFicha";

type Props = {
  id: string;
  inicial: FichaEditavel;
  version: number;
  dano: number;
  concluida: boolean;
  dono: string;
  mestre: boolean;
};

const ROTULO_SALVO = { salvo: "Salvo", pendente: "Alterado…", salvando: "Salvando…", erro: "Não salvou", conflito: "Conflito" } as const;

export function Editor(props: Props) {
  const api = useApi();
  const router = useRouter();
  const url = `/api/fichas/${props.id}`;
  const { ficha, alterar, estado, erro, salvarAgora, aplicarPericia, definirVersao } = useFicha(props.id, props.inicial, props.version);
  const [dano, setDano] = useState(props.dano);
  const [concluida, setConcluida] = useState(props.concluida);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string; lista?: string[] } | null>(null);
  const [historico, setHistorico] = useState<Registro[] | null>(null);

  const d = ficha.dados;
  const travada = concluida && !props.mestre;
  const r = useMemo(() => resumo(ficha.classe, d), [ficha.classe, d]);
  const feridos = useMemo(() => atributosFeridos(d.atributos, dano), [d.atributos, dano]);
  const classe = CLASSE_POR_ID.get(ficha.classe);

  const carregarHistorico = useCallback(async () => {
    const h = await api<{ historico: Registro[] }>("GET", `${url}/historico`);
    if (h.ok) setHistorico(h.dados.historico);
  }, [api, url]);
  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  // ---------- dano: salva sozinho, separado da ficha ----------
  const danoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function mudarDano(n: number) {
    setDano(n);
    clearTimeout(danoTimer.current);
    danoTimer.current = setTimeout(async () => {
      const res = await api("POST", `${url}/dano`, { dano: n });
      if (!res.ok) setAviso({ ok: false, texto: `Dano não salvou: ${res.erro}` });
    }, 300);
  }

  // ---------- ações no servidor ----------
  async function subir(p: PericiaFicha) {
    if (!(await salvarAgora())) return;
    const res = await api<{ version: number; pericia: PericiaFicha }>("POST", `${url}/subir`, { chave: p.chave, complemento: p.complemento });
    if (!res.ok) return setAviso({ ok: false, texto: res.erro });
    aplicarPericia(res.dados.pericia, res.dados.version);
    setAviso(null);
    void carregarHistorico();
  }

  async function darPe(x: { chave: string; complemento?: string; quantidade: number; motivo: string }): Promise<string | null> {
    if (!(await salvarAgora())) return "Salve a ficha antes.";
    const res = await api<{ version: number; pericia: PericiaFicha }>("POST", `${url}/pe`, x);
    if (!res.ok) return res.erro;
    aplicarPericia(res.dados.pericia, res.dados.version);
    void carregarHistorico();
    return null;
  }

  async function concluir() {
    if (!(await salvarAgora())) return;
    const res = await api<{ ok: boolean }>("POST", `${url}/concluir`);
    if (!res.ok) {
      const lista = r.problemas;
      return setAviso({ ok: false, texto: res.erro, lista });
    }
    await recarregarVersao();
    setConcluida(true);
    setAviso({ ok: true, texto: "Criação concluída. Daqui em diante, as perícias sobem com PE." });
    void carregarHistorico();
  }

  async function reabrir() {
    if (!confirm("Reabrir a criação? O jogador volta a poder mexer em atributos e pontos de perícia.")) return;
    if (!(await salvarAgora())) return;
    const res = await api("POST", `${url}/reabrir`);
    if (!res.ok) return setAviso({ ok: false, texto: res.erro });
    await recarregarVersao();
    setConcluida(false);
    void carregarHistorico();
  }

  async function recarregarVersao() {
    const f = await api<{ ficha: { version: number } }>("GET", url);
    if (f.ok) definirVersao(f.dados.ficha.version);
  }

  async function apagar() {
    if (!confirm(`Apagar a ficha de ${ficha.nome}? Não tem volta.`)) return;
    const res = await api("DELETE", url);
    if (!res.ok) return setAviso({ ok: false, texto: res.erro });
    router.replace("/");
    router.refresh();
  }

  // ---------- atalhos de edição ----------
  const set = <K extends keyof FichaEditavel["dados"]>(k: K, v: FichaEditavel["dados"][K]) => alterar((f) => ({ ...f, dados: { ...f.dados, [k]: v } }));
  const setAtributo = (s: Sigla, v: number) =>
    alterar((f) => ({ ...f, dados: { ...f.dados, atributos: { ...f.dados.atributos, [s]: Math.max(2, Math.min(10, Math.floor(v) || 2)) } } }));

  const metodosPermitidos = (Object.keys(METODOS) as Metodo[]).filter((m) => props.mestre || !METODOS[m].soMestre || m === d.metodo);
  const metodoTravado = travada || (!props.mestre && d.metodo === "cinematografico");
  const restamAtr = r.atributos.total === null ? null : r.atributos.total - r.atributos.usados;

  return (
    <>
      <div className="linha" style={{ justifyContent: "space-between", marginBottom: 18 }}>
        <span className="rotulo" style={{ margin: 0 }}>
          Jogador: <b style={{ color: "var(--tinta)" }}>{props.dono}</b> · Criação: <b style={{ color: "var(--tinta)" }}>{concluida ? "concluída" : "em andamento"}</b>
        </span>
        <span className={estado === "erro" || estado === "conflito" ? "salvo erro" : "salvo"} role="status" aria-live="polite">
          {ROTULO_SALVO[estado]}
        </span>
      </div>
      {(estado === "erro" || estado === "conflito") && (
        <div className="terminal" style={{ borderColor: "var(--vermelho)", color: "var(--vermelho)", marginBottom: 20 }} role="alert">
          {erro}
          {estado === "conflito" && (
            <>
              {"\n"}
              <button type="button" className="btn btn-p" style={{ marginTop: 8 }} onClick={() => location.reload()}>Recarregar</button>
            </>
          )}
        </div>
      )}

      <div className="grid2">
        <Painel legenda="Personagem">
          <div className="linha campo">
            <div style={{ flex: 2, minWidth: 150 }}>
              <label htmlFor="f-nome">Nome / Handle</label>
              <input id="f-nome" value={ficha.nome} maxLength={60} onChange={(e) => alterar((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 70 }}>
              <label htmlFor="f-idade">Idade</label>
              <input id="f-idade" type="number" min={0} max={200} value={d.idade ?? ""} placeholder="—"
                onChange={(e) => set("idade", e.target.value === "" ? null : Math.max(0, Math.min(200, Math.floor(Number(e.target.value) || 0))))} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="f-classe">Classe</label>
            <select id="f-classe" value={ficha.classe} disabled={travada}
              onChange={(e) => {
                const nova = e.target.value;
                if (r.carreira.usados > 0 && !confirm("Trocar de classe muda as Perícias Profissionais. Os pontos de carreira que não valerem mais vão aparecer como problema. Trocar?")) return;
                alterar((f) => ({ ...f, classe: nova }));
              }}>
              {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="linha campo">
            <div style={{ flex: 2, minWidth: 150 }}>
              <label htmlFor="f-metodo">Método dos atributos</label>
              <select id="f-metodo" value={d.metodo} disabled={metodoTravado}
                onChange={(e) => {
                  const m = e.target.value as Metodo;
                  alterar((f) => ({ ...f, dados: { ...f.dados, metodo: m, pontos: m === "rapido" ? null : (f.dados.pontos ?? (m === "cinematografico" ? 60 : null)) } }));
                }}>
                {metodosPermitidos.map((m) => <option key={m} value={m}>{METODOS[m].nome}</option>)}
              </select>
            </div>
            {d.metodo !== "rapido" && (
              <div style={{ flex: 1, minWidth: 90 }}>
                <label htmlFor="f-pontos">Pontos</label>
                {d.metodo === "cinematografico" && props.mestre ? (
                  <select id="f-pontos" value={d.pontos ?? 60} onChange={(e) => set("pontos", Number(e.target.value))}>
                    {CINEMATOGRAFICO.map((x) => <option key={x.pontos} value={x.pontos}>{x.pontos}: {x.nome}</option>)}
                    {!CINEMATOGRAFICO.some((x) => x.pontos === d.pontos) && d.pontos !== null && <option value={d.pontos}>{d.pontos}</option>}
                  </select>
                ) : (
                  <input id="f-pontos" type="number" min={18} max={90} value={d.pontos ?? ""} disabled={metodoTravado}
                    onChange={(e) => set("pontos", e.target.value === "" ? null : Math.max(18, Math.min(90, Math.floor(Number(e.target.value) || 18))))} />
                )}
              </div>
            )}
          </div>
          <p className="nota-pe">{METODOS[d.metodo].resumo} <Fonte fonte={FONTE_METODOS} /></p>
          {classe && (
            <>
              <div className="card-titulo">Habilidade especial</div>
              <div className="terminal">◆ {PERICIA_POR_ID.get(classe.habilidade)?.nome}{"\n"}Fica na lista de perícias e recebe pontos de carreira.</div>
            </>
          )}
        </Painel>

        <Painel legenda="Atributos">
          <div className="linha" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <Fonte fonte={FONTE_ATRIBUTOS} />
            {restamAtr === null ? (
              <span className="pontos neutro">Rápido: sem total</span>
            ) : (
              <span className={restamAtr < 0 ? "pontos estourou" : "pontos"}>Restam {restamAtr}</span>
            )}
          </div>
          {SIGLAS.map((s) => {
            const ferido = (s === "REF" || s === "INT" || s === "AuCon") && feridos[s] !== d.atributos[s] ? feridos[s] : null;
            return (
              <div className="stat-row" key={s}>
                <b title={ATRIBUTOS[s].nome}>
                  {s}
                  {ferido !== null && <span className="ferido">→{ferido}</span>}
                  <small>{ATRIBUTOS[s].nome}</small>
                </b>
                <input type="range" min={2} max={10} value={d.atributos[s]} disabled={travada} aria-label={ATRIBUTOS[s].nome}
                  onChange={(e) => setAtributo(s, Number(e.target.value))} />
                <input type="number" min={2} max={10} value={d.atributos[s]} disabled={travada} aria-label={`${ATRIBUTOS[s].nome} (número)`}
                  onChange={(e) => setAtributo(s, Number(e.target.value))} />
              </div>
            );
          })}
        </Painel>
      </div>

      <div className="espaco"><Ferimentos dano={dano} tco={d.atributos.TCO} onChange={mudarDano} /></div>

      <div className="espaco">
        <Pericias
          classe={ficha.classe}
          pericias={d.pericias}
          atributos={d.atributos}
          feridos={feridos}
          resumo={r}
          travada={travada}
          mestre={props.mestre}
          onChange={(p) => set("pericias", p)}
          onSubir={subir}
          onDarPe={darPe}
        />
      </div>

      <div className="espaco"><Armas armas={d.armas} onChange={(a) => set("armas", a)} /></div>

      <div className="grid2 espaco">
        <Painel legenda="Derivados">
          {derivados(d.atributos, custoCyberware(d)).map((x) => (
            <div className="dado-linha" key={x.id}>
              <span>{x.rotulo} <Fonte fonte={x.fonte} /></span>
              <b>{x.valor}</b>
            </div>
          ))}
        </Painel>
        <Armadura armadura={d.armadura} onChange={(a) => set("armadura", a)} />
      </div>

      <div className="grid2 espaco">
        <CyberwareLista itens={d.cyberware} emp={d.atributos.EMP} onChange={(c) => set("cyberware", c)} />

        <Painel legenda="Equipamento e dinheiro">
          <div className="campo">
            <label htmlFor="f-dinheiro">Dinheiro (eurodólares)</label>
            <input id="f-dinheiro" type="number" min={0} value={d.dinheiro}
              onChange={(e) => set("dinheiro", Math.max(0, Math.min(1_000_000_000, Math.floor(Number(e.target.value) || 0))))} />
          </div>
          <label htmlFor="f-equip">Equipamento</label>
          <textarea id="f-equip" value={d.equipamento} maxLength={4000} onChange={(e) => set("equipamento", e.target.value)} />
        </Painel>
      </div>

      <div className="espaco">
        <Painel legenda="História e contatos">
          <label htmlFor="f-hist" className="sr">História e contatos</label>
          <textarea id="f-hist" value={d.historia} maxLength={8000} style={{ minHeight: 230 }} onChange={(e) => set("historia", e.target.value)}
            placeholder="Origem, família, amigos, inimigos, amores…" />
        </Painel>
      </div>

      <div className="espaco">
        <Painel legenda="Ficha">
          {!concluida && (
            <>
              {r.problemas.length > 0 ? (
                <>
                  <p>Antes de concluir a criação:</p>
                  <ul className="problemas">{r.problemas.map((x) => <li key={x}>{x}</li>)}</ul>
                </>
              ) : (
                <p>Tudo dentro dos limites. Ao concluir, atributos e pontos de perícia ficam fixos; daí em diante as perícias sobem com PE.</p>
              )}
            </>
          )}
          {aviso && (
            <div className={aviso.ok ? "ok" : "erro"} role="status">
              {aviso.texto}
              {aviso.lista && aviso.lista.length > 0 && <ul className="problemas">{aviso.lista.map((x) => <li key={x}>{x}</li>)}</ul>}
            </div>
          )}
          <div className="linha espaco">
            {!concluida && <button type="button" className="btn btn-principal" disabled={r.problemas.length > 0} onClick={concluir}>Concluir criação</button>}
            {concluida && props.mestre && <button type="button" className="btn" onClick={reabrir}>Reabrir criação</button>}
            <button type="button" className="btn btn-perigo" onClick={apagar}>Apagar ficha</button>
          </div>
        </Painel>
      </div>

      <div className="espaco"><Historico itens={historico} /></div>
    </>
  );
}
