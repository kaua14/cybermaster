import { db } from "@/server/db";
import { senhaTemporaria } from "@/server/players/invites";
import { json, rota, uuid } from "@/server/http";

/**
 * Define uma senha temporária para o jogador (mostrada uma vez ao mestre).
 * Vence em 24 h e o jogador é obrigado a trocá-la no primeiro login.
 */
export const POST = rota({ acesso: "mestre" }, async ({ params }) => {
  const id = uuid.safeParse(params.id);
  if (!id.success) return json({ erro: "Jogador não encontrado." }, 404);
  const r = await db().begin(async (tx) => {
    const [p] = await tx`select id from player where id = ${id.data} for update`;
    return p ? senhaTemporaria(tx, p.id) : null;
  });
  if (!r) return json({ erro: "Jogador não encontrado." }, 404);
  return json({ senha: r.senha, expira: r.expira });
});
