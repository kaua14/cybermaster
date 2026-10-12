import { z } from "zod";
import { chavePericia, infoPericia, PericiaFichaSchema } from "@/rules/ficha";
import { PERICIA_POR_ID } from "@/rules/pericias";
import { db } from "@/server/db";
import { carregarFicha, registrar } from "@/server/fichas";
import { json, rota } from "@/server/http";
import { agendarPdf } from "@/server/pdf/armazenamento";

const MOTIVOS = { experiencia: "experiência", ensino: "professor", estudo: "estudo e prática" } as const;

const Corpo = z.object({
  chave: z.string().min(1).max(60),
  complemento: z.string().trim().max(60).optional(),
  quantidade: z.number().int().min(1).max(100),
  motivo: z.enum(["experiencia", "ensino", "estudo"]),
});

/** O mestre dá PE numa perícia (o livro aplica os PE na perícia usada). */
export const POST = rota({ acesso: "mestre", corpo: Corpo }, async ({ sessao, params, corpo }) => {
  if (corpo.chave !== "livre" && !PERICIA_POR_ID.has(corpo.chave)) return json({ erro: "Perícia desconhecida." }, 400);
  const r = await db().begin(async (tx) => {
    const f = await carregarFicha(sessao, params.id, { tx, travar: true });
    const alvo = chavePericia({ chave: corpo.chave, complemento: corpo.complemento || undefined });
    const pericias = [...f.dados.pericias];
    let i = pericias.findIndex((p) => chavePericia(p) === alvo);
    if (i < 0) {
      pericias.push(PericiaFichaSchema.parse({ chave: corpo.chave, complemento: corpo.complemento || undefined, carreira: 0, opcional: 0, melhoria: 0, pe: 0 }));
      i = pericias.length - 1;
    }
    const info = infoPericia(pericias[i]);
    if (corpo.motivo === "estudo" && info.nivel >= 2) return { erro: "Estudando sozinho só se chega até +2. Use professor ou experiência." };
    pericias[i] = { ...pericias[i], pe: pericias[i].pe + corpo.quantidade };
    const [n] = await tx`
      update character set dados = ${tx.json({ ...f.dados, pericias } as never)}, version = version + 1, updated_at = now()
      where id = ${f.id} returning version`;
    await registrar(tx, f.id, "Mestre", "pe", `+${corpo.quantidade} PE em ${info.nome} (${MOTIVOS[corpo.motivo]}).`);
    return { version: n.version as number, pericia: pericias[i] };
  });
  if ("erro" in r) return json({ erro: r.erro }, 400);
  agendarPdf(params.id);
  return json(r);
});
