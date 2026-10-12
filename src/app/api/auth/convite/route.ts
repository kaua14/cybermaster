import { z } from "zod";
import { db } from "@/server/db";
import { hashSenha, SENHA_MAX, SENHA_MIN } from "@/server/auth/password";
import { bloqueio, registrarFalha } from "@/server/auth/throttle";
import { cookieSessao, criarSessao } from "@/server/auth/session";
import { normalizarCodigo, sha256 } from "@/server/auth/tokens";
import { json, rota } from "@/server/http";

const Corpo = z.object({
  codigo: z.string().trim().min(1).max(40),
  senha: z.string().min(SENHA_MIN, `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`).max(SENHA_MAX),
});

/** Primeiro acesso: o jogador troca o código do convite pela própria senha. */
export const POST = rota({ acesso: "publico", corpo: Corpo }, async ({ corpo, ip }) => {
  const chaves = [`convite-ip:${ip}`];
  const falta = await bloqueio(chaves);
  if (falta > 0) return json({ erro: `Muitas tentativas. Tente de novo em ${falta} s.` }, 429, { "retry-after": String(falta) });

  const senhaHash = await hashSenha(corpo.senha);
  const jogador = await db().begin(async (tx) => {
    const [c] = await tx`
      update invite set used_at = now()
      where code_hash = ${sha256(normalizarCodigo(corpo.codigo))} and used_at is null and expires_at > now()
      returning player_id`;
    if (!c) return null;
    const [p] = await tx`update player set password_hash = ${senhaHash}, must_change_password = false, password_expires_at = null where id = ${c.player_id} returning id, name`;
    await tx`delete from session where player_id = ${c.player_id}`;
    return p;
  });

  if (!jogador) {
    await registrarFalha(chaves);
    return json({ erro: "Código inválido, usado ou vencido. Peça um novo ao mestre." }, 400);
  }
  return json({ ok: true, nome: jogador.name }, 200, { "set-cookie": cookieSessao(await criarSessao("jogador", jogador.id)) });
});
