import { db } from "@/server/db";
import { carregarFicha } from "@/server/fichas";
import { json, rota } from "@/server/http";

export const GET = rota({ acesso: "logado" }, async ({ sessao, params }) => {
  const f = await carregarFicha(sessao, params.id);
  const historico = await db()`
    select id, autor, tipo, descricao, custo_pe, created_at as quando
    from character_log where character_id = ${f.id} order by created_at desc, id desc limit 200`;
  return json({ historico });
});
