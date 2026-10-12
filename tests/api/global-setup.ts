import { randomBytes } from "node:crypto";
import postgres from "postgres";
import type { TestProject } from "vitest/node";
import { migrate } from "../../db/migrate.mjs";

// Cria um banco descartável, aplica as migrações e entrega às suítes a URL do
// papel da aplicação (cm_app) e a URL administrativa.
// Requer TEST_DATABASE_ADMIN_URL apontando para um Postgres com superusuário.
export default async function setup(project: TestProject) {
  const base = process.env.TEST_DATABASE_ADMIN_URL;
  if (!base) throw new Error("Defina TEST_DATABASE_ADMIN_URL (ex.: postgres://postgres:senha@127.0.0.1:5432/postgres)");

  const nome = `cm_test_${randomBytes(4).toString("hex")}`;
  const raiz = postgres(base, { max: 1, onnotice: () => {} });
  await raiz.unsafe(`create database ${nome}`);

  const adminUrl = new URL(base);
  adminUrl.pathname = `/${nome}`;
  const senhaApp = randomBytes(18).toString("hex");
  await migrate(adminUrl.toString(), { appPassword: senhaApp });

  const appUrl = new URL(adminUrl);
  appUrl.username = "cm_app";
  appUrl.password = senhaApp;

  project.provide("adminUrl", adminUrl.toString());
  project.provide("appUrl", appUrl.toString());

  return async () => {
    await raiz.unsafe(`drop database if exists ${nome} with (force)`);
    await raiz.end();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    adminUrl: string;
    appUrl: string;
  }
}
