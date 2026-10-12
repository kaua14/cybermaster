import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";
import { inject } from "vitest";

export const ORIGEM = "http://cm.test";
type Handler = (req: Request, ctx?: { params?: Promise<Record<string, string>> }) => Promise<Response>;

let admin: postgres.Sql | undefined;
/** Conexão administrativa: só para preparar cenários de teste. */
export const adminDb = () => (admin ??= postgres(inject("adminUrl"), { max: 2, onnotice: () => {} }));

let contadorIp = 0;
/** Cada teste usa um IP próprio, para o limite de tentativas não vazar entre testes. */
export const novoIp = () => `10.0.${Math.floor(++contadorIp / 250)}.${contadorIp % 250}`;

export type Cliente = { cookie?: string; csrf?: string; ip: string };

export async function chamar(
  handler: Handler,
  opts: { metodo?: string; corpo?: unknown; cliente?: Cliente; params?: Record<string, string>; origem?: string | null; csrf?: string },
) {
  const cabecalhos: Record<string, string> = { host: "cm.test", "content-type": "application/json", "x-cm-client-ip": opts.cliente?.ip ?? "127.0.0.1" };
  if (opts.origem !== null) cabecalhos.origin = opts.origem ?? ORIGEM;
  if (opts.cliente?.cookie) cabecalhos.cookie = opts.cliente.cookie;
  const csrf = opts.csrf ?? opts.cliente?.csrf;
  if (csrf) cabecalhos["x-csrf-token"] = csrf;
  const req = new Request(`${ORIGEM}/api/teste`, {
    method: opts.metodo ?? "POST",
    headers: cabecalhos,
    body: opts.corpo === undefined ? undefined : JSON.stringify(opts.corpo),
  });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const dados = await res.json().catch(() => ({}));
  return { status: res.status, dados, setCookie: res.headers.get("set-cookie") };
}

/** Extrai o cookie de sessão e busca o token CSRF dessa sessão. */
export async function clienteDe(setCookie: string | null, ip: string): Promise<Cliente> {
  if (!setCookie) throw new Error("sem set-cookie");
  const cookie = setCookie.split(";")[0];
  const token = cookie.slice(cookie.indexOf("=") + 1);
  const { sha256 } = await import("@/server/auth/tokens");
  const [s] = await adminDb()`select csrf_token from session where token_hash = ${sha256(token)}`;
  return { cookie, csrf: s.csrf_token, ip };
}

/** Senha do mestre gerada na hora (nunca fixada em arquivo). */
export async function definirSenhaMestre(): Promise<string> {
  const senha = randomBytes(18).toString("base64url");
  const h = await hash(senha, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await adminDb()`insert into master_credential (id, password_hash) values (1, ${h})
                  on conflict (id) do update set password_hash = excluded.password_hash`;
  return senha;
}
