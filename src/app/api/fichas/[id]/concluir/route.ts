import { resumo } from "@/rules/ficha";
import { db } from "@/server/db";
import { autorDe, carregarFicha, registrar } from "@/server/fichas";
import { json, rota } from "@/server/http";
import { agendarPdf } from "@/server/pdf/armazenamento";

/** Fecha a criação: a partir daqui o jogador só sobe perícias com PE. */
export const POST = rota({ acesso: "logado" }, async ({ sessao, params }) => {
  const r = await db().begin(async (tx) => {
    const f = await carregarFicha(sessao, params.id, { tx, travar: true });
    if (f.criacaoConcluida) return { ok: true };
    const { problemas } = resumo(f.classe, f.dados);
    if (problemas.length) return { problemas };
    await tx`update character set criacao_concluida = true, version = version + 1, updated_at = now() where id = ${f.id}`;
    await registrar(tx, f.id, autorDe(sessao), "concluida", "Concluiu a criação do personagem.");
    return { ok: true };
  });
  if ("problemas" in r) return json({ erro: "Corrija antes de concluir.", problemas: r.problemas }, 400);
  agendarPdf(params.id);
  return json(r);
});
