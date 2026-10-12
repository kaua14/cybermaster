import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const tokenAleatorio = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Sem 0/O, 1/I/L, para ditar o código em voz alta na mesa.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código de convite: 12 caracteres (~59 bits), em grupos de 4. */
export function gerarCodigoConvite(): string {
  const c = Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

export const normalizarCodigo = (codigo: string) => codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
