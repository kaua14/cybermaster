import { z } from "zod";
import { chavePericia, infoPericia } from "@/rules/ficha";
import { db } from "@/server/db";
import { autorDe, carregarFicha, registrar } from "@/server/fichas";
import { json, rota } from "@/server/http";

const Corpo = z.object({ chave: z.string().min(1).max(60), complemento: z.string().trim().max(60).optional() });

/** Gasta os PE acumulados na perícia para subir um nível. O custo é calculado aqui, nunca no cliente. */
export const POST = rota({ acesso: "logado", corpo: Corpo }, async ({ sessao, params, corpo }) => {
  const r = await db().begin(async (tx) => {
    const f = await carregarFicha(sessao, params.id, { tx, travar: true });
    const alvo = chavePericia({ chave: corpo.chave, complemento: corpo.complemento || undefined });
    const i = f.dados.pericias.findIndex((p) => chavePericia(p) === alvo);
    if (i < 0) return { erro: "Perícia não está na ficha.", status: 404 };
    const p = f.dados.pericias[i];
    const info = infoPericia(p);
    if (info.custo === null) return { erro: "A perícia já está no nível máximo.", status: 400 };
    if (p.pe < info.custo) return { erro: `Faltam ${info.custo - p.pe} PE (custa ${info.custo}).`, status: 400 };
    const nova = { ...p, melhoria: p.melhoria + 1, pe: p.pe - info.custo };
    const pericias = f.dados.pericias.map((x, j) => (j === i ? nova : x));
    const [n] = await tx`
      update character set dados = ${tx.json({ ...f.dados, pericias } as never)}, version = version + 1, updated_at = now()
      where id = ${f.id} returning version`;
    await registrar(tx, f.id, autorDe(sessao), "subiu", `${info.nome}: +${info.nivel} → +${info.nivel + 1}.`, info.custo);
    return { version: n.version as number, pericia: nova };
  });
  if ("erro" in r) return json({ erro: r.erro }, r.status);
  return json(r);
});
