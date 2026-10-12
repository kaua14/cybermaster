"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/components/Api";

export function PrimeiroAcesso() {
  const api = useApi();
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [repete, setRepete] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== repete) return setErro("As senhas não conferem.");
    setErro("");
    setOcupado(true);
    const r = await api("POST", "/api/auth/convite", { codigo, senha });
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="card" style={{ borderTop: 0 }}>
      <div className="card-titulo" style={{ marginTop: 0 }}>Primeiro acesso</div>
      <p className="secao-desc" style={{ margin: "0 0 18px" }}>Use o código que o mestre passou e crie sua senha.</p>
      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="p-codigo">Código do convite</label>
          <input id="p-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="one-time-code" placeholder="XXXX-XXXX-XXXX" maxLength={40} required style={{ fontFamily: "var(--f-mono)", letterSpacing: ".1em" }} />
        </div>
        <div className="campo">
          <label htmlFor="p-senha">Sua senha (mínimo 10 caracteres)</label>
          <input id="p-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" minLength={10} required />
        </div>
        <div className="campo">
          <label htmlFor="p-repete">Repita a senha</label>
          <input id="p-repete" type="password" value={repete} onChange={(e) => setRepete(e.target.value)} autoComplete="new-password" minLength={10} required />
        </div>
        <div className="linha" style={{ justifyContent: "space-between", marginTop: 18 }}>
          <button className="btn btn-principal" disabled={ocupado}>Criar senha e entrar</button>
          <Link href="/login" className="nota-pe">Voltar</Link>
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </div>
  );
}
