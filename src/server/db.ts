import postgres from "postgres";

// Conexão com o papel da aplicação (cm_app). Ela nunca recebe a credencial administrativa.
let cliente: postgres.Sql | undefined;

export function db(): postgres.Sql {
  if (!cliente) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida");
    // Na Vercel cada instância atende uma requisição por vez: poucas conexões, fechadas quando ociosas.
    const serverless = process.env.VERCEL === "1";
    cliente = postgres(url, { max: serverless ? 2 : 10, idle_timeout: serverless ? 20 : undefined, onnotice: () => {} });
  }
  return cliente;
}
