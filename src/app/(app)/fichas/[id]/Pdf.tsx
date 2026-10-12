"use client";
import { useRef, useState } from "react";
import { useApi, useCsrf } from "@/components/Api";
import { Painel } from "@/components/Painel";
import type { Mudanca } from "@/rules/diff";
import type { FichaEditavel } from "@/rules/ficha";

type Previa = { version: number; proposta: FichaEditavel; dano: number; mudancas: Mudanca[]; ignorados: string[]; avisos: string[] };
type Aplicado = { version: number; ficha: FichaEditavel; dano: number };

const MAX = 2 * 1024 * 1024;

export function Pdf({ id, salvarAgora, onAplicado }: { id: string; salvarAgora: () => Promise<boolean>; onAplicado: (r: Aplicado) => void }) {
  const api = useApi();
  const csrf = useCsrf();
  const url = `/api/fichas/${id}/pdf`;
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; lista?: string[] } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function baixar() {
    if (!(await salvarAgora())) return;
    window.location.href = url;
  }

  async function imprimir() {
    // Abre a aba antes de esperar, senão o navegador bloqueia como pop-up.
    const aba = window.open("about:blank", "_blank");
    if (!(await salvarAgora())) return aba?.close();
    if (aba) aba.location.href = `${url}?inline=1`;
    else window.location.href = `${url}?inline=1`;
  }

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setMsg(null);
    setPrevia(null);
    if (arquivo.size > MAX) return setMsg({ ok: false, texto: "PDF grande demais (máximo 2 MB)." });
    if (!(await salvarAgora())) return;
    setOcupado(true);
    try {
      const r = await fetch(`${url}/importar`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/pdf", "x-csrf-token": csrf },
        body: arquivo,
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg({ ok: false, texto: dados.erro ?? "Não consegui ler o PDF.", lista: dados.problemas });
      setPrevia(dados);
    } catch {
      setMsg({ ok: false, texto: "Sem conexão com o servidor." });
    } finally {
      setOcupado(false);
    }
  }

  async function aplicar() {
    if (!previa) return;
    setOcupado(true);
    const r = await api<Aplicado>("POST", `${url}/aplicar`, { ...previa.proposta, dano: previa.dano, version: previa.version });
    setOcupado(false);
    if (!r.ok) return setMsg({ ok: false, texto: r.erro });
    onAplicado(r.dados);
    setPrevia(null);
    setMsg({ ok: true, texto: `PDF importado: ${previa.mudancas.length} ${previa.mudancas.length === 1 ? "mudança" : "mudanças"}.` });
  }

  return (
    <Painel legenda="PDF">
      <p className="nota-pe" style={{ marginBottom: 14 }}>
        PDF A4 com campos preenchíveis. Dá para editar num leitor de PDF e importar de volta: o app mostra o que mudou antes de gravar.
        Perícias e derivados ficam só para leitura no PDF.
      </p>
      <div className="linha">
        <button type="button" className="btn btn-principal" onClick={baixar}>Baixar PDF</button>
        <button type="button" className="btn" onClick={imprimir}>Imprimir</button>
        <button type="button" className="btn" disabled={ocupado} onClick={() => entrada.current?.click()}>Importar PDF editado</button>
        <input ref={entrada} type="file" accept="application/pdf,.pdf" className="sr" tabIndex={-1} aria-hidden="true" onChange={escolher} />
      </div>
      {ocupado && <p className="nota-pe" style={{ marginTop: 10 }}>Lendo…</p>}
      {msg && (
        <div className={msg.ok ? "ok" : "erro"} role="status">
          {msg.texto}
          {msg.lista && <ul className="problemas">{msg.lista.map((x) => <li key={x}>{x}</li>)}</ul>}
        </div>
      )}

      {previa && (
        <div className="espaco">
          <div className="card-titulo" style={{ marginTop: 0 }}>O que muda com este PDF</div>
          {previa.mudancas.length === 0 ? (
            <p>Nada muda: o PDF está igual à ficha.</p>
          ) : (
            <div className="tabela-rolavel">
              <table>
                <thead><tr><th>Campo</th><th>Agora</th><th>Do PDF</th></tr></thead>
                <tbody>
                  {previa.mudancas.map((m) => (
                    <tr key={m.campo}>
                      <td style={{ whiteSpace: "nowrap" }}>{m.campo}</td>
                      <td className="pag" style={{ whiteSpace: "normal" }}>{m.antes}</td>
                      <td style={{ color: "var(--tinta)" }}>{m.depois}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {previa.ignorados.length > 0 && (
            <p className="nota-pe" style={{ marginTop: 10 }}>
              Ignorado (criação concluída, só muda com PE ou pelo mestre): {previa.ignorados.join(", ")}.
            </p>
          )}
          {previa.avisos.length > 0 && <ul className="problemas">{previa.avisos.map((x) => <li key={x}>{x}</li>)}</ul>}
          <div className="linha espaco">
            {previa.mudancas.length > 0 && <button type="button" className="btn btn-principal" disabled={ocupado} onClick={aplicar}>Aplicar mudanças</button>}
            <button type="button" className="btn" onClick={() => setPrevia(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </Painel>
  );
}
