import { describe, expect, it } from "vitest";
import { atraso } from "@/server/auth/throttle";
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
