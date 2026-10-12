import { z } from "zod";
import { CAIXAS } from "@/rules/ferimentos";
import { db } from "@/server/db";
import { carregarFicha } from "@/server/fichas";
import { json, rota } from "@/server/http";
import { agendarPdf } from "@/server/pdf/armazenamento";

// Separado do salvamento da ficha: marcar dano no meio do combate não pode conflitar com edição.
export const POST = rota({ acesso: "logado", corpo: z.object({ dano: z.number().int().min(0).max(CAIXAS) }) }, async ({ sessao, params, corpo }) => {
  const f = await carregarFicha(sessao, params.id);
  await db()`update character set dano = ${corpo.dano}, updated_at = now() where id = ${f.id}`;
  agendarPdf(f.id);
  return json({ dano: corpo.dano });
});
