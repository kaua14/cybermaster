"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/components/Api";
import { Fonte } from "@/components/Fonte";
import { Painel } from "@/components/Painel";
import { CINEMATOGRAFICO, FONTE_METODOS, METODOS, type Metodo } from "@/rules/atributos";
import { CLASSES, CLASSE_POR_ID } from "@/rules/classes";
import { PERICIA_POR_ID } from "@/rules/pericias";

export function NovaFicha({ mestre, jogadores }: { mestre: boolean; jogadores: { id: string; nome: string }[] }) {
  const api = useApi();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [classe, setClasse] = useState("");
  const [jogadorId, setJogadorId] = useState(jogadores[0]?.id ?? "");
  const [metodo, setMetodo] = useState<Metodo>(mestre ? "cinematografico" : "aleatorio");
  const [pontos, setPontos] = useState<string>(mestre ? "60" : "");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const metodos = (Object.keys(METODOS) as Metodo[]).filter((m) => mestre || !METODOS[m].soMestre);
  const c = CLASSE_POR_ID.get(classe);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOcupado(true);
    const r = await api<{ id: string }>("POST", "/api/fichas", {
      nome,
      classe,
      metodo,
      pontos: metodo === "rapido" ? null : Number(pontos) || null,
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
          <fieldset style={{ border: 0 }}>
            <legend className="rotulo" style={{ marginBottom: 8 }}>Método <Fonte fonte={FONTE_METODOS} /></legend>
            {metodos.map((m) => (
              <label key={m} className="linha" style={{ alignItems: "flex-start", textTransform: "none", letterSpacing: 0, font: "15px/1.45 var(--f-corpo)", color: "var(--texto)", marginBottom: 10, cursor: "pointer" }}>
                <input type="radio" name="metodo" value={m} checked={metodo === m} style={{ width: 18, minHeight: 0, marginTop: 4 }}
                  onChange={() => { setMetodo(m); setPontos(m === "cinematografico" ? "60" : ""); }} />
                <span style={{ flex: 1 }}>
                  <b style={{ color: "var(--tinta)" }}>{METODOS[m].nome}.</b> {METODOS[m].resumo}
                </span>
              </label>
            ))}
          </fieldset>
          {metodo === "aleatorio" && (
            <div className="campo">
              <label htmlFor="n-pontos">Total dos 9d10 que você rolou</label>
              <input id="n-pontos" type="number" min={18} max={90} value={pontos} onChange={(e) => setPontos(e.target.value)} required />
              <p className="nota-pe" style={{ marginTop: 6 }}>Role os dados na mesa e anote o total. Cada atributo fica entre 2 e 10.</p>
            </div>
          )}
          {metodo === "cinematografico" && (
            <div className="campo">
              <label htmlFor="n-pontos-c">Pontos de personagem</label>
              <select id="n-pontos-c" value={pontos} onChange={(e) => setPontos(e.target.value)}>
                {CINEMATOGRAFICO.map((x) => <option key={x.pontos} value={x.pontos}>{x.pontos}: {x.nome}</option>)}
              </select>
            </div>
          )}
          {metodo === "rapido" && <p className="nota-pe">Você digita os nove resultados direto nos atributos, na ficha.</p>}
        </Painel>
      </div>
      <div className="linha espaco">
        <button className="btn btn-principal" disabled={ocupado || !classe}>Criar ficha</button>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </div>
    </form>
  );
}
