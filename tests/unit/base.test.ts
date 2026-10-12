import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ATRIBUTO_MAX, ATRIBUTO_MIN, SIGLAS } from "@/rules/atributos";
import { BASE, CATEGORIAS } from "@/rules/base";
import { GANCHOS, gerarGancho, gerarNpc, npcComoTexto } from "@/rules/geradores";

describe("base de regras", () => {
  it("toda regra tem página do livro, e as não confirmadas têm nota dizendo o que conferir", () => {
    for (const r of BASE) {
      expect(r.fonte.pagina, r.id).toMatch(/\d/);
      if (r.fonte.verificar) expect(r.fonte.nota, r.id).toBeTruthy();
    }
  });
  it("ids únicos, categoria conhecida, resumo e palavras-chave", () => {
    expect(new Set(BASE.map((r) => r.id)).size).toBe(BASE.length);
    for (const r of BASE) {
      expect(Object.keys(CATEGORIAS)).toContain(r.categoria);
      expect(r.resumo.length, r.id).toBeGreaterThan(30);
      expect(r.palavras.length, r.id).toBeGreaterThan(2);
    }
  });
  it("tabelas com linhas do mesmo tamanho do cabeçalho", () => {
    for (const r of BASE) for (const l of r.tabela?.linhas ?? []) expect(l.length, r.id).toBe(r.tabela!.colunas.length);
  });
});

describe("geradores", () => {
  // Gerador previsível para o teste.
  const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };

  it("NPC com atributos válidos e texto completo", () => {
    for (const tipo of ["rua", "gangue", "corporativo"] as const) {
      for (let k = 0; k < 50; k++) {
        const n = gerarNpc(tipo);
        for (const s of SIGLAS) expect(n.atributos[s]).toBeGreaterThanOrEqual(ATRIBUTO_MIN), expect(n.atributos[s]).toBeLessThanOrEqual(ATRIBUTO_MAX);
        expect(npcComoTexto(n)).toMatch(/NOME: .*\nCLASSE: .*/);
      }
    }
  });
  it("gancho troca o {n}", () => {
    expect(gerarGancho(seq(0, 0.5))).toBe(GANCHOS[0].replace("{n}", "50"));
    for (let k = 0; k < 50; k++) expect(gerarGancho()).not.toContain("{n}");
  });
});

describe("sem Mesa", () => {
  it("não há rota nem tela de mesa, iniciativa, dados ou localização de tiro", async () => {
    const arquivos: string[] = [];
    async function varrer(dir: string) {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await varrer(p);
        else arquivos.push(p);
      }
    }
    await varrer(path.resolve("src/app"));
    expect(arquivos.filter((f) => /[/\\](mesa|iniciativa|dados|rolar)[/\\]/i.test(f))).toEqual([]);
    for (const f of arquivos.filter((x) => /\.tsx?$/.test(x))) {
      const t = await readFile(f, "utf8");
      expect(t, f).not.toMatch(/Rolar iniciativa|Rolar dados|Rolar localização|function rolar/i);
    }
  });
});
