import { existsSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as aceitarConvite } from "@/app/api/auth/convite/route";
import { POST as criarJogador } from "@/app/api/jogadores/route";
import { POST as criar } from "@/app/api/fichas/route";
import { DELETE as apagar, GET as ler, PUT as salvar } from "@/app/api/fichas/[id]/route";
import { POST as concluir } from "@/app/api/fichas/[id]/concluir/route";
import { GET as baixar } from "@/app/api/fichas/[id]/pdf/route";
import { POST as importar } from "@/app/api/fichas/[id]/pdf/importar/route";
import { POST as aplicar } from "@/app/api/fichas/[id]/pdf/aplicar/route";
import { GET as historico } from "@/app/api/fichas/[id]/historico/route";
import { CAMPO } from "@/server/pdf/gerar";
import { adminDb, chamar, criarJogadorAtivo, entrarComoMestre, type Cliente } from "./helpers";

const jogador = (mestre: Cliente, nome: string) => criarJogadorAtivo(criarJogador, aceitarConvite, mestre, nome);
async function novaFicha(cliente: Cliente, nome = "Raven") {
  const r = await chamar(criar, { corpo: { nome, classe: "solo" }, cliente });
  return r.dados.id as string;
}
async function pdf(cliente: Cliente, id: string) {
  const r = await chamar(baixar, { metodo: "GET", params: { id }, cliente });
  expect(r.status).toBe(200);
  return r.bytes!;
}
async function editar(bytes: Uint8Array, mudar: (form: ReturnType<PDFDocument["getForm"]>) => void) {
  const doc = await PDFDocument.load(bytes);
  mudar(doc.getForm());
  return doc.save();
}
const enviar = (cliente: Cliente, id: string, bytes: Uint8Array) => chamar(importar, { params: { id }, cliente, bruto: bytes, tipo: "application/pdf" });

beforeEach(async () => {
  await adminDb()`truncate player, invite, session, login_throttle, master_credential, character, character_log cascade`;
});
afterAll(async () => {
  await adminDb().end();
});

describe("download do PDF", () => {
  it("o dono e o mestre baixam; outro jogador não", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const b = await jogador(mestre, "Beta");
    const idB = await novaFicha(b.cliente, "Ficha da Beta");
    const r = await chamar(baixar, { metodo: "GET", params: { id: idB }, cliente: b.cliente });
    expect(r.status).toBe(200);
    expect(r.headers!.get("content-disposition")).toMatch(/attachment; filename="Ficha-da-Beta.pdf"/);
    expect(Buffer.from(r.bytes!.subarray(0, 5)).toString()).toBe("%PDF-");
    expect((await chamar(baixar, { metodo: "GET", params: { id: idB }, cliente: mestre })).status).toBe(200);
    const alheio = await chamar(baixar, { metodo: "GET", params: { id: idB }, cliente: a.cliente });
    expect(alheio.status).toBe(404);
    expect(alheio.bytes).toBeUndefined();
  });

  it("downloads simultâneos da mesma ficha não se atropelam", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    const rs = await Promise.all(Array.from({ length: 5 }, () => chamar(baixar, { metodo: "GET", params: { id }, cliente: a.cliente })));
    expect(rs.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
  });

  it("fica guardado em disco e é refeito quando a ficha muda", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    await pdf(a.cliente, id);
    const [linha] = await adminDb()`select pdf_path, pdf_chave, version from character where id = ${id}`;
    expect(linha.pdf_path).toBe(`fichas/${id}.pdf`);
    expect(existsSync(path.join(process.env.STORAGE_DIR!, linha.pdf_path))).toBe(true);
    expect(linha.pdf_chave).toBe(`${linha.version}:0`);

    const f = (await chamar(ler, { metodo: "GET", params: { id }, cliente: a.cliente })).dados.ficha;
    await chamar(salvar, { metodo: "PUT", params: { id }, corpo: { nome: "Novo Nome", classe: f.classe, dados: f.dados, version: f.version }, cliente: a.cliente });
    const doc = await PDFDocument.load(await pdf(a.cliente, id));
    expect(doc.getForm().getTextField(CAMPO.nome).getText()).toBe("Novo Nome");

    await chamar(apagar, { metodo: "DELETE", params: { id }, cliente: a.cliente });
    expect(existsSync(path.join(process.env.STORAGE_DIR!, linha.pdf_path))).toBe(false);
  });
});

describe("importar PDF", () => {
  it("mostra o diff, não grava nada, e grava só ao confirmar", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    const editado = await editar(await pdf(a.cliente, id), (form) => {
      form.getTextField(CAMPO.atr("REF")).setText("9");
      form.getTextField(CAMPO.dinheiro).setText("750");
      form.getCheckBox(CAMPO.dano(1)).check();
    });
    const r = await enviar(a.cliente, id, editado);
    expect(r.status, JSON.stringify(r.dados)).toBe(200);
    expect(r.dados.mudancas.map((m: { campo: string }) => m.campo)).toEqual(["REF (Reflexos)", "Dinheiro", "Dano"]);
    expect(r.dados.ignorados).toEqual([]);

    const antes = (await chamar(ler, { metodo: "GET", params: { id }, cliente: a.cliente })).dados.ficha;
    expect(antes.dados.dinheiro).toBe(0);

    const ok = await chamar(aplicar, { params: { id }, cliente: a.cliente, corpo: { ...r.dados.proposta, dano: r.dados.dano, version: r.dados.version } });
    expect(ok.status).toBe(200);
    const depois = (await chamar(ler, { metodo: "GET", params: { id }, cliente: a.cliente })).dados.ficha;
    expect(depois.dados.atributos.REF).toBe(9);
    expect(depois.dados.dinheiro).toBe(750);
    expect(depois.dano).toBe(1);
    const h = (await chamar(historico, { metodo: "GET", params: { id }, cliente: a.cliente })).dados.historico;
    expect(h[0]).toMatchObject({ tipo: "pdf", autor: "Alfa" });
    expect(h[0].descricao).toMatch(/atributos.*dinheiro.*dano/);

    // Confirmar de novo com a versão velha: conflito.
    expect((await chamar(aplicar, { params: { id }, cliente: a.cliente, corpo: { ...r.dados.proposta, dano: 0, version: r.dados.version } })).status).toBe(409);
  });

  it("jogador não importa PDF na ficha de outro, nem aplica", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const b = await jogador(mestre, "Beta");
    const idB = await novaFicha(b.cliente);
    const bytes = await pdf(b.cliente, idB);
    expect((await enviar(a.cliente, idB, bytes)).status).toBe(404);
    const f = (await chamar(ler, { metodo: "GET", params: { id: idB }, cliente: b.cliente })).dados.ficha;
    expect((await chamar(aplicar, { params: { id: idB }, cliente: a.cliente, corpo: { nome: "x", classe: f.classe, dados: f.dados, dano: 0, version: f.version } })).status).toBe(404);
  });

  it("PDF de outra ficha é recusado", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id1 = await novaFicha(a.cliente, "Um");
    const id2 = await novaFicha(a.cliente, "Dois");
    const r = await enviar(a.cliente, id2, await pdf(a.cliente, id1));
    expect(r.status).toBe(400);
    expect(r.dados.erro).toMatch(/outra ficha/);
  });

  it("arquivo que não é PDF e arquivo grande demais", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    expect((await enviar(a.cliente, id, new TextEncoder().encode("MZ executável"))).status).toBe(415);
    const grande = new Uint8Array(2 * 1024 * 1024 + 10);
    grande.set(new TextEncoder().encode("%PDF-1.7"));
    expect((await enviar(a.cliente, id, grande)).status).toBe(413);
  });

  it("criação concluída: mudança de atributo no PDF aparece como ignorada para o jogador", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    expect((await chamar(concluir, { params: { id }, cliente: a.cliente })).status).toBe(200);
    const editado = await editar(await pdf(a.cliente, id), (form) => {
      form.getTextField(CAMPO.atr("REF")).setText("10");
      form.getTextField(CAMPO.dinheiro).setText("100");
    });
    const r = await enviar(a.cliente, id, editado);
    expect(r.dados.mudancas.map((m: { campo: string }) => m.campo)).toEqual(["Dinheiro"]);
    expect(r.dados.ignorados).toEqual(["REF (Reflexos)"]);
    // Mesmo mandando a proposta adulterada, o servidor reaplica a trava.
    const adulterada = structuredClone(r.dados.proposta);
    adulterada.dados.atributos.REF = 10;
    await chamar(aplicar, { params: { id }, cliente: a.cliente, corpo: { ...adulterada, dano: 0, version: r.dados.version } });
    expect((await chamar(ler, { metodo: "GET", params: { id }, cliente: a.cliente })).dados.ficha.dados.atributos.REF).toBe(2);
  });

  it("sem token CSRF a importação é recusada", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    const r = await chamar(importar, { params: { id }, cliente: { ...a.cliente, csrf: undefined }, bruto: await pdf(a.cliente, id), tipo: "application/pdf" });
    expect(r.status).toBe(403);
  });
});
