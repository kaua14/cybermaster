import { z } from "zod";
import { db } from "@/server/db";
import { novoConvite } from "@/server/players/invites";
import { json, rota } from "@/server/http";

export const GET = rota({ acesso: "mestre" }, async () => {
  const jogadores = await db()`
    select p.id, p.name as nome, p.created_at as criado, (p.password_hash is not null) as ativo,
           (select max(expires_at) from invite i where i.player_id = p.id and i.used_at is null and i.expires_at > now()) as convite_expira
    from player p order by lower(p.name)`;
  return json({ jogadores });
});

const Corpo = z.object({ nome: z.string().trim().min(1, "Informe o nome.").max(40) });

export const POST = rota({ acesso: "mestre", corpo: Corpo }, async ({ corpo }) => {
  const [existe] = await db()`select 1 from player where lower(name) = lower(${corpo.nome})`;
  if (existe) return json({ erro: "Já existe um jogador com esse nome." }, 409);
  const r = await db().begin(async (tx) => {
    const [p] = await tx`insert into player (name) values (${corpo.nome}) returning id`;
    return { id: p.id as string, ...(await novoConvite(tx, p.id)) };
  });
  return json({ id: r.id, codigo: r.codigo, expira: r.expira }, 201);
});
