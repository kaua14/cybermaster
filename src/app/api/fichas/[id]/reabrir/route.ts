import { db } from "@/server/db";
import { carregarFicha, registrar } from "@/server/fichas";
import { json, rota } from "@/server/http";
import { agendarPdf } from "@/server/pdf/armazenamento";

/** Só o mestre reabre a criação (para o jogador corrigir atributos ou pontos). */
export const POST = rota({ acesso: "mestre" }, async ({ sessao, params }) => {
  const f = await carregarFicha(sessao, params.id);
  await db().begin(async (tx) => {
    await tx`update character set criacao_concluida = false, version = version + 1, updated_at = now() where id = ${f.id}`;
    await registrar(tx, f.id, "Mestre", "reaberta", "Reabriu a criação do personagem.");
  });
  agendarPdf(f.id);
  return json({ ok: true });
});
