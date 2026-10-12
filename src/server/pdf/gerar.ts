import { PDFDocument, StandardFonts, TextAlignment, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { SIGLAS } from "@/rules/atributos";
import { CLASSE_POR_ID } from "@/rules/classes";
import { derivados } from "@/rules/derivados";
import { ESTADOS, POR_ESTADO } from "@/rules/ferimentos";
import { custoCyberware, infoPericia, LOCAIS, type Arma, type FichaEditavel } from "@/rules/ficha";
import { PONTOS_PERSONAGEM } from "@/rules/mesa";

// Nomes dos campos do formulário. A importação lê exatamente estes nomes.
export const CAMPO = {
  ficha: "cm.ficha",
  versao: "cm.versao",
  nome: "nome",
  idade: "idade",
  dinheiro: "dinheiro",
  equipamento: "equipamento",
  historia: "historia",
  armaduraDesc: "armadura.descricao",
  atr: (s: string) => `atr.${s}`,
  arma: (i: number, k: keyof Arma) => `arma.${i}.${k}`,
  local: (id: string) => `armadura.${id}`,
  cyber: (i: number, k: "nome" | "ch" | "notas") => `cyber.${i}.${k}`,
  dano: (n: number) => `dano.${n}`,
};
export const LINHAS_ARMAS = 5;
export const LINHAS_CYBER = 6;
export const COLUNAS_ARMA: { k: keyof Arma; rotulo: string; largura: number }[] = [
  { k: "nome", rotulo: "Arma", largura: 0.3 },
  { k: "tipo", rotulo: "Tipo", largura: 0.11 },
  { k: "prec", rotulo: "Prec", largura: 0.09 },
  { k: "dano", rotulo: "Dano", largura: 0.14 },
  { k: "mun", rotulo: "Mun", largura: 0.11 },
  { k: "cdt", rotulo: "CdT", largura: 0.1 },
  { k: "alcance", rotulo: "Alcance", largura: 0.15 },
];

const A4 = { w: 595.28, h: 841.89 };
const M = 22; // margem (~8 mm)
const LARG = A4.w - 2 * M;
const PRETO = rgb(0, 0, 0);
const CINZA = rgb(0.35, 0.35, 0.35);
const CINZA_CLARO = rgb(0.9, 0.9, 0.9);
const BRANCO = rgb(1, 1, 1);

// As fontes padrão do PDF só têm o conjunto WinAnsi (Latin-1 + aspas e travessões).
const TROCAS: Record<string, string> = { "−": "-", "≤": "<=", "≥": ">=", "→": "->", "◆": "*", "★": "*", "…": "...", " ": " " };
export function paraWinAnsi(fonte: PDFFont, texto: string): string {
  const conjunto = new Set(fonte.getCharacterSet());
  let out = "";
  for (const ch of texto.normalize("NFC")) {
    const t = TROCAS[ch] ?? ch;
    for (const c of t) out += c === "\n" || c === "\r" || conjunto.has(c.codePointAt(0)!) ? c : "?";
  }
  return out;
}

type Ctx = { doc: PDFDocument; pagina: PDFPage; f: PDFFont; fb: PDFFont };

function texto(c: Ctx, t: string, x: number, y: number, tam: number, opcoes: { negrito?: boolean; cor?: ReturnType<typeof rgb>; largMax?: number } = {}) {
  const fonte = opcoes.negrito ? c.fb : c.f;
  let s = paraWinAnsi(fonte, t);
  // Corta o que não cabe e marca com ponto.
  if (opcoes.largMax && fonte.widthOfTextAtSize(s, tam) > opcoes.largMax) {
    while (s.length > 1 && fonte.widthOfTextAtSize(s + ".", tam) > opcoes.largMax) s = s.slice(0, -1);
    s += ".";
  }
  c.pagina.drawText(s, { x, y, size: tam, font: fonte, color: opcoes.cor ?? PRETO });
}

/** Caixa com borda e faixa preta de título (como na folha do protótipo). Devolve o y do conteúdo. */
function caixa(c: Ctx, x: number, topo: number, w: number, h: number, titulo?: string): number {
  c.pagina.drawRectangle({ x, y: topo - h, width: w, height: h, borderColor: PRETO, borderWidth: 1.2 });
  if (!titulo) return topo;
  c.pagina.drawRectangle({ x, y: topo - 11, width: w, height: 11, color: PRETO });
  texto(c, titulo.toUpperCase(), x + 4, topo - 8.2, 7, { negrito: true, cor: BRANCO });
  return topo - 11;
}

function rotulo(c: Ctx, t: string, x: number, y: number) {
  texto(c, t.toUpperCase(), x, y, 5.6, { cor: CINZA });
}

function campo(
  c: Ctx,
  nome: string,
  valor: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opcoes: { tam?: number; centro?: boolean; multilinha?: boolean; somenteLeitura?: boolean; oculto?: boolean; maxLen?: number } = {},
) {
  const form = c.doc.getForm();
  const tf = form.createTextField(nome);
  if (opcoes.multilinha) tf.enableMultiline();
  if (opcoes.maxLen) tf.setMaxLength(opcoes.maxLen);
  tf.setText(paraWinAnsi(c.f, valor));
  tf.addToPage(c.pagina, { x, y, width: w, height: h, font: c.f, borderWidth: 0, textColor: PRETO, hidden: opcoes.oculto });
  tf.setFontSize(opcoes.tam ?? 8);
  if (opcoes.centro) tf.setAlignment(TextAlignment.Center);
  if (opcoes.somenteLeitura) tf.enableReadOnly();
}

function linhaH(c: Ctx, x1: number, x2: number, y: number, cor = CINZA, esp = 0.5) {
  c.pagina.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: esp, color: cor });
}

export type DadosPdf = { id: string; version: number; ficha: FichaEditavel; dano: number; dono: string; geradoEm: Date };

export async function gerarPdf(d: DadosPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Ficha: ${d.ficha.nome}`);
  doc.setCreator("Cybermaster");
  doc.setProducer("Cybermaster");
  const pagina = doc.addPage([A4.w, A4.h]);
  const c: Ctx = { doc, pagina, f: await doc.embedFont(StandardFonts.Helvetica), fb: await doc.embedFont(StandardFonts.HelveticaBold) };
  const { ficha, dano } = d;
  const dd = ficha.dados;
  const GAP = 6;
  let y = A4.h - M;

  // ---- cabeçalho ----
  texto(c, "CYBERPUNK 2020 - FICHA", M, y - 15, 16, { negrito: true });
  texto(c, "CYBERMASTER · FERRAMENTA DE FÃ", A4.w - M - c.f.widthOfTextAtSize("CYBERMASTER · FERRAMENTA DE FÃ", 6.5), y - 14, 6.5, { cor: CINZA });
  y -= 20;
  c.pagina.drawRectangle({ x: M, y: y - 2.5, width: LARG, height: 2.5, color: PRETO });
  y -= 2.5 + GAP;

  // ---- identificação ----
  const hId = 28;
  const colsId = [
    { r: "Nome / Handle", w: 0.42 },
    { r: "Classe", w: 0.2 },
    { r: "Idade", w: 0.1 },
    { r: "Jogador", w: 0.28 },
  ];
  let x = M;
  colsId.forEach((col, i) => {
    const w = LARG * col.w - (i < colsId.length - 1 ? GAP : 0);
    caixa(c, x, y, w, hId);
    rotulo(c, col.r, x + 4, y - 8);
    if (i === 0) campo(c, CAMPO.nome, ficha.nome, x + 3, y - hId + 2, w - 6, 15, { tam: 11, maxLen: 60 });
    if (i === 1) texto(c, CLASSE_POR_ID.get(ficha.classe)?.nome ?? ficha.classe, x + 5, y - 22, 11, { negrito: true, largMax: w - 8 });
    if (i === 2) campo(c, CAMPO.idade, dd.idade === null ? "" : String(dd.idade), x + 3, y - hId + 2, w - 6, 15, { tam: 11, centro: true, maxLen: 3 });
    if (i === 3) texto(c, d.dono, x + 5, y - 22, 11, { largMax: w - 8 });
    x += w + (i < colsId.length - 1 ? GAP : 0);
  });
  y -= hId + GAP;

  // ---- atributos ----
  const hAtr = 38;
  const wAtr = (LARG - 8 * 4) / 9;
  SIGLAS.forEach((s, i) => {
    const xx = M + i * (wAtr + 4);
    caixa(c, xx, y, wAtr, hAtr);
    const t = s;
    texto(c, t, xx + (wAtr - c.fb.widthOfTextAtSize(t, 7)) / 2, y - 9, 7, { negrito: true });
    campo(c, CAMPO.atr(s), String(dd.atributos[s]), xx + 3, y - hAtr + 3, wAtr - 6, 22, { tam: 17, centro: true, maxLen: 2 });
  });
  y -= hAtr + 3;
  texto(c, `Pontos de personagem: ${PONTOS_PERSONAGEM} (regra da mesa) · cada atributo de 2 a 10 · AuCon = Autocontrole, SOR = Sorte, MOV = Movimento, TCO = Tipo Corporal`, M, y - 6, 5.4, { cor: CINZA, largMax: LARG });
  y -= 9 + GAP - 3;

  // ---- derivados (calculados pelo app, só leitura) ----
  const der = derivados(dd.atributos, custoCyberware(dd));
  const hDer = 24;
  const wDer = (LARG - (der.length - 1) * 4) / der.length;
  der.forEach((x0, i) => {
    const xx = M + i * (wDer + 4);
    caixa(c, xx, y, wDer, hDer);
    const r = x0.rotulo.replace(/\s*\(.*\)$/, "").toUpperCase();
    texto(c, r, xx + (wDer - c.fb.widthOfTextAtSize(paraWinAnsi(c.fb, r), 5.8)) / 2, y - 8, 5.8, { negrito: true });
    const v = paraWinAnsi(c.fb, x0.valor);
    texto(c, v, xx + (wDer - c.fb.widthOfTextAtSize(v, 11)) / 2, y - 20, 11, { negrito: true });
  });
  y -= hDer + GAP;

  // ---- perícias (calculadas pelo app, só leitura) ----
  const pericias = dd.pericias
    .map((p) => ({ p, i: infoPericia(p) }))
    .sort((a, b) => Number(b.i.especial) - Number(a.i.especial) || a.i.nome.localeCompare(b.i.nome, "pt-BR"));
  const hPer = 196;
  const yPer = caixa(c, M, y, LARG, hPer, "Perícias (nível · PE acumulados) · sobem pelo app com PE");
  const colunasPer = 3;
  const wColPer = LARG / colunasPer;
  const linhaPer = 8.6;
  const maxPorColuna = Math.floor((hPer - 11 - 6) / linhaPer);
  const cabem = maxPorColuna * colunasPer;
  // Distribui por igual entre as colunas.
  const porColuna = Math.min(maxPorColuna, Math.max(1, Math.ceil(pericias.length / colunasPer)));
  const visiveis = pericias.length > cabem ? pericias.slice(0, cabem - 1) : pericias;
  visiveis.forEach(({ p, i }, k) => {
    const col = Math.floor(k / porColuna);
    const lin = k % porColuna;
    const xx = M + col * wColPer + 4;
    const yy = yPer - 8 - lin * linhaPer;
    const nivel = `+${i.nivel}`;
    const meta = `${i.atributo ?? "-"}${i.mult > 1 ? ` x${i.mult}` : ""}`;
    texto(c, (i.especial ? "* " : "") + i.nome, xx, yy, 7, { negrito: i.especial, largMax: wColPer - 70 });
    texto(c, meta, xx + wColPer - 64, yy, 6, { cor: CINZA });
    texto(c, nivel, xx + wColPer - 36, yy, 7.5, { negrito: true });
    texto(c, p.pe ? String(p.pe) : "", xx + wColPer - 20, yy, 6, { cor: CINZA });
    linhaH(c, xx, xx + wColPer - 8, yy - 2.2, CINZA_CLARO);
  });
  if (visiveis.length < pericias.length) {
    texto(c, `+ ${pericias.length - visiveis.length} perícias no app`, M + (colunasPer - 1) * wColPer + 4, yPer - 8 - (porColuna - 1) * linhaPer, 7, { cor: CINZA });
  }
  for (let k = 1; k < colunasPer; k++) {
    c.pagina.drawLine({ start: { x: M + k * wColPer, y: yPer - 2 }, end: { x: M + k * wColPer, y: y - hPer + 3 }, thickness: 0.5, color: CINZA_CLARO });
  }
  y -= hPer + GAP;

  // ---- armas | armadura ----
  const hMeio = 102;
  const wArmas = LARG * 0.62 - GAP / 2;
  const wArmad = LARG - wArmas - GAP;
  let yy = caixa(c, M, y, wArmas, hMeio, "Armas");
  const hLinha = (hMeio - 11 - 10) / LINHAS_ARMAS;
  {
    let xx = M;
    for (const col of COLUNAS_ARMA) {
      rotulo(c, col.rotulo, xx + 3, yy - 7);
      xx += col.largura * wArmas;
    }
    yy -= 10;
    for (let i = 0; i < LINHAS_ARMAS; i++) {
      const a = dd.armas[i];
      let xc = M;
      for (const col of COLUNAS_ARMA) {
        const w = col.largura * wArmas;
        campo(c, CAMPO.arma(i, col.k), a?.[col.k] ?? "", xc + 2, yy - hLinha + 1.5, w - 4, hLinha - 3, { tam: 7.5, maxLen: col.k === "nome" ? 60 : 20 });
        xc += w;
      }
      yy -= hLinha;
      linhaH(c, M, M + wArmas, yy);
    }
    if (dd.armas.length > LINHAS_ARMAS) texto(c, `+ ${dd.armas.length - LINHAS_ARMAS} no app`, M + wArmas - 50, y - hMeio + 2.5, 5.5, { cor: CINZA });
  }
  {
    const xa = M + wArmas + GAP;
    let ya = caixa(c, xa, y, wArmad, hMeio, "Armadura (PB por local)");
    rotulo(c, "Local", xa + 4, ya - 7);
    rotulo(c, "1d10", xa + wArmad * 0.55, ya - 7);
    rotulo(c, "PB", xa + wArmad * 0.78, ya - 7);
    ya -= 9;
    const hl = 10.2;
    for (const l of LOCAIS) {
      texto(c, l.nome, xa + 4, ya - 7.6, 7.5);
      texto(c, l.d10, xa + wArmad * 0.55, ya - 7.6, 7, { cor: CINZA });
      campo(c, CAMPO.local(l.id), String(dd.armadura[l.id]), xa + wArmad * 0.74, ya - hl + 1, wArmad * 0.22, hl - 1.5, { tam: 8, centro: true, maxLen: 2 });
      ya -= hl;
      linhaH(c, xa, xa + wArmad, ya);
    }
    rotulo(c, "Armadura vestida", xa + 4, ya - 6);
    campo(c, CAMPO.armaduraDesc, dd.armadura.descricao, xa + 3, y - hMeio + 2, wArmad - 6, 11, { tam: 7, maxLen: 300 });
  }
  y -= hMeio + GAP;

  // ---- ferimentos: 40 caixas marcáveis ----
  const hFer = 46;
  const yf = caixa(c, M, y, LARG, hFer, "Ferimentos (marque o dano sofrido) · atord. = penalidade no teste contra atordoamento");
  const grupos = ESTADOS.length / 2;
  const wGrupo = LARG / grupos;
  const lado = 8.5;
  ESTADOS.forEach((e, i) => {
    const lin = Math.floor(i / grupos);
    const col = i % grupos;
    const xg = M + col * wGrupo + 5;
    const yg = yf - 9 - lin * 16;
    texto(c, e.nome, xg, yg, 6.5, { negrito: true });
    texto(c, `atord. ${e.atordoamento}`, xg, yg - 6.5, 5.3, { cor: CINZA });
    for (let k = 0; k < POR_ESTADO; k++) {
      const n = e.indice * POR_ESTADO + k + 1;
      const cb = c.doc.getForm().createCheckBox(CAMPO.dano(n));
      cb.addToPage(c.pagina, { x: xg + 42 + k * (lado + 2.5), y: yg - 6.5, width: lado, height: lado, borderColor: PRETO, borderWidth: 0.8 });
      if (n <= dano) cb.check();
    }
  });
  y -= hFer + GAP;

  // ---- cyberware | equipamento ----
  const hBaixo = 104;
  const wCyber = LARG * 0.55 - GAP / 2;
  const wEquip = LARG - wCyber - GAP;
  {
    let yc = caixa(c, M, y, wCyber, hBaixo, "Cyberware (CH = custo de humanidade)");
    rotulo(c, "Implante", M + 3, yc - 7);
    rotulo(c, "CH", M + wCyber * 0.45 + 3, yc - 7);
    rotulo(c, "Notas", M + wCyber * 0.55 + 3, yc - 7);
    yc -= 9;
    const hl = (hBaixo - 11 - 9 - 2) / LINHAS_CYBER;
    for (let i = 0; i < LINHAS_CYBER; i++) {
      const cy = dd.cyberware[i];
      campo(c, CAMPO.cyber(i, "nome"), cy?.nome ?? "", M + 2, yc - hl + 1.5, wCyber * 0.45 - 4, hl - 3, { tam: 7.5, maxLen: 80 });
      campo(c, CAMPO.cyber(i, "ch"), cy ? String(cy.ch) : "", M + wCyber * 0.45 + 2, yc - hl + 1.5, wCyber * 0.1 - 4, hl - 3, { tam: 7.5, centro: true, maxLen: 3 });
      campo(c, CAMPO.cyber(i, "notas"), cy?.notas ?? "", M + wCyber * 0.55 + 2, yc - hl + 1.5, wCyber * 0.45 - 4, hl - 3, { tam: 7, maxLen: 200 });
      yc -= hl;
      linhaH(c, M, M + wCyber, yc);
    }
    if (dd.cyberware.length > LINHAS_CYBER) texto(c, `+ ${dd.cyberware.length - LINHAS_CYBER} no app`, M + wCyber - 50, y - hBaixo + 2.5, 5.5, { cor: CINZA });
  }
  {
    const xe = M + wCyber + GAP;
    const ye = caixa(c, xe, y, wEquip, hBaixo, "Equipamento e dinheiro");
    rotulo(c, "Dinheiro (eurodólares)", xe + 4, ye - 7);
    campo(c, CAMPO.dinheiro, String(dd.dinheiro), xe + 3, ye - 21, wEquip * 0.5, 12, { tam: 9, maxLen: 10 });
    linhaH(c, xe, xe + wEquip, ye - 23);
    campo(c, CAMPO.equipamento, dd.equipamento, xe + 3, y - hBaixo + 3, wEquip - 6, hBaixo - 11 - 27, { tam: 7, multilinha: true, maxLen: 4000 });
  }
  y -= hBaixo + GAP;

  // ---- história ----
  const hHist = y - (M + 16);
  const yh = caixa(c, M, y, LARG, hHist, "História e contatos (Lifepath)");
  campo(c, CAMPO.historia, dd.historia, M + 3, y - hHist + 3, LARG - 6, yh - (y - hHist) - 3, { tam: 7.5, multilinha: true, maxLen: 8000 });

  // ---- rodapé e campos de controle ----
  const data = d.geradoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  const rod = `Ferramenta de fã, baseada em Cyberpunk 2020 © R. Talsorian Games. Não substitui o livro. · Gerado em ${data}, versão ${d.version}. Perícias e derivados são calculados pelo app; edite-os lá.`;
  texto(c, rod, M, M + 4, 5.5, { cor: CINZA, largMax: LARG });
  campo(c, CAMPO.ficha, d.id, 0, 0, 1, 1, { somenteLeitura: true, oculto: true });
  campo(c, CAMPO.versao, String(d.version), 0, 0, 1, 1, { somenteLeitura: true, oculto: true });

  c.doc.getForm().updateFieldAppearances(c.f);
  return doc.save({ useObjectStreams: false });
}

/** Nome de arquivo seguro para o download. */
export function nomeArquivo(nome: string): string {
  const base = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "-") || "ficha";
  return `${base.slice(0, 50)}.pdf`;
}
