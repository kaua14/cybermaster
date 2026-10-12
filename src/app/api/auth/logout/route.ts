import { cookieApagado, encerrarSessao } from "@/server/auth/session";
import { json, rota } from "@/server/http";

export const POST = rota({ acesso: "logado", permitirTrocaPendente: true }, async ({ token }) => {
  if (token) await encerrarSessao(token);
  return json({ ok: true }, 200, { "set-cookie": cookieApagado() });
});
