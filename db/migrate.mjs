// @ts-check
// Aplica as migrações com a credencial administrativa e garante o papel da aplicação (cm_app).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROLE = "cm_app";

/** @param {string} s */
const literal = (s) => "'" + s.replaceAll("'", "''") + "'";

/**
 * @param {string} adminUrl
 * @param {{ appPassword?: string, log?: (msg: string) => void }} [opts]
 */
export async function migrate(adminUrl, opts = {}) {
  const log = opts.log ?? (() => {});
  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    const [{ exists }] = await sql`select exists (select 1 from pg_roles where rolname = ${APP_ROLE}) as exists`;
    if (!exists) {
      await sql.unsafe(`create role ${APP_ROLE} login`);
      log(`papel ${APP_ROLE} criado`);
    }
    if (opts.appPassword) {
      await sql.unsafe(`alter role ${APP_ROLE} with login password ${literal(opts.appPassword)}`);
    }

    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
    const feitas = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
    const arquivos = (await readdir(path.join(DIR, "migrations"))).filter((f) => f.endsWith(".sql")).sort();

    for (const nome of arquivos) {
      if (feitas.has(nome)) continue;
      const texto = await readFile(path.join(DIR, "migrations", nome), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(texto);
        await tx`insert into schema_migrations (name) values (${nome})`;
      });
      log(`migração aplicada: ${nome}`);
    }

    await sql.unsafe(await readFile(path.join(DIR, "grants.sql"), "utf8"));
  } finally {
    await sql.end();
  }
}
