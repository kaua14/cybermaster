"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/components/Api";
import { Fonte } from "@/components/Fonte";
import { Painel } from "@/components/Painel";
import { FONTE_PONTOS_MESA, PONTOS_PERSONAGEM } from "@/rules/mesa";
import { CLASSES, CLASSE_POR_ID } from "@/rules/classes";
import { PERICIA_POR_ID } from "@/rules/pericias";

export function NovaFicha({ mestre, jogadores }: { mestre: boolean; jogadores: { id: string; nome: string }[] }) {
  const api = useApi();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [classe, setClasse] = useState("");
  const [jogadorId, setJogadorId] = useState(jogadores[0]?.id ?? "");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const c = CLASSE_POR_ID.get(classe);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOcupado(true);
    const r = await api<{ id: string }>("POST", "/api/fichas", {
      nome,
      classe,
      ...(mestre ? { jogadorId } : {}),
    });
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    router.push(`/fichas/${r.dados.id}`);
  }

  return (
    <form onSubmit={criar}>
      <div className="grid2">
        <Painel legenda="Personagem">
          {mestre && (
            <div className="campo">
              <label htmlFor="n-jogador">Jogador (dono da ficha)</label>
              <select id="n-jogador" value={jogadorId} onChange={(e) => setJogadorId(e.target.value)} required>
                {jogadores.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
          )}
          <div className="campo">
            <label htmlFor="n-nome">Nome / Handle</label>
            <input id="n-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} required autoComplete="off" />
          </div>
          <div className="campo">
            <label htmlFor="n-classe">Classe</label>
            <select id="n-classe" value={classe} onChange={(e) => setClasse(e.target.value)} required>
              <option value="" disabled>Escolha…</option>
              {CLASSES.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </div>
          {c && (
            <div className="terminal" style={{ marginTop: 6 }}>
              {"◆ "}{PERICIA_POR_ID.get(c.habilidade)?.nome}
              {"\n"}Perícias Profissionais: 40 pontos entre{" "}
              {c.pacote.map((v) => (typeof v === "string" ? PERICIA_POR_ID.get(v)?.nome : v.rotulo)).join(", ")}.
            </div>
          )}
        </Painel>

        <Painel legenda="Atributos">
          <div className="terminal">
            {PONTOS_PERSONAGEM} pontos para distribuir entre os nove atributos.{"\n"}Cada atributo vai de 2 a 10. Você distribui na ficha.
          </div>
          <p className="nota-pe" style={{ marginTop: 10 }}>Regra da mesa: todos os personagens têm {PONTOS_PERSONAGEM} pontos. <Fonte fonte={FONTE_PONTOS_MESA} /></p>
        </Painel>
      </div>
      <div className="linha espaco">
        <button className="btn btn-principal" disabled={ocupado || !classe}>Criar ficha</button>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </div>
    </form>
  );
}
