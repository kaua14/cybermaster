import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessao, nomeCookie, type Sessao } from "./session";

/** Sessão atual, para componentes de servidor. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  return lerSessao(jar.get(nomeCookie())?.value);
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  return s;
}

export async function exigirMestre(): Promise<Sessao> {
  const s = await exigirSessao();
  if (s.tipo !== "mestre") redirect("/");
  return s;
}
