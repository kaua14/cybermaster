"use client";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/components/Api";
import { Painel } from "@/components/Painel";

type Jogador = { id: string; nome: string; ativo: boolean; convite_expira: string | null; temporaria_expira: string | null };
type Convite = { nome: string; codigo: string; expira: string; tipo: "convite" | "temporaria" };

const data = (s: string) => new Date(s).toLocaleDateString("pt-BR");
const dataHora = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function Jogadores() {
  const api = useApi();
  const [lista, setLista] = useState<Jogador[] | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [convite, setConvite] = useState<Convite | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const r = await api<{ jogadores: Jogador[] }>("GET", "/api/jogadores");
    if (r.ok) setLista(r.dados.jogadores);
    else setErro(r.erro);
  }, [api]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOcupado(true);
    const r = await api<{ codigo: string; expira: string }>("POST", "/api/jogadores", { nome });
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setConvite({ nome: nome.trim(), ...r.dados, tipo: "convite" });
    setNome("");
    carregar();
  }

  async function novoConvite(j: Jogador) {
    const aviso = j.ativo
      ? `Invalidar a senha de ${j.nome} e gerar um convite novo? Ele sai de todas as sessões.`
      : `Gerar um convite novo para ${j.nome}? O código anterior deixa de valer.`;
    if (!confirm(aviso)) return;
    setErro("");
    const r = await api<{ codigo: string; expira: string }>("POST", `/api/jogadores/${j.id}/convite`);
    if (!r.ok) return setErro(r.erro);
    setConvite({ nome: j.nome, ...r.dados, tipo: "convite" });
    carregar();
  }

  async function temporaria(j: Jogador) {
    if (!confirm(`Trocar a senha de ${j.nome} por uma temporária? Ele sai de todas as sessões e cria uma senha nova no próximo login.`)) return;
    setErro("");
    const r = await api<{ senha: string; expira: string }>("POST", `/api/jogadores/${j.id}/senha-temporaria`);
    if (!r.ok) return setErro(r.erro);
    setConvite({ nome: j.nome, codigo: r.dados.senha, expira: r.dados.expira, tipo: "temporaria" });
    carregar();
  }

  return (
    <>
      <Painel legenda="Convidar">
        <form onSubmit={convidar} className="linha" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="j-nome">Nome do jogador</label>
            <input id="j-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} required autoComplete="off" />
          </div>
          <button className="btn btn-principal" disabled={ocupado}>Gerar convite</button>
        </form>
        {erro && <p className="erro" role="alert">{erro}</p>}
        {convite && (
          <div className="espaco">
            <div className="card-titulo" style={{ marginTop: 0 }}>{convite.tipo === "convite" ? "Código" : "Senha temporária"} de {convite.nome}</div>
            <div className="terminal">
              <span className="codigo">{convite.codigo}</span>
              {convite.tipo === "convite"
                ? `\nVale até ${data(convite.expira)}, uma vez só. Ele entra em “Primeiro acesso” na tela de login.`
                : `\nVale até ${dataHora(convite.expira)}. Ele entra com o nome e esta senha e cria uma senha nova na hora.`}
              {"\n"}Anote agora: não aparece de novo.
            </div>
          </div>
        )}
      </Painel>

      <Painel legenda="Na mesa">
        {lista === null ? (
          <p className="nota-pe">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="nota-pe">Nenhum jogador convidado.</p>
        ) : (
          <div className="tabela-rolavel">
            <table>
              <thead>
                <tr><th>Jogador</th><th>Situação</th><th><span className="sr">Ações</span></th></tr>
              </thead>
              <tbody>
                {lista.map((j) => (
                  <tr key={j.id}>
                    <td>{j.nome}</td>
                    <td>
                      {j.temporaria_expira ? (
                        <span className="etiqueta cinza">Temporária até {dataHora(j.temporaria_expira)}</span>
                      ) : j.ativo ? (
                        <span className="etiqueta ouro">Senha criada</span>
                      ) : j.convite_expira ? (
                        <span className="etiqueta cinza">Convite até {data(j.convite_expira)}</span>
                      ) : (
                        <span className="etiqueta cinza">Convite vencido</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="linha" style={{ justifyContent: "flex-end" }}>
                        <button className="btn btn-p" onClick={() => temporaria(j)}>Senha temporária</button>
                        <button className={j.ativo ? "btn btn-perigo btn-p" : "btn btn-p"} onClick={() => novoConvite(j)}>
                          {j.ativo ? "Invalidar senha" : "Novo convite"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>
    </>
  );
}
