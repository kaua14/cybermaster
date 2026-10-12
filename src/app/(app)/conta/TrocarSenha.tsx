"use client";
import { useState } from "react";
import { useApi } from "@/components/Api";
import { Painel } from "@/components/Painel";

export function TrocarSenha() {
  const api = useApi();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repete, setRepete] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nova !== repete) return setMsg({ ok: false, texto: "As senhas novas não conferem." });
    const r = await api("POST", "/api/conta/senha", { atual, nova });
    if (!r.ok) return setMsg({ ok: false, texto: r.erro });
    setAtual(""); setNova(""); setRepete("");
    setMsg({ ok: true, texto: "Senha trocada. As outras sessões foram encerradas." });
  }

  return (
    <Painel legenda="Trocar senha">
      <form onSubmit={enviar} style={{ maxWidth: 420 }}>
        <div className="campo">
          <label htmlFor="s-atual">Senha atual</label>
          <input id="s-atual" type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" required />
        </div>
        <div className="campo">
          <label htmlFor="s-nova">Senha nova (mínimo 10 caracteres)</label>
          <input id="s-nova" type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" minLength={10} required />
        </div>
        <div className="campo">
          <label htmlFor="s-repete">Repita a senha nova</label>
          <input id="s-repete" type="password" value={repete} onChange={(e) => setRepete(e.target.value)} autoComplete="new-password" minLength={10} required />
        </div>
        <button className="btn btn-principal">Trocar senha</button>
        {msg && <p className={msg.ok ? "ok" : "erro"} role="status">{msg.texto}</p>}
      </form>
    </Painel>
  );
}
