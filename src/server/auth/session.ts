import { db } from "@/server/db";
import { sha256, tokenAleatorio } from "./tokens";

export type Sessao =
  | { tipo: "mestre"; csrf: string; jogadorId: null; nome: null; trocarSenha: false }
  | { tipo: "jogador"; csrf: string; jogadorId: string; nome: string; trocarSenha: boolean };

const DURACAO_DIAS = 7;

export const cookieSeguro = () => process.env.COOKIE_SECURE !== "0";
// O prefixo __Host- exige Secure, path=/ e nenhum domínio.
export const nomeCookie = () => (cookieSeguro() ? "__Host-cm_sessao" : "cm_sessao");

export function cookieSessao(token: string): string {
  const partes = [`${nomeCookie()}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${DURACAO_DIAS * 86400}`];
  if (cookieSeguro()) partes.push("Secure");
  return partes.join("; ");
}

export function cookieApagado(): string {
  const partes = [`${nomeCookie()}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (cookieSeguro()) partes.push("Secure");
  return partes.join("; ");
}

export async function criarSessao(tipo: "mestre" | "jogador", jogadorId: string | null): Promise<string> {
  const token = tokenAleatorio();
  await db()`delete from session where expires_at < now()`;
  await db()`
    insert into session (token_hash, kind, player_id, csrf_token, expires_at)
    values (${sha256(token)}, ${tipo === "mestre" ? "master" : "player"}, ${jogadorId}, ${tokenAleatorio()},
            now() + make_interval(days => ${DURACAO_DIAS}))`;
  return token;
}

export async function lerSessao(token: string | undefined): Promise<Sessao | null> {
  if (!token || token.length > 100) return null;
  const [s] = await db()`
    select s.kind, s.player_id, s.csrf_token, p.name, p.must_change_password
    from session s left join player p on p.id = s.player_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  if (!s) return null;
  if (s.kind === "master") return { tipo: "mestre", csrf: s.csrf_token, jogadorId: null, nome: null, trocarSenha: false };
  return { tipo: "jogador", csrf: s.csrf_token, jogadorId: s.player_id, nome: s.name, trocarSenha: s.must_change_password };
}

export async function encerrarSessao(token: string): Promise<void> {
  await db()`delete from session where token_hash = ${sha256(token)}`;
}

export function tokenDoCookie(cabecalho: string | null): string | undefined {
  if (!cabecalho) return undefined;
  const nome = nomeCookie();
  for (const parte of cabecalho.split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return undefined;
}
