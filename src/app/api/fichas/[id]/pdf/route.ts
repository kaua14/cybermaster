import { carregarFicha } from "@/server/fichas";
import { rota } from "@/server/http";
import { nomeArquivo } from "@/server/pdf/gerar";
import { pdfDaFicha } from "@/server/pdf/armazenamento";

/** Baixa o PDF guardado (ou gera, se a ficha mudou). ?inline=1 abre no navegador para imprimir. */
export const GET = rota({ acesso: "logado" }, async ({ sessao, params, req }) => {
  const f = await carregarFicha(sessao, params.id);
  const bytes = await pdfDaFicha(f);
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${nomeArquivo(f.nome)}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
