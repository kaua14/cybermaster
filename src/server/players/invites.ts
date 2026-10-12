import type postgres from "postgres";
import { hashSenha } from "@/server/auth/password";
import { gerarCodigoConvite, normalizarCodigo, sha256 } from "@/server/auth/tokens";

const VALIDADE_DIAS = 7;

/**
 * Invalida a senha e os convites anteriores do jogador, derruba as sessões dele
 * e cria um convite novo. Devolve o código, que só aparece esta vez.
 */
export async function novoConvite(tx: postgres.TransactionSql, jogadorId: string): Promise<{ codigo: string; expira: Date }> {
  const codigo = gerarCodigoConvite();
  await tx`update player set password_hash = null, must_change_password = false, password_expires_at = null where id = ${jogadorId}`;
  await tx`delete from session where player_id = ${jogadorId}`;
  await tx`update invite set used_at = now() where player_id = ${jogadorId} and used_at is null`;
  const [c] = await tx`
    insert into invite (player_id, code_hash, expires_at)
    values (${jogadorId}, ${sha256(normalizarCodigo(codigo))}, now() + make_interval(days => ${VALIDADE_DIAS}))
    returning expires_at`;
  return { codigo, expira: c.expires_at };
}

const VALIDADE_TEMPORARIA_HORAS = 24;

/**
 * Troca a senha do jogador por uma temporária, gerada aqui e mostrada uma vez ao mestre.
 * Ela vence em 24 h e obriga o jogador a criar uma senha nova no primeiro login.
 */
export async function senhaTemporaria(tx: postgres.TransactionSql, jogadorId: string): Promise<{ senha: string; expira: Date }> {
  const senha = gerarCodigoConvite();
  const h = await hashSenha(senha);
  await tx`update invite set used_at = now() where player_id = ${jogadorId} and used_at is null`;
  await tx`delete from session where player_id = ${jogadorId}`;
  const [p] = await tx`
    update player set password_hash = ${h}, must_change_password = true,
      password_expires_at = now() + make_interval(hours => ${VALIDADE_TEMPORARIA_HORAS})
    where id = ${jogadorId} returning password_expires_at`;
  return { senha, expira: p.password_expires_at };
}
