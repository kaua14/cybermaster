import { describe, expect, it } from "vitest";
import { atraso } from "@/server/auth/throttle";
import { ipCliente } from "@/server/http";
import { gerarCodigoConvite, iguais, normalizarCodigo } from "@/server/auth/tokens";
import { cookieApagado, cookieSessao, tokenDoCookie } from "@/server/auth/session";

describe("atraso progressivo", () => {
  it("libera as duas primeiras falhas e depois dobra até 15 min", () => {
    expect([1, 2, 3, 4, 5, 6].map(atraso)).toEqual([0, 0, 1, 2, 4, 8]);
    expect(atraso(50)).toBe(900);
  });
});

describe("código de convite", () => {
  it("tem 12 caracteres sem ambíguos, em grupos de 4", () => {
    for (let i = 0; i < 50; i++) expect(gerarCodigoConvite()).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });
  it("normaliza o que o jogador digita", () => {
    expect(normalizarCodigo(" abcd-efgh jk23 ")).toBe("ABCDEFGHJK23");
  });
});

describe("cookie de sessão", () => {
  it("sai com HttpOnly, Secure, SameSite=Lax e prazo", () => {
    process.env.COOKIE_SECURE = "1";
    const c = cookieSessao("tok");
    expect(c).toContain("__Host-cm_sessao=tok");
    for (const f of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age="]) expect(c).toContain(f);
    expect(cookieApagado()).toContain("Max-Age=0");
  });
  it("lê o token do cabeçalho Cookie", () => {
    process.env.COOKIE_SECURE = "1";
    expect(tokenDoCookie("a=1; __Host-cm_sessao=xyz; b=2")).toBe("xyz");
    expect(tokenDoCookie("cm_sessao=xyz")).toBeUndefined();
  });
});

describe("comparação de tokens", () => {
  it("compara em tempo constante e trata tamanhos diferentes", () => {
    expect(iguais("abc", "abc")).toBe(true);
    expect(iguais("abc", "abd")).toBe(false);
    expect(iguais("abc", "abcd")).toBe(false);
  });
});

describe("IP do cliente", () => {
  const req = (h: Record<string, string>) => new Request("http://cm.test/", { headers: h });
  it("servidor próprio: usa o cabeçalho que o server.mjs sobrescreve", () => {
    expect(ipCliente(req({ "x-cm-client-ip": "10.0.0.1", "x-real-ip": "1.2.3.4" }))).toBe("10.0.0.1");
  });
  it("Vercel: ignora x-cm-client-ip forjado e usa o x-real-ip da Vercel", () => {
    process.env.VERCEL = "1";
    try {
      expect(ipCliente(req({ "x-cm-client-ip": "forjado", "x-real-ip": "1.2.3.4" }))).toBe("1.2.3.4");
    } finally {
      delete process.env.VERCEL;
    }
  });
});
