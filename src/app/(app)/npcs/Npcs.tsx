"use client";
import { useState } from "react";
import { useApi } from "@/components/Api";
import { Painel } from "@/components/Painel";
import { gerarGancho, gerarNpc, npcComoTexto, TIPOS_NPC, type TipoNpc } from "@/rules/geradores";

export function Npcs() {
  const api = useApi();
  const [npc, setNpc] = useState<string | null>(null);
  const [gancho, setGancho] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function paraNotas(titulo: string, texto: string) {
    const r = await api("POST", "/api/notas", { titulo, texto });
    setMsg(r.ok ? { ok: true, texto: "Guardado nas notas." } : { ok: false, texto: r.erro });
  }

  return (
    <>
      <Painel legenda="NPC instantâneo">
        <div className="linha">
          {(Object.keys(TIPOS_NPC) as TipoNpc[]).map((t, i) => (
            <button key={t} type="button" className={i === 0 ? "btn btn-principal" : "btn"} onClick={() => { setNpc(npcComoTexto(gerarNpc(t))); setMsg(null); }}>
              {TIPOS_NPC[t]}
            </button>
          ))}
        </div>
        <div className="terminal espaco" style={{ minHeight: 190 }} aria-live="polite">{npc ?? "Escolha um tipo."}</div>
        {npc && (
          <div className="linha" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-p" onClick={() => paraNotas(`NPC: ${npc.split("\n")[0].replace("NOME: ", "")}`, npc)}>Guardar nas notas</button>
          </div>
        )}
      </Painel>
      <Painel legenda="Gancho de cena">
        <p className="nota-pe" style={{ marginBottom: 12 }}>Para quando a sessão travar.</p>
        <button type="button" className="btn" onClick={() => { setGancho(gerarGancho()); setMsg(null); }}>Gerar gancho</button>
        <div className="terminal espaco" style={{ minHeight: 60 }} aria-live="polite">{gancho ?? "—"}</div>
        {gancho && (
          <div className="linha" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-p" onClick={() => paraNotas("Gancho", gancho)}>Guardar nas notas</button>
          </div>
        )}
      </Painel>
      {msg && <p className={msg.ok ? "ok" : "erro"} role="status">{msg.texto}</p>}
    </>
  );
}
