import { z } from "zod";
import { db } from "@/server/db";
import { json, rota } from "@/server/http";

export const GET = rota({ acesso: "mestre" }, async () => {
  const notas = await db()`select id, titulo, texto, updated_at as atualizada from note order by updated_at desc limit 500`;
  return json({ notas });
});

const Corpo = z.object({ titulo: z.string().trim().min(1, "Dê um título.").max(120), texto: z.string().max(50_000).default("") });

export const POST = rota({ acesso: "mestre", corpo: Corpo }, async ({ corpo }) => {
  const [n] = await db()`insert into note (titulo, texto) values (${corpo.titulo}, ${corpo.texto}) returning id, titulo, texto, updated_at as atualizada`;
  return json({ nota: n }, 201);
});
