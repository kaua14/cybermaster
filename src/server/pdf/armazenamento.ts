import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/server/db";
import { carregarFichaSistema, type FichaLinha } from "@/server/fichas";
import { gerarPdf } from "./gerar";

const pasta = () => path.resolve(process.env.STORAGE_DIR || "storage", "fichas");
// O caminho guardado no banco é relativo à pasta de armazenamento e só tem o id (uuid): nada vem do usuário.
const relativo = (id: string) => path.posix.join("fichas", `${id}.pdf`);
const absoluto = (id: string) => path.join(pasta(), `${id}.pdf`);
const chaveDe = (f: FichaLinha) => `${f.version}:${f.dano}`;

const emAndamento = new Map<string, Promise<Uint8Array>>();

/** Gera e grava. Pedidos simultâneos para a mesma versão da ficha esperam a mesma geração. */
function gerarEGuardar(f: FichaLinha): Promise<Uint8Array> {
  const chave = `${f.id}:${chaveDe(f)}`;
  let p = emAndamento.get(chave);
  if (!p) {
    p = gerarAgora(f).finally(() => emAndamento.delete(chave));
    emAndamento.set(chave, p);
  }
  return p;
}

async function gerarAgora(f: FichaLinha): Promise<Uint8Array> {
  const bytes = await gerarPdf({ id: f.id, version: f.version, ficha: { nome: f.nome, classe: f.classe, dados: f.dados }, dano: f.dano, dono: f.dono.nome, geradoEm: new Date() });
  await mkdir(pasta(), { recursive: true });
  const tmp = `${absoluto(f.id)}.${randomUUID()}.tmp`;
  await writeFile(tmp, bytes);
  await rename(tmp, absoluto(f.id));
  // Só marca como atual se a ficha não mudou enquanto o PDF era gerado.
  await db()`update character set pdf_path = ${relativo(f.id)}, pdf_chave = ${chaveDe(f)}
             where id = ${f.id} and version = ${f.version} and dano = ${f.dano}`;
  return bytes;
}

/** PDF da ficha. A autorização vem de quem chamou (a ficha já foi carregada com a sessão). */
export async function pdfDaFicha(f: FichaLinha): Promise<Uint8Array> {
  if (f.pdf.caminho && f.pdf.chave === chaveDe(f)) {
    try {
      return await readFile(absoluto(f.id));
    } catch {
      // arquivo sumiu: gera de novo
    }
  }
  return gerarEGuardar(f);
}

const agendados = new Map<string, ReturnType<typeof setTimeout>>();

/** Regenera o PDF guardado pouco depois de uma mudança (agrupa edições seguidas). */
export function agendarPdf(id: string, atrasoMs = 3000) {
  clearTimeout(agendados.get(id));
  agendados.set(
    id,
    setTimeout(async () => {
      agendados.delete(id);
      try {
        const f = await carregarFichaSistema(id);
        if (f.pdf.chave !== chaveDe(f)) await gerarEGuardar(f);
      } catch (e) {
        // Ficha apagada nesse meio-tempo, ou falha de disco: o download gera na hora.
        if (!(e instanceof Error && /não encontrada/.test(e.message))) console.error(`[pdf] ${id}:`, e instanceof Error ? e.message : e);
      }
    }, atrasoMs),
  );
}

export async function apagarPdf(f: Pick<FichaLinha, "id">) {
  clearTimeout(agendados.get(f.id));
  agendados.delete(f.id);
  await rm(absoluto(f.id), { force: true });
}
