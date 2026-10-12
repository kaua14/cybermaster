// Servidor HTTP da app. Existe para passar o IP real do cliente às rotas
// (o Next não expõe o socket) e assim limitar tentativas de login por IP.
import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const confiaProxy = process.env.TRUST_PROXY === "1";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

createServer((req, res) => {
  let ip = req.socket.remoteAddress ?? "";
  if (confiaProxy) {
    // Com um proxy reverso confiável na frente, o IP do cliente é o último que ele acrescentou.
    const xff = String(req.headers["x-forwarded-for"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (xff.length) ip = xff[xff.length - 1];
  }
  req.headers["x-cm-client-ip"] = ip;
  handle(req, res);
}).listen(port, hostname, () => {
  console.log(`Cybermaster em http://${hostname}:${port} (${dev ? "dev" : "produção"})`);
});
