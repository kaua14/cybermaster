import type postgres from "postgres";
import { DadosSchema, type FichaEditavel } from "@/rules/ficha";
import type { Sessao } from "./auth/session";
import { db } from "./db";
import { ErroHttp } from "./http";

export type FichaLinha = {
  id: string;
  dono: { id: string; nome: string };
  version: number;
  nome: string;
  classe: string;
  dados: FichaEditavel["dados"];
  dano: number;
  criacaoConcluida: boolean;
  atualizada: Date;
};

type Exec = postgres.Sql | postgres.TransactionSql;

/**
 * Carrega a ficha se a sessão pode vê-la: o mestre vê todas, o jogador só as próprias.
 * Ficha alheia responde 404, igual a ficha inexistente, para não revelar que existe.
 */
export async function carregarFicha(sessao: Sessao, id: string, opcoes: { tx?: Exec; travar?: boolean } = {}): Promise<FichaLinha> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErroHttp(404, "Ficha não encontrada.");
  const q = opcoes.tx ?? db();
  const dono = sessao.tipo === "mestre" ? null : sessao.jogadorId;
  const [r] = opcoes.travar
    ? await q`
        select c.*, p.name as dono_nome from character c join player p on p.id = c.owner_id
        where c.id = ${id} and (${dono}::uuid is null or c.owner_id = ${dono}::uuid)
        for update of c`
    : await q`
        select c.*, p.name as dono_nome from character c join player p on p.id = c.owner_id
        where c.id = ${id} and (${dono}::uuid is null or c.owner_id = ${dono}::uuid)`;
  if (!r) throw new ErroHttp(404, "Ficha não encontrada.");
  // O banco é a fonte da verdade, mas o JSON passa pelo schema ao sair também.
  const dados = DadosSchema.safeParse(r.dados);
  if (!dados.success) throw new Error(`ficha ${id} com dados inválidos no banco`);
  return {
    id: r.id,
    dono: { id: r.owner_id, nome: r.dono_nome },
    version: r.version,
    nome: r.nome,
    classe: r.classe,
    dados: dados.data,
    dano: r.dano,
    criacaoConcluida: r.criacao_concluida,
    atualizada: r.updated_at,
  };
}

export const autorDe = (s: Sessao) => (s.tipo === "mestre" ? "Mestre" : s.nome);

export async function registrar(tx: Exec, fichaId: string, autor: string, tipo: string, descricao: string, custoPe: number | null = null) {
  await tx`insert into character_log (character_id, autor, tipo, descricao, custo_pe) values (${fichaId}, ${autor}, ${tipo}, ${descricao}, ${custoPe})`;
}

/** Edições seguidas do mesmo autor em 10 min viram um registro só. */
export async function registrarEdicao(tx: Exec, fichaId: string, autor: string, secoes: string[]) {
  if (secoes.length === 0) return;
  const [ultimo] = await tx`
    select id, descricao from character_log
    where character_id = ${fichaId} and tipo = 'edicao' and autor = ${autor} and created_at > now() - interval '10 minutes'
    order by created_at desc limit 1`;
  if (ultimo) {
    const antes = String(ultimo.descricao).replace(/^Editou: /, "").split(", ");
    const todas = [...new Set([...antes, ...secoes])];
    await tx`update character_log set descricao = ${"Editou: " + todas.join(", ")}, created_at = now() where id = ${ultimo.id}`;
  } else {
    await registrar(tx, fichaId, autor, "edicao", "Editou: " + secoes.join(", "));
  }
}

const ROTULOS: Record<string, string> = {
  nome: "nome", classe: "classe", idade: "idade", metodo: "método", pontos: "pontos de personagem", atributos: "atributos",
  pericias: "perícias", armas: "armas", armadura: "armadura", cyberware: "cyberware", equipamento: "equipamento",
  dinheiro: "dinheiro", historia: "história",
};

/** Seções que mudaram entre duas versões da ficha. */
export function secoesAlteradas(antes: FichaEditavel, depois: FichaEditavel): string[] {
  const out: string[] = [];
  if (antes.nome !== depois.nome) out.push(ROTULOS.nome);
  if (antes.classe !== depois.classe) out.push(ROTULOS.classe);
  for (const k of Object.keys(depois.dados) as (keyof FichaEditavel["dados"])[]) {
    if (JSON.stringify(antes.dados[k]) !== JSON.stringify(depois.dados[k])) out.push(ROTULOS[k] ?? k);
  }
  return out;
}
