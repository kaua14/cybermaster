"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/components/Api";

export function Login() {
  const api = useApi();
  const router = useRouter();
  const [modo, setModo] = useState<"jogador" | "mestre">("jogador");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOcupado(true);
    const r = await api<{ trocarSenha?: boolean }>("POST", "/api/auth/login", modo === "mestre" ? { modo, senha } : { modo, nome, senha });
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    router.replace(r.dados.trocarSenha ? "/conta" : "/");
    router.refresh();
  }

  function trocar(m: "jogador" | "mestre") {
    setModo(m);
    setErro("");
    setSenha("");
  }

  return (
    <div className="card" style={{ borderTop: 0 }}>
      <div className="abas" role="tablist" aria-label="Entrar como">
        <button type="button" role="tab" aria-selected={modo === "jogador"} onClick={() => trocar("jogador")}>Jogador</button>
        <button type="button" role="tab" aria-selected={modo === "mestre"} onClick={() => trocar("mestre")}>Mestre</button>
      </div>
      <form onSubmit={entrar}>
        {modo === "jogador" && (
          <div className="campo">
            <label htmlFor="l-nome">Nome</label>
            <input id="l-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="username" maxLength={40} required />
          </div>
        )}
        <div className="campo">
          <label htmlFor="l-senha">{modo === "mestre" ? "Senha do mestre" : "Senha"}</label>
          <input id="l-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </div>
        <div className="linha" style={{ justifyContent: "space-between", marginTop: 18 }}>
          <button className="btn btn-principal" disabled={ocupado}>Entrar</button>
          {modo === "jogador" && <Link href="/primeiro-acesso" className="nota-pe">Primeiro acesso</Link>}
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </div>
  );
}
