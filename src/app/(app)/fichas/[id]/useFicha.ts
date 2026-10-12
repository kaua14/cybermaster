"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/components/Api";
import type { FichaEditavel, PericiaFicha } from "@/rules/ficha";
import { chavePericia } from "@/rules/ficha";

export type EstadoSalvar = "salvo" | "pendente" | "salvando" | "erro" | "conflito";

/**
 * Estado da ficha com salvamento automático.
 * Uma requisição por vez; edições feitas durante o envio vão no próximo.
 * A versão evita sobrescrever o que outra tela salvou (409).
 */
export function useFicha(id: string, inicial: FichaEditavel, versaoInicial: number) {
  const api = useApi();
  const url = `/api/fichas/${id}`;
  const [ficha, setFicha] = useState(inicial);
  const [estado, setEstado] = useState<EstadoSalvar>("salvo");
  const [erro, setErro] = useState("");

  const atual = useRef(inicial);
  const versao = useRef(versaoInicial);
  const pendente = useRef(false);
  const emVoo = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const trocar = useCallback((nova: FichaEditavel) => {
    atual.current = nova;
    setFicha(nova);
  }, []);

  const enviar = useCallback(async (): Promise<boolean> => {
    pendente.current = false;
    const enviado = atual.current;
    setEstado("salvando");
    const r = await api<{ version: number; ficha: FichaEditavel }>("PUT", url, { ...enviado, version: versao.current });
    if (!r.ok) {
      if (r.status === 409) {
        setEstado("conflito");
        setErro(r.erro);
      } else {
        pendente.current = true;
        setEstado("erro");
        setErro(r.erro);
      }
      return false;
    }
    versao.current = r.dados.version;
    // O servidor pode ter mantido campos travados: alinha a tela, se nada mudou desde o envio.
    if (!pendente.current && JSON.stringify(r.dados.ficha) !== JSON.stringify(enviado)) trocar(r.dados.ficha);
    setErro("");
    setEstado(pendente.current ? "pendente" : "salvo");
    return true;
  }, [api, url, trocar]);

  const salvarAgora = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    while (emVoo.current) await emVoo.current;
    if (!pendente.current) return true;
    emVoo.current = enviar();
    const ok = await emVoo.current;
    emVoo.current = null;
    if (ok && pendente.current) timer.current = setTimeout(() => void salvarAgora(), 900);
    return ok;
  }, [enviar]);

  const alterar = useCallback(
    (fn: (f: FichaEditavel) => FichaEditavel) => {
      trocar(fn(atual.current));
      pendente.current = true;
      setEstado((e) => (e === "conflito" ? e : "pendente"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void salvarAgora(), 900);
    },
    [salvarAgora, trocar],
  );

  /** Aplica o resultado de uma ação do servidor (PE, subir perícia) sem marcar como pendente. */
  const aplicarPericia = useCallback(
    (p: PericiaFicha, novaVersao: number) => {
      versao.current = novaVersao;
      const k = chavePericia(p);
      const f = atual.current;
      const existe = f.dados.pericias.some((x) => chavePericia(x) === k);
      const pericias = existe ? f.dados.pericias.map((x) => (chavePericia(x) === k ? p : x)) : [...f.dados.pericias, p];
      trocar({ ...f, dados: { ...f.dados, pericias } });
    },
    [trocar],
  );

  const definirVersao = useCallback((v: number) => {
    versao.current = v;
  }, []);

  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (pendente.current || emVoo.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, []);

  return { ficha, alterar, estado, erro, salvarAgora, aplicarPericia, definirVersao, trocar };
}
