import { ATRIBUTOS, SIGLAS } from "./atributos";
import { estadoDoDano } from "./ferimentos";
import { LOCAIS, type FichaEditavel } from "./ficha";

export type Mudanca = { campo: string; antes: string; depois: string };

const resumo = (s: string, max = 80) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t || "(vazio)";
};

/** Diferenças legíveis entre duas versões da ficha (para confirmar uma importação). */
export function diferencas(a: { ficha: FichaEditavel; dano: number }, b: { ficha: FichaEditavel; dano: number }): Mudanca[] {
  const out: Mudanca[] = [];
  const add = (campo: string, x: unknown, y: unknown, fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "(vazio)" : String(v))) => {
    if (JSON.stringify(x) !== JSON.stringify(y)) out.push({ campo, antes: fmt(x), depois: fmt(y) });
  };
  const da = a.ficha.dados;
  const db = b.ficha.dados;

  add("Nome", a.ficha.nome, b.ficha.nome);
  add("Idade", da.idade, db.idade);
  for (const s of SIGLAS) add(`${s} (${ATRIBUTOS[s].nome})`, da.atributos[s], db.atributos[s]);

  const linhaArma = (x?: (typeof da.armas)[number]) => (x ? [x.nome, x.tipo, x.prec, x.dano, x.mun, x.cdt, x.alcance].map((v) => v || "-").join(" · ") : "(nenhuma)");
  for (let i = 0; i < Math.max(da.armas.length, db.armas.length); i++) add(`Arma ${i + 1}`, da.armas[i], db.armas[i], (v) => linhaArma(v as never));

  for (const l of LOCAIS) add(`PB ${l.nome}`, da.armadura[l.id], db.armadura[l.id]);
  add("Armadura vestida", da.armadura.descricao, db.armadura.descricao);

  const linhaCyber = (x?: (typeof da.cyberware)[number]) => (x ? `${x.nome || "-"} · CH ${x.ch}${x.notas ? ` · ${x.notas}` : ""}` : "(nenhum)");
  for (let i = 0; i < Math.max(da.cyberware.length, db.cyberware.length); i++) add(`Implante ${i + 1}`, da.cyberware[i], db.cyberware[i], (v) => linhaCyber(v as never));

  add("Dinheiro", da.dinheiro, db.dinheiro);
  add("Equipamento", da.equipamento, db.equipamento, (v) => resumo(String(v)));
  add("História", da.historia, db.historia, (v) => resumo(String(v)));
  add("Dano", a.dano, b.dano, (v) => `${v} (${estadoDoDano(Number(v))?.nome ?? "ileso"})`);
  return out;
}
