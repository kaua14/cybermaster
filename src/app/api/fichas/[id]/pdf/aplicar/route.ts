import { z } from "zod";
import { CAIXAS } from "@/rules/ferimentos";
import { FichaEditavelSchema } from "@/rules/ficha";
import { db } from "@/server/db";
import { carregarFicha, gravarFicha } from "@/server/fichas";
import { json, rota } from "@/server/http";
import { agendarPdf } from "@/server/pdf/armazenamento";

const Corpo = FichaEditavelSchema.extend({ version: z.number().int().min(1), dano: z.number().int().min(0).max(CAIXAS) });

/** Segunda metade da importação: grava o que a pessoa confirmou, com as mesmas regras da tela. */
export const POST = rota({ acesso: "logado", corpo: Corpo }, async ({ sessao, params, corpo }) => {
  const r = await db().begin(async (tx) => {
    const f = await carregarFicha(sessao, params.id, { tx, travar: true });
    if (f.version !== corpo.version) return null;
    return gravarFicha(tx, sessao, f, { nome: corpo.nome, classe: corpo.classe, dados: corpo.dados }, { dano: corpo.dano, origem: "pdf" });
  });
  if (!r) return json({ erro: "A ficha mudou depois que você enviou o PDF. Envie de novo para ver as diferenças atuais." }, 409);
  agendarPdf(params.id);
  return json(r);
});
