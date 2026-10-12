import { describe, expect, it } from "vitest";
import { CLASSES } from "@/rules/classes";
import { correr, humanidade, mtc, salto } from "@/rules/derivados";
import { custoProximoNivel } from "@/rules/experiencia";
import { atributosFeridos, avisos, estadoDoDano } from "@/rules/ferimentos";
import { dadosIniciais, FichaEditavelSchema, resumo, travarCriacao, type FichaEditavel } from "@/rules/ficha";
import { PERICIA_POR_ID, PERICIAS } from "@/rules/pericias";

describe("dados de regras", () => {
  it("toda perícia tem página", () => {
    for (const p of PERICIAS) expect(p.fonte.pagina, p.id).toMatch(/\d/);
  });
  it("ids únicos", () => {
    expect(new Set(PERICIAS.map((p) => p.id)).size).toBe(PERICIAS.length);
  });
  it("cada classe tem 10 vagas, todas com perícias conhecidas, começando pela habilidade especial", () => {
    expect(CLASSES).toHaveLength(10);
    for (const c of CLASSES) {
      expect(c.pacote, c.id).toHaveLength(10);
      expect(c.pacote[0]).toBe(c.habilidade);
      expect(PERICIA_POR_ID.get(c.habilidade)?.especial, c.id).toBe(true);
      for (const v of c.pacote) for (const id of typeof v === "string" ? [v] : v.opcoes) expect(PERICIA_POR_ID.has(id), `${c.id}: ${id}`).toBe(true);
    }
  });
});

describe("derivados", () => {
  it("corrida, salto e MTC", () => {
    expect(correr(6)).toBe(18);
    expect(salto(6)).toBe(4.5);
    expect([2, 3, 4, 5, 7, 8, 9, 10].map(mtc)).toEqual([0, -1, -1, -2, -2, -3, -3, -4]);
  });
  it("humanidade: −1 EMP a cada 10 pontos perdidos", () => {
    expect(humanidade(8, 0)).toEqual({ base: 80, atual: 80, empAtual: 8 });
    expect(humanidade(8, 19)).toEqual({ base: 80, atual: 61, empAtual: 7 });
    expect(humanidade(8, 20)).toEqual({ base: 80, atual: 60, empAtual: 6 });
  });
});

describe("ferimentos", () => {
  it("estado pela trilha de 40 caixas", () => {
    expect(estadoDoDano(0)).toBeNull();
    expect(estadoDoDano(1)?.nome).toBe("Leve");
    expect(estadoDoDano(4)?.nome).toBe("Leve");
    expect(estadoDoDano(5)?.nome).toBe("Grave");
    expect(estadoDoDano(12)?.nome).toBe("Crítico");
    expect(estadoDoDano(13)?.nome).toBe("Mortal 0");
    expect(estadoDoDano(40)?.nome).toBe("Mortal 6");
    expect(estadoDoDano(40)?.atordoamento).toBe(-9);
  });
  it("efeitos em REF, INT e AuCon", () => {
    const a = { INT: 7, REF: 9, TEC: 5, AuCon: 5, ATR: 5, SOR: 5, MOV: 5, TCO: 8, EMP: 5 };
    expect(atributosFeridos(a, 3)).toEqual({ REF: 9, INT: 7, AuCon: 5 });
    expect(atributosFeridos(a, 6)).toEqual({ REF: 7, INT: 7, AuCon: 5 });
    expect(atributosFeridos(a, 10)).toEqual({ REF: 5, INT: 4, AuCon: 3 });
    expect(atributosFeridos(a, 20)).toEqual({ REF: 3, INT: 3, AuCon: 2 });
  });
  it("alvos dos testes", () => {
    expect(avisos(8, 6).atordoamento).toContain("1d10 ≤ 7");
    expect(avisos(8, 6).morte).toBeNull();
    expect(avisos(10, 30).morte).toContain("1d10 ≤ 6"); // Mortal 4, exemplo do livro
  });
});

describe("PE", () => {
  it("custos do livro", () => {
    expect(custoProximoNivel(0, 1)).toBe(10);
    expect(custoProximoNivel(4, 1)).toBe(40);
    expect(custoProximoNivel(5, 1)).toBe(50);
    expect(custoProximoNivel(4, 3)).toBe(120); // exemplo do Choi Li Fut
    expect(custoProximoNivel(10, 1)).toBeNull();
  });
});

describe("pontos de criação", () => {
  const base = (): FichaEditavel => ({ nome: "V", classe: "solo", dados: dadosIniciais("cinematografico", 60, "solo") });
  const pericia = (f: FichaEditavel, chave: string) => {
    let p = f.dados.pericias.find((x) => x.chave === chave);
    if (!p) f.dados.pericias.push((p = { chave, carreira: 0, opcional: 0, melhoria: 0, pe: 0 }));
    return p;
  };

  it("ficha inicial é válida no schema e sem problemas", () => {
    const f = base();
    expect(FichaEditavelSchema.safeParse(f).success).toBe(true);
    expect(resumo(f.classe, f.dados).problemas).toEqual([]);
    expect(f.dados.pericias.map((p) => p.chave)).toContain("nocao-combate");
  });
  it("carreira só em perícia profissional e até 40", () => {
    const f = base();
    pericia(f, "programacao").carreira = 3;
    expect(resumo(f.classe, f.dados).problemas.join()).toMatch(/não é Perícia Profissional/);
    const g = base();
    for (const id of ["nocao-combate", "atencao", "armas-curtas", "fuzil", "atletismo"]) pericia(g, id).carreira = 9;
    expect(resumo(g.classe, g.dados).carreira.usados).toBe(45);
    expect(resumo(g.classe, g.dados).problemas.join()).toMatch(/45 de 40/);
  });
  it("vaga de escolha: Briga OU uma arte marcial", () => {
    const f = base();
    pericia(f, "briga").carreira = 2;
    expect(resumo(f.classe, f.dados).problemas).toEqual([]);
    pericia(f, "am-karate").carreira = 2;
    expect(resumo(f.classe, f.dados).problemas.join()).toMatch(/no máximo 1/);
  });
  it("opcionais: REF + INT, nunca em perícia profissional", () => {
    const f = base();
    f.dados.atributos.REF = 8;
    f.dados.atributos.INT = 6;
    pericia(f, "conducao").opcional = 5;
    expect(resumo(f.classe, f.dados).opcionais).toEqual({ usados: 5, total: 14 });
    pericia(f, "fuzil").opcional = 1;
    expect(resumo(f.classe, f.dados).problemas.join()).toMatch(/pontos opcionais não podem/);
  });
  it("atributos passam do total", () => {
    const f = base();
    for (const k of Object.keys(f.dados.atributos) as (keyof typeof f.dados.atributos)[]) f.dados.atributos[k] = 8;
    expect(resumo(f.classe, f.dados).problemas.join()).toMatch(/72 de 60/);
  });
  it("método rápido: cada atributo pelo menos 3, sem total", () => {
    const f = base();
    f.dados.metodo = "rapido";
    f.dados.pontos = null;
    expect(resumo(f.classe, f.dados).problemas.join()).toMatch(/pelo menos 3/);
  });
  it("depois de concluída, o jogador não muda atributos nem pontos de perícia", () => {
    const antes = base();
    pericia(antes, "fuzil").carreira = 5;
    pericia(antes, "fuzil").pe = 12;
    const depois = structuredClone(antes);
    depois.nome = "Outro nome";
    depois.classe = "netrunner";
    depois.dados.atributos.REF = 10;
    pericia(depois, "fuzil").carreira = 10;
    pericia(depois, "conducao").opcional = 4;
    depois.dados.pericias = depois.dados.pericias.filter((p) => p.chave !== "fuzil" || true);
    depois.dados.dinheiro = 500;
    const r = travarCriacao(antes, depois);
    expect(r.nome).toBe("Outro nome");
    expect(r.classe).toBe("solo");
    expect(r.dados.atributos.REF).toBe(2);
    expect(r.dados.pericias.find((p) => p.chave === "fuzil")).toMatchObject({ carreira: 5, pe: 12 });
    expect(r.dados.pericias.find((p) => p.chave === "conducao")).toMatchObject({ opcional: 0 });
    expect(r.dados.dinheiro).toBe(500);
    const semFuzil = structuredClone(antes);
    semFuzil.dados.pericias = semFuzil.dados.pericias.filter((p) => p.chave !== "fuzil");
    expect(travarCriacao(antes, semFuzil).dados.pericias.some((p) => p.chave === "fuzil")).toBe(true);
  });
});
