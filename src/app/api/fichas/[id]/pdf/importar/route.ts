import { diferencas } from "@/rules/diff";
import { FichaEditavelSchema } from "@/rules/ficha";
import { carregarFicha, permitida, type FichaLinha } from "@/server/fichas";
import { ErroHttp, json, rota } from "@/server/http";
import { PDF_MAX_BYTES, lerCampos, montarProposta } from "@/server/pdf/importar";
import { CAMPO, paraWinAnsi } from "@/server/pdf/gerar";
import { PDFDocument, StandardFonts } from "pdf-lib";

/** Lê o corpo com limite de tamanho, sem confiar no Content-Length. */
async function lerCorpo(req: Request): Promise<Uint8Array> {
  if (Number(req.headers.get("content-length") ?? 0) > PDF_MAX_BYTES) throw new ErroHttp(413, "PDF grande demais (máximo 2 MB).");
  if (!req.body) throw new ErroHttp(400, "Envie o arquivo.");
  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > PDF_MAX_BYTES) {
      await leitor.cancel();
      throw new ErroHttp(413, "PDF grande demais (máximo 2 MB).");
    }
    partes.push(value);
  }
  return Buffer.concat(partes);
}

let limparCache: ((s: string) => string) | undefined;
async function limpador() {
  if (!limparCache) {
    const f = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    limparCache = (s: string) => paraWinAnsi(f, s);
  }
  return limparCache;
}

/**
 * Primeira metade da importação: lê o PDF e devolve o que mudaria, sem gravar nada.
 * A gravação só acontece em /pdf/aplicar, depois que a pessoa confirma.
 */
export const POST = rota({ acesso: "logado" }, async ({ sessao, params, req }) => {
  const f: FichaLinha = await carregarFicha(sessao, params.id);
  const bytes = await lerCorpo(req);
  const valores = await lerCampos(bytes);

  if (valores.texto.get(CAMPO.ficha) !== f.id) {
    return json({ erro: "Esse PDF é de outra ficha. Importe na ficha certa." }, 400);
  }
  const versaoPdf = Number(valores.texto.get(CAMPO.versao));
  const atual = { ficha: { nome: f.nome, classe: f.classe, dados: f.dados }, dano: f.dano };
  const bruta = montarProposta(atual, valores, await limpador());

  const valida = FichaEditavelSchema.safeParse(bruta.ficha);
  if (!valida.success) return json({ erro: "O PDF tem valores que a ficha não aceita.", problemas: valida.error.issues.map((i) => i.message) }, 400);

  // Mesmas regras da tela: o que a pessoa não pode mudar aparece como ignorado.
  const final = { ficha: permitida(sessao, f, valida.data), dano: bruta.dano };
  const ignorados = diferencas(final, { ficha: valida.data, dano: bruta.dano }).map((m) => m.campo);

  return json({
    version: f.version,
    proposta: final.ficha,
    dano: final.dano,
    mudancas: diferencas(atual, final),
    ignorados,
    avisos: [
      ...bruta.avisos,
      ...(Number.isFinite(versaoPdf) && versaoPdf !== f.version
        ? [`Esse PDF é da versão ${versaoPdf}; a ficha está na ${f.version}. Confira se nada que mudou no app vai ser desfeito.`]
        : []),
    ],
  });
});
