import postgres from "postgres";

// Conexão com o papel da aplicação (cm_app). Ela nunca recebe a credencial administrativa.
let cliente: postgres.Sql | undefined;

export function db(): postgres.Sql {
  if (!cliente) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida");
    cliente = postgres(url, { max: 10, onnotice: () => {} });
  }
  return cliente;
}
