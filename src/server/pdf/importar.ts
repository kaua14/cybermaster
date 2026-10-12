import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { SIGLAS } from "@/rules/atributos";
import { CAIXAS } from "@/rules/ferimentos";
import { LOCAIS, type Arma, type Cyberware, type FichaEditavel } from "@/rules/ficha";
import { ErroHttp } from "@/server/http";
import { CAMPO, COLUNAS_ARMA, LINHAS_ARMAS, LINHAS_CYBER } from "./gerar";

export const PDF_MAX_BYTES = 2 * 1024 * 1024;

export type ValoresPdf = { texto: Map<string, string>; marcadas: Set<string> };

/**
 * Lê só os valores dos campos AcroForm. Nada do arquivo é executado nem guardado:
 * scripts, anexos e o resto do documento são ignorados.
 */
export async function lerCampos(bytes: Uint8Array): Promise<ValoresPdf> {
  if (bytes.length === 0) throw new ErroHttp(400, "Arquivo vazio.");
  if (bytes.length > PDF_MAX_BYTES) throw new ErroHttp(413, "PDF grande demais (máximo 2 MB).");
  // Tipo real: a assinatura %PDF- tem que estar no começo (aceita até 1 KB de lixo antes, como os leitores).
  const inicio = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  if (!inicio.includes("%PDF-")) throw new ErroHttp(415, "Isso não é um PDF.");

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: false });
  } catch (e) {
    if (e instanceof Error && /encrypt/i.test(e.message)) throw new ErroHttp(400, "PDF protegido por senha. Salve sem proteção e envie de novo.");
    throw new ErroHttp(400, "Não consegui ler esse PDF.");
  }

  const texto = new Map<string, string>();
  const marcadas = new Set<string>();
  let campos;
  try {
    campos = doc.getForm().getFields();
  } catch {
    throw new ErroHttp(400, "O PDF não tem campos de formulário. Use o PDF baixado do app.");
  }
  for (const f of campos.slice(0, 2000)) {
    const nome = f.getName();
    if (f instanceof PDFTextField) texto.set(nome, (f.getText() ?? "").slice(0, 10_000));
    else if (f instanceof PDFCheckBox && f.isChecked()) marcadas.add(nome);
  }
  if (!texto.has(CAMPO.ficha)) throw new ErroHttp(400, "Esse PDF não foi gerado pelo Cybermaster. Baixe o PDF da ficha e edite esse.");
  return { texto, marcadas };
}

const inteiro = (s: string) => (/^\s*-?\d+\s*$/.test(s) ? Number(s.trim()) : NaN);

/**
 * Monta a ficha proposta: parte da ficha atual e troca só o que veio no PDF.
 * Campo do PDF igual à versão "limpa" do valor atual (acentos fora do PDF viram "?") não conta como mudança.
 */
export function montarProposta(
  atual: { ficha: FichaEditavel; dano: number },
  v: ValoresPdf,
  limpar: (s: string) => string,
): { ficha: FichaEditavel; dano: number; avisos: string[] } {
  const avisos: string[] = [];
  const d = structuredClone(atual.ficha.dados);
  const ler = (nome: string, atualValor: string): string => {
    const t = v.texto.get(nome);
    if (t === undefined) return atualValor;
    return t === limpar(atualValor) ? atualValor : t;
  };
  const numero = (nome: string, rot: string, atualValor: number, min: number, max: number): number => {
    const t = v.texto.get(nome);
    if (t === undefined || t.trim() === String(atualValor)) return atualValor;
    const n = inteiro(t);
    if (Number.isNaN(n) || n < min || n > max) {
      avisos.push(`${rot}: "${t.trim()}" não é um número entre ${min} e ${max}. Mantive ${atualValor}.`);
      return atualValor;
    }
    return n;
  };

  const nome = ler(CAMPO.nome, atual.ficha.nome).trim() || atual.ficha.nome;

  const idadeTxt = v.texto.get(CAMPO.idade)?.trim();
  if (idadeTxt !== undefined && idadeTxt !== (d.idade === null ? "" : String(d.idade))) {
    const n = inteiro(idadeTxt);
    if (idadeTxt === "") d.idade = null;
    else if (Number.isNaN(n) || n < 0 || n > 200) avisos.push(`Idade: "${idadeTxt}" não é um número entre 0 e 200. Mantive a atual.`);
    else d.idade = n;
  }

  for (const s of SIGLAS) d.atributos[s] = numero(CAMPO.atr(s), s, d.atributos[s], 2, 10);

  // Armas: as linhas do PDF substituem as primeiras; as que não couberam no PDF ficam.
  const armasPdf: Arma[] = [];
  for (let i = 0; i < LINHAS_ARMAS; i++) {
    const a = atual.ficha.dados.armas[i];
    const linha = Object.fromEntries(COLUNAS_ARMA.map((c) => [c.k, ler(CAMPO.arma(i, c.k), a?.[c.k] ?? "").slice(0, c.k === "nome" ? 60 : 20)])) as Arma;
    if (Object.values(linha).some((x) => x.trim() !== "")) armasPdf.push(linha);
  }
  d.armas = [...armasPdf, ...atual.ficha.dados.armas.slice(LINHAS_ARMAS)];

  for (const l of LOCAIS) d.armadura[l.id] = numero(CAMPO.local(l.id), `PB ${l.nome}`, d.armadura[l.id], 0, 60);
  d.armadura.descricao = ler(CAMPO.armaduraDesc, d.armadura.descricao).slice(0, 300);

  const cyberPdf: Cyberware[] = [];
  for (let i = 0; i < LINHAS_CYBER; i++) {
    const c = atual.ficha.dados.cyberware[i];
    const nomeC = ler(CAMPO.cyber(i, "nome"), c?.nome ?? "").slice(0, 80);
    const notas = ler(CAMPO.cyber(i, "notas"), c?.notas ?? "").slice(0, 200);
    const chTxt = v.texto.get(CAMPO.cyber(i, "ch")) ?? (c ? String(c.ch) : "");
    if (!nomeC.trim() && !notas.trim() && !chTxt.trim()) continue;
    let ch = c?.ch ?? 0;
    if (chTxt.trim() !== "" && chTxt.trim() !== String(ch)) {
      const n = inteiro(chTxt);
      if (Number.isNaN(n) || n < 0 || n > 100) avisos.push(`CH de "${nomeC || "implante"}": "${chTxt.trim()}" não é um número entre 0 e 100. Mantive ${ch}.`);
      else ch = n;
    }
    cyberPdf.push({ nome: nomeC, ch, notas });
  }
  d.cyberware = [...cyberPdf, ...atual.ficha.dados.cyberware.slice(LINHAS_CYBER)];

  d.dinheiro = numero(CAMPO.dinheiro, "Dinheiro", d.dinheiro, 0, 1_000_000_000);
  d.equipamento = ler(CAMPO.equipamento, d.equipamento);
  d.historia = ler(CAMPO.historia, d.historia);
  if (d.equipamento.length > 4000) { d.equipamento = d.equipamento.slice(0, 4000); avisos.push("Equipamento passou de 4000 caracteres e foi cortado."); }
  if (d.historia.length > 8000) { d.historia = d.historia.slice(0, 8000); avisos.push("História passou de 8000 caracteres e foi cortada."); }

  // Dano = quantas caixas estão marcadas.
  let dano = 0;
  for (let n = 1; n <= CAIXAS; n++) if (v.marcadas.has(CAMPO.dano(n))) dano++;

  return { ficha: { ...atual.ficha, nome: nome.slice(0, 60), dados: d }, dano, avisos };
}
