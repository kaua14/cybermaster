import { PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { diferencas } from "@/rules/diff";
import { dadosIniciais, type FichaEditavel } from "@/rules/ficha";
import { CAMPO, gerarPdf, paraWinAnsi } from "@/server/pdf/gerar";
import { lerCampos, montarProposta } from "@/server/pdf/importar";

const ID = "11111111-2222-3333-4444-555555555555";

function ficha(): FichaEditavel {
  const dados = dadosIniciais("cinematografico", 75, "solo");
  dados.atributos.REF = 9;
  dados.idade = 25;
  dados.armas = [{ nome: "Pistola", tipo: "P", prec: "0", dano: "2d6", mun: "12", cdt: "2", alcance: "50 m" }];
  dados.historia = "Nasceu em Night City — “a cidade”. ☠";
  return { nome: "Ravén", classe: "solo", dados };
}
const gerar = (f = ficha(), dano = 3) => gerarPdf({ id: ID, version: 4, ficha: f, dano, dono: "Kauã", geradoEm: new Date() });
let limpar: (s: string) => string;
const limpador = async () => {
  if (!limpar) {
    const fonte = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    limpar = (s) => paraWinAnsi(fonte, s);
  }
  return limpar;
};

/** Simula a edição num leitor de PDF: muda campos e salva. */
async function editar(bytes: Uint8Array, mudar: (form: ReturnType<PDFDocument["getForm"]>) => void) {
  const doc = await PDFDocument.load(bytes);
  mudar(doc.getForm());
  return doc.save();
}

describe("PDF gerado", () => {
  it("é A4, uma página, com campos de formulário preenchidos", async () => {
    const doc = await PDFDocument.load(await gerar());
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
    const form = doc.getForm();
    expect(form.getTextField(CAMPO.nome).getText()).toBe("Ravén");
    expect(form.getTextField(CAMPO.atr("REF")).getText()).toBe("9");
    expect(form.getTextField(CAMPO.arma(0, "dano")).getText()).toBe("2d6");
    expect(form.getCheckBox(CAMPO.dano(3)).isChecked()).toBe(true);
    expect(form.getCheckBox(CAMPO.dano(4)).isChecked()).toBe(false);
    expect(form.getTextField(CAMPO.ficha).getText()).toBe(ID);
    expect(form.getTextField(CAMPO.ficha).isReadOnly()).toBe(true);
  });

  it("caracteres fora do PDF viram ? sem quebrar a geração", async () => {
    const f = await limpador();
    expect(f("— “a” ☠ − ≤")).toBe("— “a” ? - <=");
  });
});

describe("importar PDF", () => {
  it("ida e volta sem mudanças não gera diferenças (nem pelos caracteres trocados)", async () => {
    const f = ficha();
    const v = await lerCampos(await gerar(f));
    const p = montarProposta({ ficha: f, dano: 3 }, v, await limpador());
    expect(p.avisos).toEqual([]);
    expect(diferencas({ ficha: f, dano: 3 }, p)).toEqual([]);
    expect(p.ficha.dados.historia).toBe(f.dados.historia); // o ☠ original continua no banco
  });

  it("lê o que foi editado fora do app", async () => {
    const f = ficha();
    const editado = await editar(await gerar(f), (form) => {
      form.getTextField(CAMPO.nome).setText("Raven 2");
      form.getTextField(CAMPO.atr("TCO")).setText("8");
      form.getTextField(CAMPO.arma(1, "nome")).setText("Faca");
      form.getTextField(CAMPO.local("torso")).setText("18");
      form.getTextField(CAMPO.dinheiro).setText("500");
      form.getCheckBox(CAMPO.dano(4)).check();
      form.getCheckBox(CAMPO.dano(5)).check();
    });
    const p = montarProposta({ ficha: f, dano: 3 }, await lerCampos(editado), await limpador());
    const campos = diferencas({ ficha: f, dano: 3 }, p).map((m) => m.campo);
    expect(campos).toEqual(["Nome", "TCO (Tipo Corporal)", "Arma 2", "PB Torso", "Dinheiro", "Dano"]);
    expect(p.dano).toBe(5);
    expect(p.ficha.dados.armas[1]).toMatchObject({ nome: "Faca" });
  });

  it("valor inválido vira aviso e mantém o atual", async () => {
    const f = ficha();
    const editado = await editar(await gerar(f), (form) => {
      form.getTextField(CAMPO.atr("REF")).setText("12");
      form.getTextField(CAMPO.dinheiro).setText("muito");
    });
    const p = montarProposta({ ficha: f, dano: 3 }, await lerCampos(editado), await limpador());
    expect(p.ficha.dados.atributos.REF).toBe(9);
    expect(p.avisos.join(" ")).toMatch(/REF.*entre 2 e 10/);
    expect(p.avisos.join(" ")).toMatch(/Dinheiro/);
  });

  it("recusa o que não é PDF, PDF grande, PDF sem formulário e PDF de outro gerador", async () => {
    await expect(lerCampos(new TextEncoder().encode("<html>oi</html>"))).rejects.toThrow(/não é um PDF/);
    await expect(lerCampos(new Uint8Array(3 * 1024 * 1024))).rejects.toThrow(/grande demais/);
    const vazio = await (await PDFDocument.create()).save();
    await expect(lerCampos(vazio)).rejects.toThrow(/não foi gerado pelo Cybermaster|não tem campos/);
    const outro = await PDFDocument.create();
    outro.addPage();
    outro.getForm().createTextField("nome").setText("x");
    await expect(lerCampos(await outro.save())).rejects.toThrow(/não foi gerado pelo Cybermaster/);
  });

  it("PDF com JavaScript embutido: só os campos são lidos, nada é executado", async () => {
    const doc = await PDFDocument.load(await gerar());
    // Ação que um leitor rodaria ao abrir. O app só lê os valores dos campos.
    const js = doc.context.obj({ Type: "Action", S: "JavaScript", JS: PDFString.of("globalThis.__pwned = true") });
    doc.catalog.set(PDFName.of("OpenAction"), js);
    const v = await lerCampos(await doc.save());
    expect(v.texto.get(CAMPO.ficha)).toBe(ID);
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
  });
});
