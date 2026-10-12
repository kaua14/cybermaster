import { z } from "zod";
import { db } from "@/server/db";
import { json, rota, uuid } from "@/server/http";

const Corpo = z.object({ titulo: z.string().trim().min(1, "Dê um título.").max(120), texto: z.string().max(50_000) });

export const PUT = rota({ acesso: "mestre", corpo: Corpo }, async ({ params, corpo }) => {
  const id = uuid.safeParse(params.id);
  if (!id.success) return json({ erro: "Nota não encontrada." }, 404);
  const [n] = await db()`
    update note set titulo = ${corpo.titulo}, texto = ${corpo.texto}, updated_at = now()
    where id = ${id.data} returning id, titulo, texto, updated_at as atualizada`;
  if (!n) return json({ erro: "Nota não encontrada." }, 404);
  return json({ nota: n });
});

export const DELETE = rota({ acesso: "mestre" }, async ({ params }) => {
  const id = uuid.safeParse(params.id);
  if (!id.success) return json({ erro: "Nota não encontrada." }, 404);
  await db()`delete from note where id = ${id.data}`;
  return json({ ok: true });
});
