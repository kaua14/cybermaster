import { z } from "zod";
import { FichaEditavelSchema } from "@/rules/ficha";
import { db } from "@/server/db";
import { carregarFicha, gravarFicha } from "@/server/fichas";
import { agendarPdf, apagarPdf } from "@/server/pdf/armazenamento";
import { json, rota } from "@/server/http";

export const GET = rota({ acesso: "logado" }, async ({ sessao, params }) => {
  return json({ ficha: await carregarFicha(sessao, params.id) });
});

const Corpo = FichaEditavelSchema.extend({ version: z.number().int().min(1) });

export const PUT = rota({ acesso: "logado", corpo: Corpo }, async ({ sessao, params, corpo }) => {
  const r = await db().begin(async (tx) => {
    const f = await carregarFicha(sessao, params.id, { tx, travar: true });
    if (f.version !== corpo.version) return { conflito: true as const };
    const g = await gravarFicha(tx, sessao, f, { nome: corpo.nome, classe: corpo.classe, dados: corpo.dados });
    return { conflito: false as const, ...g };
  });
  if (r.conflito) return json({ erro: "A ficha mudou em outra tela. Recarregue para ver a versão atual." }, 409);
  agendarPdf(params.id);
  return json({ version: r.version, ficha: r.ficha });
});

export const DELETE = rota({ acesso: "logado" }, async ({ sessao, params }) => {
  const f = await carregarFicha(sessao, params.id);
  await db()`delete from character where id = ${f.id}`;
  await apagarPdf(f);
  return json({ ok: true });
});
