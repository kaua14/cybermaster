import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as aceitarConvite } from "@/app/api/auth/convite/route";
import { POST as trocarSenha } from "@/app/api/conta/senha/route";
import { POST as criarJogador } from "@/app/api/jogadores/route";
import { POST as senhaTemporaria } from "@/app/api/jogadores/[id]/senha-temporaria/route";
import { GET as listar, POST as criar } from "@/app/api/fichas/route";
import { DELETE as apagar, GET as ler, PUT as salvar } from "@/app/api/fichas/[id]/route";
import { POST as dano } from "@/app/api/fichas/[id]/dano/route";
import { POST as darPe } from "@/app/api/fichas/[id]/pe/route";
import { POST as subir } from "@/app/api/fichas/[id]/subir/route";
import { POST as concluir } from "@/app/api/fichas/[id]/concluir/route";
import { POST as reabrir } from "@/app/api/fichas/[id]/reabrir/route";
import { GET as historico } from "@/app/api/fichas/[id]/historico/route";
import { adminDb, chamar, clienteDe, criarJogadorAtivo, entrarComoMestre, novoIp, type Cliente } from "./helpers";

const jogador = (mestre: Cliente, nome: string) => criarJogadorAtivo(criarJogador, aceitarConvite, mestre, nome);

async function novaFicha(cliente: Cliente, extra: Record<string, unknown> = {}) {
  const r = await chamar(criar, { corpo: { nome: "Raven", classe: "solo", metodo: "aleatorio", pontos: 50, ...extra }, cliente });
  expect(r.status, JSON.stringify(r.dados)).toBe(201);
  return r.dados.id as string;
}
async function lerFicha(cliente: Cliente, id: string) {
  const r = await chamar(ler, { metodo: "GET", params: { id }, cliente });
  expect(r.status).toBe(200);
  return r.dados.ficha;
}
const editavel = (f: { nome: string; classe: string; dados: unknown; version: number }) => ({ nome: f.nome, classe: f.classe, dados: structuredClone(f.dados), version: f.version });

beforeEach(async () => {
  await adminDb()`truncate player, invite, session, login_throttle, master_credential, character, character_log cascade`;
});
afterAll(async () => {
  await adminDb().end();
});

describe("isolamento entre jogadores", () => {
  it("jogador A não vê, não edita, não marca dano, não sobe perícia nem apaga a ficha de B", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const b = await jogador(mestre, "Beta");
    const idB = await novaFicha(b.cliente);
    const fichaB = await lerFicha(b.cliente, idB);

    expect((await chamar(ler, { metodo: "GET", params: { id: idB }, cliente: a.cliente })).status).toBe(404);
    expect((await chamar(historico, { metodo: "GET", params: { id: idB }, cliente: a.cliente })).status).toBe(404);
    expect((await chamar(salvar, { metodo: "PUT", params: { id: idB }, corpo: { ...editavel(fichaB), nome: "Roubada" }, cliente: a.cliente })).status).toBe(404);
    expect((await chamar(dano, { params: { id: idB }, corpo: { dano: 40 }, cliente: a.cliente })).status).toBe(404);
    expect((await chamar(subir, { params: { id: idB }, corpo: { chave: "fuzil" }, cliente: a.cliente })).status).toBe(404);
    expect((await chamar(concluir, { params: { id: idB }, cliente: a.cliente })).status).toBe(404);
    expect((await chamar(apagar, { metodo: "DELETE", params: { id: idB }, cliente: a.cliente })).status).toBe(404);

    const lista = await chamar(listar, { metodo: "GET", cliente: a.cliente });
    expect(lista.dados.fichas).toEqual([]);
    // Filtro por jogador na URL é ignorado para jogador.
    const comFiltro = await chamar(listar, { metodo: "GET", cliente: a.cliente, query: `jogador=${b.id}` });
    expect(comFiltro.dados.fichas).toEqual([]);

    const intacta = await lerFicha(b.cliente, idB);
    expect(intacta.nome).toBe("Raven");
    expect(intacta.dano).toBe(0);
  });

  it("jogador não cria ficha em nome de outro", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const b = await jogador(mestre, "Beta");
    const id = await novaFicha(a.cliente, { jogadorId: b.id });
    const f = await lerFicha(mestre, id);
    expect(f.dono.id).toBe(a.id);
  });

  it("mestre vê e edita todas", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const b = await jogador(mestre, "Beta");
    await novaFicha(a.cliente);
    const idB = await novaFicha(b.cliente);
    const lista = await chamar(listar, { metodo: "GET", cliente: mestre });
    expect(lista.dados.fichas).toHaveLength(2);
    const soB = await chamar(listar, { metodo: "GET", cliente: mestre, query: `jogador=${b.id}` });
    expect(soB.dados.fichas.map((f: { id: string }) => f.id)).toEqual([idB]);
    const f = await lerFicha(mestre, idB);
    const r = await chamar(salvar, { metodo: "PUT", params: { id: idB }, corpo: { ...editavel(f), nome: "Editada pelo mestre" }, cliente: mestre });
    expect(r.status).toBe(200);
  });

  it("id inválido ou inexistente: 404", async () => {
    const mestre = await entrarComoMestre(login);
    expect((await chamar(ler, { metodo: "GET", params: { id: "x" }, cliente: mestre })).status).toBe(404);
    expect((await chamar(ler, { metodo: "GET", params: { id: "00000000-0000-0000-0000-000000000000" }, cliente: mestre })).status).toBe(404);
  });
});

describe("criação", () => {
  it("jogador não usa o método cinematográfico", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const r = await chamar(criar, { corpo: { nome: "X", classe: "solo", metodo: "cinematografico", pontos: 80 }, cliente: a.cliente });
    expect(r.status).toBe(403);
    const ok = await chamar(criar, { corpo: { nome: "X", classe: "solo", metodo: "cinematografico", pontos: 80, jogadorId: a.id }, cliente: mestre });
    expect(ok.status).toBe(201);
  });

  it("salvar com versão velha dá conflito", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    const f = await lerFicha(a.cliente, id);
    expect((await chamar(salvar, { metodo: "PUT", params: { id }, corpo: { ...editavel(f), nome: "1" }, cliente: a.cliente })).status).toBe(200);
    expect((await chamar(salvar, { metodo: "PUT", params: { id }, corpo: { ...editavel(f), nome: "2" }, cliente: a.cliente })).status).toBe(409);
  });

  it("schema recusa atributo fora de 2–10", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    const f = editavel(await lerFicha(a.cliente, id)) as { dados: { atributos: Record<string, number> } };
    f.dados.atributos.REF = 11;
    expect((await chamar(salvar, { metodo: "PUT", params: { id }, corpo: f, cliente: a.cliente })).status).toBe(400);
  });

  it("não conclui com pontos estourados; depois de concluída, jogador não mexe em atributos", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    const f = editavel(await lerFicha(a.cliente, id)) as ReturnType<typeof editavel> & { dados: { atributos: Record<string, number> } };
    for (const k of Object.keys(f.dados.atributos)) f.dados.atributos[k] = 7; // 63 > 50
    const s = await chamar(salvar, { metodo: "PUT", params: { id }, corpo: f, cliente: a.cliente });
    expect(s.status).toBe(200);
    const c = await chamar(concluir, { params: { id }, cliente: a.cliente });
    expect(c.status).toBe(400);
    expect(c.dados.problemas.join()).toMatch(/63 de 50/);

    for (const k of Object.keys(f.dados.atributos)) f.dados.atributos[k] = 5; // 45 ≤ 50
    f.version = s.dados.version;
    const s2 = await chamar(salvar, { metodo: "PUT", params: { id }, corpo: f, cliente: a.cliente });
    expect((await chamar(concluir, { params: { id }, cliente: a.cliente })).status).toBe(200);

    const depois = editavel(await lerFicha(a.cliente, id)) as typeof f;
    expect(depois.version).toBeGreaterThan(s2.dados.version);
    depois.dados.atributos.REF = 10;
    const s3 = await chamar(salvar, { metodo: "PUT", params: { id }, corpo: depois, cliente: a.cliente });
    expect(s3.status).toBe(200);
    expect((await lerFicha(a.cliente, id)).dados.atributos.REF).toBe(5);

    // O mestre reabre e aí o jogador pode mexer.
    expect((await chamar(reabrir, { params: { id }, cliente: a.cliente })).status).toBe(403);
    expect((await chamar(reabrir, { params: { id }, cliente: mestre })).status).toBe(200);
  });
});

describe("dano e PE", () => {
  it("marca dano entre 0 e 40", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    expect((await chamar(dano, { params: { id }, corpo: { dano: 13 }, cliente: a.cliente })).status).toBe(200);
    expect((await lerFicha(a.cliente, id)).dano).toBe(13);
    expect((await chamar(dano, { params: { id }, corpo: { dano: 41 }, cliente: a.cliente })).status).toBe(400);
  });

  it("só o mestre dá PE; o jogador sobe a perícia quando tem PE suficiente, com histórico", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);

    expect((await chamar(darPe, { params: { id }, corpo: { chave: "fuzil", quantidade: 5, motivo: "experiencia" }, cliente: a.cliente })).status).toBe(403);

    expect((await chamar(darPe, { params: { id }, corpo: { chave: "fuzil", quantidade: 6, motivo: "experiencia" }, cliente: mestre })).status).toBe(200);
    const pouco = await chamar(subir, { params: { id }, corpo: { chave: "fuzil" }, cliente: a.cliente });
    expect(pouco.status).toBe(400);
    expect(pouco.dados.erro).toMatch(/Faltam 4 PE/);

    await chamar(darPe, { params: { id }, corpo: { chave: "fuzil", quantidade: 7, motivo: "ensino" }, cliente: mestre });
    const ok = await chamar(subir, { params: { id }, corpo: { chave: "fuzil" }, cliente: a.cliente });
    expect(ok.status).toBe(200);
    expect(ok.dados.pericia).toMatchObject({ melhoria: 1, pe: 3 });

    const h = await chamar(historico, { metodo: "GET", params: { id }, cliente: a.cliente });
    const subiu = h.dados.historico.find((x: { tipo: string }) => x.tipo === "subiu");
    expect(subiu).toMatchObject({ autor: "Alfa", custo_pe: 10 });
    expect(subiu.descricao).toMatch(/Fuzil: \+0 → \+1/);
  });

  it("PE em perícia nova a cria na ficha; estudo para no +2", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);
    const r = await chamar(darPe, { params: { id }, corpo: { chave: "idioma", complemento: "Japonês", quantidade: 10, motivo: "estudo" }, cliente: mestre });
    expect(r.status).toBe(200);
    expect(r.dados.pericia).toMatchObject({ chave: "idioma", complemento: "Japonês", pe: 10 });

    const f = editavel(await lerFicha(mestre, id)) as { dados: { pericias: { chave: string; carreira: number }[] } };
    f.dados.pericias.find((p) => p.chave === "fuzil")!.carreira = 2;
    await chamar(salvar, { metodo: "PUT", params: { id }, corpo: f, cliente: mestre });
    const estudo = await chamar(darPe, { params: { id }, corpo: { chave: "fuzil", quantidade: 5, motivo: "estudo" }, cliente: mestre });
    expect(estudo.status).toBe(400);
  });
});

describe("senha temporária", () => {
  it("mestre define, jogador entra só para trocar, e ela some depois da troca", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const id = await novaFicha(a.cliente);

    expect((await chamar(senhaTemporaria, { params: { id: a.id }, cliente: a.cliente })).status).toBe(403);
    const t = await chamar(senhaTemporaria, { params: { id: a.id }, cliente: mestre });
    expect(t.status).toBe(200);
    expect(t.dados.senha).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // Sessão antiga caiu; senha antiga não vale.
    expect((await chamar(ler, { metodo: "GET", params: { id }, cliente: a.cliente })).status).toBe(401);
    expect((await chamar(login, { corpo: { modo: "jogador", nome: "Alfa", senha: a.senha }, cliente: { ip: novoIp() } })).status).toBe(401);

    const ip = novoIp();
    const l = await chamar(login, { corpo: { modo: "jogador", nome: "Alfa", senha: t.dados.senha }, cliente: { ip } });
    expect(l.status).toBe(200);
    expect(l.dados.trocarSenha).toBe(true);
    const cli = await clienteDe(l.setCookie, ip);
    // Até trocar, nada além da troca de senha.
    expect((await chamar(ler, { metodo: "GET", params: { id }, cliente: cli })).status).toBe(403);
    expect((await chamar(trocarSenha, { corpo: { atual: t.dados.senha, nova: t.dados.senha }, cliente: cli })).status).toBe(400);
    const troca = await chamar(trocarSenha, { corpo: { atual: t.dados.senha, nova: "senha-nova-do-alfa" }, cliente: cli });
    expect(troca.status).toBe(200);
    const cli2 = await clienteDe(troca.setCookie, ip);
    expect((await chamar(ler, { metodo: "GET", params: { id }, cliente: cli2 })).status).toBe(200);
    expect((await chamar(login, { corpo: { modo: "jogador", nome: "Alfa", senha: t.dados.senha }, cliente: { ip: novoIp() } })).status).toBe(401);
  });

  it("senha temporária vencida não entra, com a mesma mensagem de senha errada", async () => {
    const mestre = await entrarComoMestre(login);
    const a = await jogador(mestre, "Alfa");
    const t = await chamar(senhaTemporaria, { params: { id: a.id }, cliente: mestre });
    await adminDb()`update player set password_expires_at = now() - interval '1 minute' where id = ${a.id}`;
    const l = await chamar(login, { corpo: { modo: "jogador", nome: "Alfa", senha: t.dados.senha }, cliente: { ip: novoIp() } });
    expect(l.status).toBe(401);
    expect(l.dados.erro).toBe("Nome ou senha incorretos.");
  });
});
