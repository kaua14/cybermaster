#!/usr/bin/env node
// Grava (ou troca) a senha do mestre direto no banco, com a credencial administrativa.
// A senha vem de um prompt oculto ou de stdin. Nunca de argumento de linha de comando.
//
//   DATABASE_ADMIN_URL=... node scripts/set-master-password.mjs
//   printf '%s' "$SENHA" | DATABASE_ADMIN_URL=... node scripts/set-master-password.mjs
import { hash } from "@node-rs/argon2";
import postgres from "postgres";

const MIN = 12;

if (process.argv.length > 2) {
  console.error("Este script não aceita argumentos. A senha é lida do prompt ou de stdin.");
  process.exit(2);
}

const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl) {
  console.error("Defina DATABASE_ADMIN_URL (credencial administrativa do banco).");
  process.exit(1);
}

/** Lê uma linha do terminal sem eco. */
function perguntarOculto(rotulo) {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;
    process.stderr.write(rotulo);
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    let valor = "";
    const aoDigitar = (pedaco) => {
      for (const c of pedaco) {
        if (c === "\r" || c === "\n") {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.off("data", aoDigitar);
          process.stderr.write("\n");
          return resolve(valor);
        }
        if (c === "\u0003") {
          entrada.setRawMode(false);
          process.stderr.write("\n");
          return reject(new Error("cancelado"));
        }
        if (c === "\u007f" || c === "\b") valor = valor.slice(0, -1);
        else valor += c;
      }
    };
    entrada.on("data", aoDigitar);
  });
}

async function lerStdin() {
  const partes = [];
  for await (const p of process.stdin) partes.push(p);
  return Buffer.concat(partes).toString("utf8").replace(/\r?\n$/, "");
}

let senha;
try {
  if (process.stdin.isTTY) {
    senha = await perguntarOculto("Nova senha do mestre: ");
    const confirma = await perguntarOculto("Repita a senha: ");
    if (senha !== confirma) {
      console.error("As senhas não conferem. Nada foi gravado.");
      process.exit(1);
    }
  } else {
    senha = await lerStdin();
  }
} catch {
  console.error("Cancelado. Nada foi gravado.");
  process.exit(1);
}

if ([...senha].length < MIN) {
  console.error(`A senha precisa ter pelo menos ${MIN} caracteres. Nada foi gravado.`);
  process.exit(1);
}

// argon2id, parâmetros mínimos recomendados pela OWASP (19 MiB, 2 passadas).
const passwordHash = await hash(senha, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
senha = undefined;

const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    await tx`
      insert into master_credential (id, password_hash, updated_at)
      values (1, ${passwordHash}, now())
      on conflict (id) do update set password_hash = excluded.password_hash, updated_at = now()`;
    // Quem estava logado como mestre precisa entrar de novo.
    await tx`delete from session where kind = 'master'`;
  });
  console.log("Senha do mestre gravada.");
} catch (e) {
  console.error("Falha ao gravar:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
