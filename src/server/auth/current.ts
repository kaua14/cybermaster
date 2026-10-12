import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessao, nomeCookie, type Sessao } from "./session";

/** Sessão atual, para componentes de servidor. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  return lerSessao(jar.get(nomeCookie())?.value);
}

/** Com senha temporária, o jogador só vê a tela de Conta até trocar a senha. */
export async function exigirSessao(opcoes: { permitirTrocaPendente?: boolean } = {}): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  if (s.trocarSenha && !opcoes.permitirTrocaPendente) redirect("/conta");
  return s;
}

export async function exigirMestre(): Promise<Sessao> {
  const s = await exigirSessao();
  if (s.tipo !== "mestre") redirect("/");
  return s;
}
