"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/components/Api";
import { Vazio } from "@/components/Ilustracoes";
import { Painel } from "@/components/Painel";

type Nota = { id: string; titulo: string; texto: string; atualizada: string };

export function Notas() {
  const api = useApi();
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [atual, setAtual] = useState<Nota | null>(null);
  const [estado, setEstado] = useState<"salvo" | "pendente" | "salvando" | "erro">("salvo");
  const [erro, setErro] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendente = useRef<Nota | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<{ notas: Nota[] }>("GET", "/api/notas");
    if (r.ok) setNotas(r.dados.notas);
    else setErro(r.erro);
  }, [api]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = useCallback(async () => {
    clearTimeout(timer.current);
    const n = pendente.current;
    if (!n) return true;
    pendente.current = null;
    setEstado("salvando");
    const r = await api<{ nota: Nota }>("PUT", `/api/notas/${n.id}`, { titulo: n.titulo.trim() || "Sem título", texto: n.texto });
    if (!r.ok) {
      pendente.current = pendente.current ?? n;
      setEstado("erro");
      setErro(r.erro);
      return false;
    }
    setNotas((xs) => (xs ? [r.dados.nota, ...xs.filter((x) => x.id !== n.id)] : xs));
    setEstado(pendente.current ? "pendente" : "salvo");
    return true;
  }, [api]);

  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (pendente.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, []);

  function editar(mudanca: Partial<Nota>) {
    if (!atual) return;
    const n = { ...atual, ...mudanca };
    setAtual(n);
    pendente.current = n;
    setEstado("pendente");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void salvar(), 800);
  }

  async function abrir(n: Nota) {
    if (!(await salvar())) return;
    setAtual(n);
  }

  async function nova() {
    if (!(await salvar())) return;
    const r = await api<{ nota: Nota }>("POST", "/api/notas", { titulo: "Nota nova", texto: "" });
    if (!r.ok) return setErro(r.erro);
    setNotas((xs) => [r.dados.nota, ...(xs ?? [])]);
    setAtual(r.dados.nota);
  }

  async function apagar() {
    if (!atual || !confirm(`Apagar a nota "${atual.titulo}"?`)) return;
    clearTimeout(timer.current);
    pendente.current = null;
    const r = await api("DELETE", `/api/notas/${atual.id}`);
    if (!r.ok) return setErro(r.erro);
    setNotas((xs) => xs?.filter((x) => x.id !== atual.id) ?? null);
    setAtual(null);
    setEstado("salvo");
  }

  return (
    <div className="grid-notas">
      <Painel legenda="Notas">
        <button type="button" className="btn btn-principal" onClick={nova}>Nova nota</button>
        {notas === null ? (
          <p className="nota-pe espaco">Carregando…</p>
        ) : notas.length === 0 ? (
          <div className="vazio espaco"><Vazio /><p>Nenhuma nota ainda.</p></div>
        ) : (
          <ul className="lista-notas">
            {notas.map((n) => (
              <li key={n.id}>
                <button type="button" className={atual?.id === n.id ? "ativa" : undefined} aria-current={atual?.id === n.id} onClick={() => abrir(n)}>
                  <span>{n.titulo}</span>
                  <small>{new Date(n.atualizada).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Painel>
      <Painel legenda={atual ? "Editando" : "Nota"}>
        {atual ? (
          <>
            <div className="linha" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label htmlFor="n-titulo">Título</label>
                <input id="n-titulo" value={atual.titulo} maxLength={120} onChange={(e) => editar({ titulo: e.target.value })} />
              </div>
              <span className={estado === "erro" ? "salvo erro" : "salvo"} role="status">
                {{ salvo: "Salvo", pendente: "Alterado…", salvando: "Salvando…", erro: "Não salvou" }[estado]}
              </span>
            </div>
            <label htmlFor="n-texto" className="sr">Texto da nota</label>
            <textarea id="n-texto" value={atual.texto} maxLength={50000} style={{ minHeight: 360, marginTop: 14 }}
              placeholder="NPCs, tramas, ganchos, devedores do grupo..." onChange={(e) => editar({ texto: e.target.value })} />
            <div className="linha espaco">
              <button type="button" className="btn btn-perigo" onClick={apagar}>Apagar nota</button>
            </div>
          </>
        ) : (
          <p className="nota-pe">Escolha uma nota ou crie uma nova.</p>
        )}
        {erro && <p className="erro" role="alert">{erro}</p>}
      </Painel>
    </div>
  );
}
