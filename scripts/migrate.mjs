#!/usr/bin/env node
// Uso: DATABASE_ADMIN_URL=... [DB_APP_PASSWORD=...] node scripts/migrate.mjs
import { migrate } from "../db/migrate.mjs";

const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl) {
  console.error("Defina DATABASE_ADMIN_URL (credencial administrativa do banco).");
  process.exit(1);
}

try {
  await migrate(adminUrl, { appPassword: process.env.DB_APP_PASSWORD || undefined, log: (m) => console.log(m) });
  console.log("Banco atualizado.");
} catch (e) {
  console.error("Falha na migração:", e instanceof Error ? e.message : e);
  process.exit(1);
}
