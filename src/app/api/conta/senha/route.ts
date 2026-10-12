import { z } from "zod";
import { db } from "@/server/db";
import { conferirSenha, hashSenha, SENHA_MAX, SENHA_MIN } from "@/server/auth/password";
import { cookieSessao, criarSessao } from "@/server/auth/session";
import { json, rota } from "@/server/http";

const Corpo = z.object({
  atual: z.string().min(1).max(SENHA_MAX),
  nova: z.string().min(SENHA_MIN, `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`).max(SENHA_MAX),
});

// Só jogadores: a senha do mestre se troca pelo script de operação, nunca pela app.
export const POST = rota({ acesso: "jogador", corpo: Corpo }, async ({ corpo, sessao }) => {
  const [p] = await db()`select password_hash from player where id = ${sessao.jogadorId}`;
  if (!(await conferirSenha(p?.password_hash, corpo.atual))) return json({ erro: "Senha atual incorreta." }, 400);

  const novoHash = await hashSenha(corpo.nova);
  await db().begin(async (tx) => {
    await tx`update player set password_hash = ${novoHash} where id = ${sessao.jogadorId}`;
    await tx`delete from session where player_id = ${sessao.jogadorId}`;
  });
  // Derruba as outras sessões e mantém esta aberta com um token novo.
  return json({ ok: true }, 200, { "set-cookie": cookieSessao(await criarSessao("jogador", sessao.jogadorId)) });
});
