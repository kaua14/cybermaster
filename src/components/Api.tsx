"use client";
import { createContext, useCallback, useContext } from "react";

const CsrfCtx = createContext<string>("");

export function CsrfProvider({ token, children }: { token: string; children: React.ReactNode }) {
  return <CsrfCtx.Provider value={token}>{children}</CsrfCtx.Provider>;
}

/** Token CSRF da sessão, para envios que não são JSON (arquivo). */
export const useCsrf = () => useContext(CsrfCtx);

export type Resposta<T> = { ok: true; dados: T } | { ok: false; erro: string; status: number };

/** fetch para a API da app: JSON, mesma origem e token CSRF. */
export function useApi() {
  const csrf = useContext(CsrfCtx);
  return useCallback(
    async <T = Record<string, unknown>>(metodo: string, url: string, corpo?: unknown): Promise<Resposta<T>> => {
      try {
        const r = await fetch(url, {
          method: metodo,
          credentials: "same-origin",
          headers: { "content-type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
        });
        const dados = await r.json().catch(() => ({}));
        if (!r.ok) return { ok: false, erro: dados.erro ?? "Falhou. Tente de novo.", status: r.status };
        return { ok: true, dados };
      } catch {
        return { ok: false, erro: "Sem conexão com o servidor.", status: 0 };
      }
    },
    [csrf],
  );
}
