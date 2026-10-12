import { z, type ZodTypeAny } from "zod";
import { iguais } from "./auth/tokens";
import { lerSessao, tokenDoCookie, type Sessao } from "./auth/session";

export class ErroHttp extends Error {
  constructor(public status: number, mensagem: string, public extra?: Record<string, unknown>) {
    super(mensagem);
  }
}

export function json(dados: unknown, status = 200, cabecalhos: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cabecalhos },
  });
}

const confiaProxy = () => process.env.TRUST_PROXY === "1";

/**
 * IP do cliente. No servidor próprio, o server.mjs sobrescreve x-cm-client-ip em toda requisição.
 * Na Vercel o server.mjs não roda: aí vale o x-real-ip, que a própria Vercel define (o cliente não consegue forjá-lo).
 */
export const ipCliente = (req: Request) =>
  (process.env.VERCEL === "1" ? req.headers.get("x-real-ip") : req.headers.get("x-cm-client-ip")) || "desconhecido";

function mesmaOrigem(req: Request): boolean {
  const host = (confiaProxy() && req.headers.get("x-forwarded-host")) || req.headers.get("host");
  const origem = req.headers.get("origin");
  if (origem) {
    try {
      return new URL(origem).host === host;
    } catch {
      return false;
    }
  }
  return req.headers.get("sec-fetch-site") === "same-origin";
}

type Acesso = "publico" | "logado" | "mestre" | "jogador";

type Contexto<A extends Acesso, C> = {
  req: Request;
  sessao: A extends "publico" ? Sessao | null : A extends "jogador" ? Extract<Sessao, { tipo: "jogador" }> : Sessao;
  corpo: C;
  params: Record<string, string>;
  ip: string;
  token: string | undefined;
};

const LIMITE_CORPO = 64 * 1024;

/**
 * Envolve um Route Handler: sessão, permissão, origem, CSRF e validação do corpo.
 * Toda rota da API passa por aqui.
 */
export function rota<A extends Acesso, S extends ZodTypeAny | undefined = undefined>(
  opcoes: { acesso: A; corpo?: S; permitirTrocaPendente?: boolean },
  fn: (ctx: Contexto<A, S extends ZodTypeAny ? z.infer<S> : undefined>) => Promise<Response>,
) {
  return async (req: Request, ctxNext?: { params?: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      const mutacao = !["GET", "HEAD"].includes(req.method);
      if (mutacao && !mesmaOrigem(req)) throw new ErroHttp(403, "Origem não permitida.");

      const token = tokenDoCookie(req.headers.get("cookie"));
      const sessao = await lerSessao(token);

      if (opcoes.acesso !== "publico") {
        if (!sessao) throw new ErroHttp(401, "Faça login.");
        if (opcoes.acesso === "mestre" && sessao.tipo !== "mestre") throw new ErroHttp(403, "Só o mestre.");
        if (opcoes.acesso === "jogador" && sessao.tipo !== "jogador") throw new ErroHttp(403, "Só jogadores.");
        if (mutacao && !iguais(req.headers.get("x-csrf-token") ?? "", sessao.csrf)) {
          throw new ErroHttp(403, "Token CSRF inválido. Recarregue a página.");
        }
        if (sessao.trocarSenha && !opcoes.permitirTrocaPendente) throw new ErroHttp(403, "Troque a senha temporária primeiro.");
      }

      let corpo: unknown = undefined;
      if (opcoes.corpo) {
        const tamanho = Number(req.headers.get("content-length") ?? 0);
        if (tamanho > LIMITE_CORPO) throw new ErroHttp(413, "Corpo grande demais.");
        const texto = await req.text();
        if (texto.length > LIMITE_CORPO) throw new ErroHttp(413, "Corpo grande demais.");
        let bruto: unknown;
        try {
          bruto = texto ? JSON.parse(texto) : {};
        } catch {
          throw new ErroHttp(400, "JSON inválido.");
        }
        const r = opcoes.corpo.safeParse(bruto);
        if (!r.success) throw new ErroHttp(400, "Dados inválidos.", { campos: r.error.flatten().fieldErrors });
        corpo = r.data;
      }

      const params = (await ctxNext?.params) ?? {};
      return await fn({ req, sessao: sessao as never, corpo: corpo as never, params, ip: ipCliente(req), token });
    } catch (e) {
      if (e instanceof ErroHttp) return json({ erro: e.message, ...e.extra }, e.status);
      // Não registra corpo nem cabeçalhos: podem conter senha ou token.
      console.error(`[api] ${req.method} ${new URL(req.url).pathname}:`, e instanceof Error ? e.message : "erro");
      return json({ erro: "Erro interno." }, 500);
    }
  };
}

export const uuid = z.string().uuid();
