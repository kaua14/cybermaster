import { hash, verify, type Algorithm } from "@node-rs/argon2";

export const SENHA_MIN = 10;
export const SENHA_MAX = 256;

// argon2id, parâmetros mínimos recomendados pela OWASP (19 MiB, 2 passadas).
const OPCOES = { algorithm: 2 as Algorithm, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES);
}

let hashFalso: Promise<string> | undefined;

/** Confere a senha. Sem hash (usuário inexistente), gasta o mesmo tempo e devolve false. */
export async function conferirSenha(hashGuardado: string | null | undefined, senha: string): Promise<boolean> {
  if (!hashGuardado) {
    hashFalso ??= hash("senha-falsa-para-igualar-o-tempo", OPCOES);
    await verify(await hashFalso, senha).catch(() => false);
    return false;
  }
  return verify(hashGuardado, senha).catch(() => false);
}
