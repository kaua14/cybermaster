import { z } from "zod";
import { CLASSE_POR_ID } from "@/rules/classes";
import { dadosIniciais } from "@/rules/ficha";
import { PONTOS_PERSONAGEM } from "@/rules/mesa";
import { db } from "@/server/db";
import { autorDe, registrar } from "@/server/fichas";
import { json, rota, uuid } from "@/server/http";
import { agendarPdf } from "@/server/pdf/armazenamento";

export const GET = rota({ acesso: "logado" }, async ({ sessao, req }) => {
  const filtro = new URL(req.url).searchParams.get("jogador");
  const dono = sessao.tipo === "mestre" ? (filtro && uuid.safeParse(filtro).success ? filtro : null) : sessao.jogadorId;
  const fichas = await db()`
    select c.id, c.nome, c.classe, c.dano, c.criacao_concluida as concluida, c.updated_at as atualizada,
           p.id as jogador_id, p.name as jogador
    from character c join player p on p.id = c.owner_id
    where (${dono}::uuid is null or c.owner_id = ${dono}::uuid)
    order by lower(p.name), lower(c.nome)`;
  return json({ fichas });
});

const Corpo = z.object({
  nome: z.string().trim().min(1, "Dê um nome ao personagem.").max(60),
  classe: z.string().refine((c) => CLASSE_POR_ID.has(c), "Escolha a classe."),
  /** Só o mestre escolhe o dono; o jogador cria para si. */
  jogadorId: uuid.optional(),
});

export const POST = rota({ acesso: "logado", corpo: Corpo }, async ({ sessao, corpo }) => {
  const dono = sessao.tipo === "mestre" ? corpo.jogadorId : sessao.jogadorId;
  if (!dono) return json({ erro: "Escolha o jogador dono da ficha." }, 400);

  const id = await db().begin(async (tx) => {
    const [p] = await tx`select id from player where id = ${dono}`;
    if (!p) return null;
    const dados = dadosIniciais("cinematografico", PONTOS_PERSONAGEM, corpo.classe);
    const [c] = await tx`
      insert into character (owner_id, nome, classe, dados)
      values (${dono}, ${corpo.nome}, ${corpo.classe}, ${tx.json(dados as never)}) returning id`;
    await registrar(tx, c.id, autorDe(sessao), "criacao", `Criou a ficha (${CLASSE_POR_ID.get(corpo.classe)!.nome}).`);
    return c.id as string;
  });
  if (!id) return json({ erro: "Jogador não encontrado." }, 404);
  agendarPdf(id, 0);
  return json({ id }, 201);
});
