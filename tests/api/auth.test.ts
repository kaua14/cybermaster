import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as aceitarConvite } from "@/app/api/auth/convite/route";
import { POST as trocarSenha } from "@/app/api/conta/senha/route";
import { GET as listarJogadores, POST as criarJogador } from "@/app/api/jogadores/route";
import { POST as reconvidar } from "@/app/api/jogadores/[id]/convite/route";
import { adminDb, chamar, criarJogadorAtivo as criarJogadorAtivoBase, definirSenhaMestre, entrarComoMestre as entrarComoMestreBase, novoIp, type Cliente } from "./helpers";

const entrarComoMestre = () => entrarComoMestreBase(login);
const criarJogadorAtivo = (mestre: Cliente, nome: string, senha?: string) => criarJogadorAtivoBase(criarJogador, aceitarConvite, mestre, nome, senha);

beforeEach(async () => {
  await adminDb()`truncate player, invite, session, login_throttle, master_credential, character, character_log cascade`;
});
afterAll(async () => {
  await adminDb().end();
});

describe("master_credential", () => {
  it("não aceita id diferente de 1", async () => {
    await expect(adminDb()`insert into master_credential (id, password_hash) values (2, 'x')`).rejects.toThrow(/check/i);
  });

  it("não aceita duas linhas", async () => {
    await adminDb()`insert into master_credential (id, password_hash) values (1, 'x')`;
    await expect(adminDb()`insert into master_credential (id, password_hash) values (1, 'y')`).rejects.toThrow(/duplicate|unique/i);
    const [{ n }] = await adminDb()`select count(*)::int as n from master_credential`;
    expect(n).toBe(1);
  });

  it("o papel da aplicação só lê: não insere, não altera, não apaga", async () => {
    const app = postgres(inject("appUrl"), { max: 1, onnotice: () => {} });
    try {
      await expect(app`select * from master_credential`).resolves.toBeDefined();
      await expect(app`insert into master_credential (id, password_hash) values (1, 'x')`).rejects.toThrow(/permission denied/i);
      await adminDb()`insert into master_credential (id, password_hash) values (1, 'x')`;
      await expect(app`update master_credential set password_hash = 'y'`).rejects.toThrow(/permission denied/i);
      await expect(app`delete from master_credential`).rejects.toThrow(/permission denied/i);
      await expect(app`truncate master_credential`).rejects.toThrow(/permission denied/i);
    } finally {
      await app.end();
    }
  });

  it("nenhum código da aplicação escreve em master_credential", async () => {
    const arquivos: string[] = [];
    async function varrer(dir: string) {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await varrer(p);
        else if (/\.(ts|tsx)$/.test(e.name)) arquivos.push(p);
      }
    }
    await varrer(path.resolve("src"));
    for (const f of arquivos) {
      const texto = await readFile(f, "utf8");
      expect(texto, f).not.toMatch(/(insert\s+into|update|delete\s+from|truncate)\s+master_credential/i);
    }
  });
});

describe("login do mestre", () => {
  it("sem senha configurada, avisa claramente", async () => {
    const r = await chamar(login, { corpo: { modo: "mestre", senha: "qualquer-coisa" }, cliente: { ip: novoIp() } });
    expect(r.status).toBe(503);
    expect(r.dados.erro).toMatch(/ainda não configurada/);
    expect(r.setCookie).toBeNull();
  });

  it("aceita a senha injetada e recusa outra", async () => {
    const senha = await definirSenhaMestre();
    const errada = await chamar(login, { corpo: { modo: "mestre", senha: senha + "x" }, cliente: { ip: novoIp() } });
    expect(errada.status).toBe(401);
    const certa = await chamar(login, { corpo: { modo: "mestre", senha }, cliente: { ip: novoIp() } });
    expect(certa.status).toBe(200);
    expect(certa.setCookie).toMatch(/^__Host-cm_sessao=/);
    expect(certa.setCookie).toMatch(/HttpOnly/);
    expect(certa.setCookie).toMatch(/Secure/);
    expect(certa.setCookie).toMatch(/SameSite=Lax/);
    expect(certa.setCookie).toMatch(/Max-Age=\d+/);
  });
});

describe("convite e login de jogador", () => {
  it("fluxo completo: convite, primeira senha, login", async () => {
    const mestre = await entrarComoMestre();
    const j = await criarJogadorAtivo(mestre, "Raven");
    const r = await chamar(login, { corpo: { modo: "jogador", nome: "raven", senha: j.senha }, cliente: { ip: novoIp() } });
    expect(r.status).toBe(200);
  });

  it("código de convite vale uma vez só", async () => {
    const mestre = await entrarComoMestre();
    const j = await criarJogadorAtivo(mestre, "Jax");
    const de_novo = await chamar(aceitarConvite, { corpo: { codigo: j.codigo, senha: "outra-senha-qualquer" }, cliente: { ip: novoIp() } });
    expect(de_novo.status).toBe(400);
  });

  it("código vencido não vale", async () => {
    const mestre = await entrarComoMestre();
    const c = await chamar(criarJogador, { corpo: { nome: "Nyx" }, cliente: mestre });
    await adminDb()`update invite set expires_at = now() - interval '1 minute'`;
    const r = await chamar(aceitarConvite, { corpo: { codigo: c.dados.codigo, senha: "senha-longa-ok" }, cliente: { ip: novoIp() } });
    expect(r.status).toBe(400);
  });

  it("senha curta é recusada", async () => {
    const mestre = await entrarComoMestre();
    const c = await chamar(criarJogador, { corpo: { nome: "Zero" }, cliente: mestre });
    const r = await chamar(aceitarConvite, { corpo: { codigo: c.dados.codigo, senha: "curta" }, cliente: { ip: novoIp() } });
    expect(r.status).toBe(400);
  });

  it("mesma mensagem para jogador inexistente, senha errada e convite pendente", async () => {
    const mestre = await entrarComoMestre();
    await criarJogadorAtivo(mestre, "Vex");
    await chamar(criarJogador, { corpo: { nome: "Pendente" }, cliente: mestre });
    const a = await chamar(login, { corpo: { modo: "jogador", nome: "Ninguem", senha: "x" }, cliente: { ip: novoIp() } });
    const b = await chamar(login, { corpo: { modo: "jogador", nome: "Vex", senha: "errada" }, cliente: { ip: novoIp() } });
    const c = await chamar(login, { corpo: { modo: "jogador", nome: "Pendente", senha: "x" }, cliente: { ip: novoIp() } });
    expect([a.status, b.status, c.status]).toEqual([401, 401, 401]);
    expect(a.dados).toEqual(b.dados);
    expect(b.dados).toEqual(c.dados);
  });

  it("o banco guarda hash argon2id, nunca a senha", async () => {
    const mestre = await entrarComoMestre();
    const j = await criarJogadorAtivo(mestre, "Kira", "minha-senha-secreta");
    const [p] = await adminDb()`select password_hash from player where id = ${j.id}`;
    expect(p.password_hash).toMatch(/^\$argon2id\$/);
    expect(p.password_hash).not.toContain("minha-senha-secreta");
    const [i] = await adminDb()`select code_hash from invite where player_id = ${j.id}`;
    expect(i.code_hash).not.toContain(j.codigo.replaceAll("-", ""));
  });
});

describe("limite de tentativas", () => {
  it("bloqueia a conta depois de erros seguidos, mesmo trocando de IP", async () => {
    const mestre = await entrarComoMestre();
    const j = await criarJogadorAtivo(mestre, "Talon");
    for (let i = 0; i < 3; i++) {
      await chamar(login, { corpo: { modo: "jogador", nome: "Talon", senha: "errada" }, cliente: { ip: novoIp() } });
    }
    const r = await chamar(login, { corpo: { modo: "jogador", nome: "Talon", senha: j.senha }, cliente: { ip: novoIp() } });
    expect(r.status).toBe(429);
  });

  it("bloqueia o IP que tenta várias contas", async () => {
    const ip = novoIp();
    for (let i = 0; i < 3; i++) {
      await chamar(login, { corpo: { modo: "jogador", nome: `conta${i}`, senha: "errada" }, cliente: { ip } });
    }
    const r = await chamar(login, { corpo: { modo: "jogador", nome: "outra", senha: "x" }, cliente: { ip } });
    expect(r.status).toBe(429);
  });
});

describe("permissões e CSRF", () => {
  it("sem sessão: 401", async () => {
    const r = await chamar(listarJogadores, { metodo: "GET", cliente: { ip: novoIp() } });
    expect(r.status).toBe(401);
  });

  it("jogador não lista, não cria nem reconvida jogadores", async () => {
    const mestre = await entrarComoMestre();
    const a = await criarJogadorAtivo(mestre, "Alfa");
    const b = await criarJogadorAtivo(mestre, "Beta");
    expect((await chamar(listarJogadores, { metodo: "GET", cliente: a.cliente })).status).toBe(403);
    expect((await chamar(criarJogador, { corpo: { nome: "Intruso" }, cliente: a.cliente })).status).toBe(403);
    expect((await chamar(reconvidar, { params: { id: b.id }, cliente: a.cliente })).status).toBe(403);
  });

  it("mutação sem token CSRF é recusada", async () => {
    const mestre = await entrarComoMestre();
    const r = await chamar(criarJogador, { corpo: { nome: "Sem Csrf" }, cliente: { ...mestre, csrf: undefined } });
    expect(r.status).toBe(403);
    const r2 = await chamar(criarJogador, { corpo: { nome: "Csrf Errado" }, cliente: mestre, csrf: "x".repeat(43) });
    expect(r2.status).toBe(403);
  });

  it("mutação de outra origem é recusada, inclusive o login", async () => {
    const mestre = await entrarComoMestre();
    const r = await chamar(criarJogador, { corpo: { nome: "Outra Origem" }, cliente: mestre, origem: "https://malicioso.example" });
    expect(r.status).toBe(403);
    const senha = await definirSenhaMestre();
    const l = await chamar(login, { corpo: { modo: "mestre", senha }, cliente: { ip: novoIp() }, origem: "https://malicioso.example" });
    expect(l.status).toBe(403);
  });

  it("corpo inválido é recusado pelo schema", async () => {
    const mestre = await entrarComoMestre();
    const r = await chamar(criarJogador, { corpo: { nome: "x".repeat(41) }, cliente: mestre });
    expect(r.status).toBe(400);
  });

  it("não existe troca de senha do mestre pela app", async () => {
    const mestre = await entrarComoMestre();
    const r = await chamar(trocarSenha, { corpo: { atual: "a", nova: "b".repeat(12) }, cliente: mestre });
    expect(r.status).toBe(403);
  });
});

describe("gestão de senha do jogador", () => {
  it("mestre invalida a senha: jogador perde a sessão e o login antigo", async () => {
    const mestre = await entrarComoMestre();
    const j = await criarJogadorAtivo(mestre, "Echo");
    const r = await chamar(reconvidar, { params: { id: j.id }, cliente: mestre });
    expect(r.status).toBe(200);
    expect(r.dados.codigo).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(JSON.stringify(r.dados)).not.toContain("argon2");

    const sessaoVelha = await chamar(logout, { cliente: j.cliente });
    expect(sessaoVelha.status).toBe(401);
    const l = await chamar(login, { corpo: { modo: "jogador", nome: "Echo", senha: j.senha }, cliente: { ip: novoIp() } });
    expect(l.status).toBe(401);
    const novo = await chamar(aceitarConvite, { corpo: { codigo: r.dados.codigo, senha: "senha-nova-do-echo" }, cliente: { ip: novoIp() } });
    expect(novo.status).toBe(200);
  });

  it("listagem de jogadores não expõe hash", async () => {
    const mestre = await entrarComoMestre();
    await criarJogadorAtivo(mestre, "Grimm");
    const r = await chamar(listarJogadores, { metodo: "GET", cliente: mestre });
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.dados)).not.toMatch(/argon2|password|hash/i);
  });

  it("jogador troca a própria senha", async () => {
    const mestre = await entrarComoMestre();
    const j = await criarJogadorAtivo(mestre, "Static");
    const errada = await chamar(trocarSenha, { corpo: { atual: "nao-e-essa", nova: "senha-nova-123" }, cliente: j.cliente });
    expect(errada.status).toBe(400);
    const ok = await chamar(trocarSenha, { corpo: { atual: j.senha, nova: "senha-nova-123" }, cliente: j.cliente });
    expect(ok.status).toBe(200);
    const l = await chamar(login, { corpo: { modo: "jogador", nome: "Static", senha: "senha-nova-123" }, cliente: { ip: novoIp() } });
    expect(l.status).toBe(200);
  });

  it("nome de jogador repetido (sem diferenciar maiúsculas) é recusado", async () => {
    const mestre = await entrarComoMestre();
    await chamar(criarJogador, { corpo: { nome: "Dozer" }, cliente: mestre });
    const r = await chamar(criarJogador, { corpo: { nome: "DOZER" }, cliente: mestre });
    expect(r.status).toBe(409);
  });
});
