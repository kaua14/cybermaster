import { z } from "zod";
import { FichaEditavelSchema, travarCriacao } from "@/rules/ficha";
import { comPontosDaMesa } from "@/rules/mesa";
import { db } from "@/server/db";
import { autorDe, carregarFicha, registrarEdicao, secoesAlteradas } from "@/server/fichas";
import { json, rota } from "@/server/http";

export const GET = rota({ acesso: "logado" }, async ({ sessao, params }) => {
  return json({ ficha: await carregarFicha(sessao, params.id) });
});

const Corpo = FichaEditavelSchema.extend({ version: z.number().int().min(1) });

export const PUT = rota({ acesso: "logado", corpo: Corpo }, async ({ sessao, params, corpo }) => {
  const r = await db().begin(async (tx) => {
    const f = await carregarFicha(sessao, params.id, { tx, travar: true });
    if (f.version !== corpo.version) return { conflito: true as const };
    const antes = { nome: f.nome, classe: f.classe, dados: f.dados };
    let depois = { nome: corpo.nome, classe: corpo.classe, dados: corpo.dados };
    // Jogador com criação concluída: atributos e pontos de perícia ficam como estão.
    if (sessao.tipo === "jogador" && f.criacaoConcluida) depois = travarCriacao(antes, depois);
    // Total de pontos é regra da mesa: ninguém muda pela ficha.
    depois.dados = comPontosDaMesa(depois.dados);

    const [n] = await tx`
      update character set nome = ${depois.nome}, classe = ${depois.classe}, dados = ${tx.json(depois.dados as never)},
        version = version + 1, updated_at = now()
      where id = ${f.id} returning version`;
    if (f.criacaoConcluida) await registrarEdicao(tx, f.id, autorDe(sessao), secoesAlteradas(antes, depois));
    return { conflito: false as const, version: n.version as number, ficha: depois };
  });
  if (r.conflito) return json({ erro: "A ficha mudou em outra tela. Recarregue para ver a versão atual." }, 409);
  return json({ version: r.version, ficha: r.ficha });
});

export const DELETE = rota({ acesso: "logado" }, async ({ sessao, params }) => {
  const f = await carregarFicha(sessao, params.id);
  await db()`delete from character where id = ${f.id}`;
  return json({ ok: true });
});
