import { db } from "@/server/db";

/** Espera, em segundos, depois de `falhas` tentativas erradas seguidas. */
export function atraso(falhas: number): number {
  if (falhas < 3) return 0;
  return Math.min(2 ** (falhas - 3), 900);
}

// Depois de 15 min sem erro, a contagem recomeça.
const JANELA_MIN = 15;

/** Segundos que ainda faltam para liberar a tentativa (0 = liberado). */
export async function bloqueio(chaves: string[]): Promise<number> {
  const [linha] = await db()`
    select coalesce(max(extract(epoch from next_allowed_at - now())), 0)::float as falta
    from login_throttle where key in ${db()(chaves)} and next_allowed_at > now()`;
  return Math.ceil(linha?.falta ?? 0);
}

export async function registrarFalha(chaves: string[]): Promise<void> {
  for (const key of chaves) {
    const [{ failures }] = await db()`
      insert into login_throttle (key, failures, updated_at) values (${key}, 1, now())
      on conflict (key) do update set
        failures = case when login_throttle.updated_at < now() - make_interval(mins => ${JANELA_MIN})
                        then 1 else login_throttle.failures + 1 end,
        updated_at = now()
      returning failures`;
    await db()`
      update login_throttle set next_allowed_at = now() + make_interval(secs => ${atraso(failures)})
      where key = ${key}`;
  }
}

export async function limparFalhas(chaves: string[]): Promise<void> {
  await db()`delete from login_throttle where key in ${db()(chaves)}`;
}
