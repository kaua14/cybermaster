import { z } from "zod";
import { db } from "@/server/db";
import { conferirSenha, SENHA_MAX } from "@/server/auth/password";
import { bloqueio, limparFalhas, registrarFalha } from "@/server/auth/throttle";
import { cookieSessao, criarSessao } from "@/server/auth/session";
import { json, rota } from "@/server/http";

const Corpo = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("jogador"), nome: z.string().trim().min(1).max(40), senha: z.string().min(1).max(SENHA_MAX) }),
  z.object({ modo: z.literal("mestre"), senha: z.string().min(1).max(SENHA_MAX) }),
]);

export const POST = rota({ acesso: "publico", corpo: Corpo }, async ({ corpo, ip }) => {
  const chaves = [`ip:${ip}`, corpo.modo === "mestre" ? "conta:mestre" : `conta:jogador:${corpo.nome.toLowerCase()}`];

  const falta = await bloqueio(chaves);
  if (falta > 0) return json({ erro: `Muitas tentativas. Tente de novo em ${falta} s.` }, 429, { "retry-after": String(falta) });

  if (corpo.modo === "mestre") {
    const [cred] = await db()`select password_hash from master_credential where id = 1`;
    if (!cred) return json({ erro: "Senha do mestre ainda não configurada. Veja o README." }, 503);
    if (!(await conferirSenha(cred.password_hash, corpo.senha))) {
      await registrarFalha(chaves);
      return json({ erro: "Senha incorreta." }, 401);
    }
    await limparFalhas(chaves.slice(1));
    return json({ ok: true, tipo: "mestre" }, 200, { "set-cookie": cookieSessao(await criarSessao("mestre", null)) });
  }

  const [jogador] = await db()`select id, password_hash from player where lower(name) = lower(${corpo.nome})`;
  // Mesma resposta para nome inexistente, convite pendente e senha errada.
  if (!(await conferirSenha(jogador?.password_hash, corpo.senha))) {
    await registrarFalha(chaves);
    return json({ erro: "Nome ou senha incorretos." }, 401);
  }
  await limparFalhas(chaves.slice(1));
  return json({ ok: true, tipo: "jogador" }, 200, { "set-cookie": cookieSessao(await criarSessao("jogador", jogador.id)) });
});
