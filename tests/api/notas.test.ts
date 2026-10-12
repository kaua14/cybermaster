import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as aceitarConvite } from "@/app/api/auth/convite/route";
import { POST as criarJogador } from "@/app/api/jogadores/route";
import { GET as listar, POST as criar } from "@/app/api/notas/route";
import { DELETE as apagar, PUT as salvar } from "@/app/api/notas/[id]/route";
import { adminDb, chamar, criarJogadorAtivo, entrarComoMestre } from "./helpers";

beforeEach(async () => {
  await adminDb()`truncate player, invite, session, login_throttle, master_credential, note cascade`;
});
afterAll(async () => {
  await adminDb().end();
});

describe("notas", () => {
  it("mestre cria, edita, lista e apaga", async () => {
    const mestre = await entrarComoMestre(login);
    const c = await chamar(criar, { corpo: { titulo: "Sessão 1", texto: "Gancho do caminhão" }, cliente: mestre });
    expect(c.status).toBe(201);
    const id = c.dados.nota.id;
    expect((await chamar(salvar, { metodo: "PUT", params: { id }, corpo: { titulo: "Sessão 1", texto: "Mudou" }, cliente: mestre })).status).toBe(200);
    const l = await chamar(listar, { metodo: "GET", cliente: mestre });
    expect(l.dados.notas).toMatchObject([{ id, texto: "Mudou" }]);
    expect((await chamar(apagar, { metodo: "DELETE", params: { id }, cliente: mestre })).status).toBe(200);
    expect((await chamar(listar, { metodo: "GET", cliente: mestre })).dados.notas).toEqual([]);
  });

  it("jogador não lê, não cria, não edita e não apaga notas", async () => {
    const mestre = await entrarComoMestre(login);
    const j = await criarJogadorAtivo(criarJogador, aceitarConvite, mestre, "Alfa");
    const id = (await chamar(criar, { corpo: { titulo: "Segredo do mestre", texto: "x" }, cliente: mestre })).dados.nota.id;
    expect((await chamar(listar, { metodo: "GET", cliente: j.cliente })).status).toBe(403);
    expect((await chamar(criar, { corpo: { titulo: "x", texto: "" }, cliente: j.cliente })).status).toBe(403);
    expect((await chamar(salvar, { metodo: "PUT", params: { id }, corpo: { titulo: "x", texto: "" }, cliente: j.cliente })).status).toBe(403);
    expect((await chamar(apagar, { metodo: "DELETE", params: { id }, cliente: j.cliente })).status).toBe(403);
  });
});
