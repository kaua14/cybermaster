import type postgres from "postgres";
import { gerarCodigoConvite, normalizarCodigo, sha256 } from "@/server/auth/tokens";

const VALIDADE_DIAS = 7;

/**
 * Invalida a senha e os convites anteriores do jogador, derruba as sessões dele
 * e cria um convite novo. Devolve o código, que só aparece esta vez.
 */
export async function novoConvite(tx: postgres.TransactionSql, jogadorId: string): Promise<{ codigo: string; expira: Date }> {
  const codigo = gerarCodigoConvite();
  await tx`update player set password_hash = null where id = ${jogadorId}`;
  await tx`delete from session where player_id = ${jogadorId}`;
  await tx`update invite set used_at = now() where player_id = ${jogadorId} and used_at is null`;
  const [c] = await tx`
    insert into invite (player_id, code_hash, expires_at)
    values (${jogadorId}, ${sha256(normalizarCodigo(codigo))}, now() + make_interval(days => ${VALIDADE_DIAS}))
    returning expires_at`;
  return { codigo, expira: c.expires_at };
}
