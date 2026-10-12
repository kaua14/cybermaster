import { db } from "@/server/db";
import { novoConvite } from "@/server/players/invites";
import { json, rota, uuid } from "@/server/http";

/** Invalida a senha do jogador e gera um convite novo. O mestre nunca vê senha. */
export const POST = rota({ acesso: "mestre" }, async ({ params }) => {
  const id = uuid.safeParse(params.id);
  if (!id.success) return json({ erro: "Jogador não encontrado." }, 404);
  const r = await db().begin(async (tx) => {
    const [p] = await tx`select id from player where id = ${id.data} for update`;
    return p ? novoConvite(tx, p.id) : null;
  });
  if (!r) return json({ erro: "Jogador não encontrado." }, 404);
  return json({ codigo: r.codigo, expira: r.expira });
});
