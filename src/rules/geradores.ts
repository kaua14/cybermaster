import { SIGLAS, type Atributos } from "./atributos";
import { mtc } from "./derivados";

// Tabelas para improvisar NPCs e cenas. Não são regras do livro: são sugestões para a mesa.

export const APELIDOS = ["Raven", "Jax", "Mantis", "Chrome", "Wolf", "Nyx", "Blade", "Zero", "Dozer", "Static", "Havoc", "Vex", "Talon", "Rez", "Kira", "Diesel", "Switch", "Pyro", "Echo", "Grimm", "Sardinha", "Faísca", "Tatu", "Neblina", "Cobra", "Pixel"];
export const SOBRENOMES = ["Maldo", "Ramirez", "Tanaka", "Okafor", "Kowalski", "Santos", "Vega", "Chen", "Novak", "Silva", "Reyes", "Moreau", "Ivanov", "Costa", "Diaz", "Nakamura", "Oliveira", "Haddad"];
export const OFICIOS_RUA = ["atravessador de bairro", "bartender de bar de mercenários", "traficante de drogas sintéticas", "motoboy de mensagens", "olheiro de gangue", "reparador de cyberdecks", "artista de rua cheio de cromo", "corretora do mercado negro", "segurança freelancer", "médico de beco (ripperdoc)"];
export const EMPRESAS = ["Arasaka", "Militech", "Biotechnica", "Petrochem", "Euro Business Machines", "Kendachi", "Zetatech", "Infocomp"];
export const TRACOS = ["paranoico e tagarela", "fala só o essencial", "cobra adiantado, sempre", "leal até o fim, se bem pago", "trai por pouco", "apaixonado pelo próprio cromo", "educado demais, desconfie", "tem dívida com a pessoa errada", "religioso e supersticioso", "quer sair da cidade"];

export type TipoNpc = "rua" | "gangue" | "corporativo";
export const TIPOS_NPC: Record<TipoNpc, string> = { rua: "NPC de rua", gangue: "Gangue / mercenário", corporativo: "Corporativo" };

const CLASSES_POR_TIPO: Record<TipoNpc, string[]> = {
  rua: ["Atravessador", "Roqueiro", "Mídia", "Nômade", "Técnico", "Tecnomédico"],
  gangue: ["Solo", "Policial corrupto", "Nômade"],
  corporativo: ["Corporativo", "Atravessador", "Solo (guarda-costas)"],
};
const ARMAS_GANGUE = ["Submetralhadora (2d6+1)", "Pistola média (2d6+1)", "Pistola pesada (3d6)", "Espingarda (4d6)", "Faca (1d6)", "Bastão (1d6)"];

export type Npc = { nome: string; tipo: TipoNpc; classe: string; detalhe: string; atributos: Atributos; pb: number; periciaChave: number; traco: string };

type Rnd = () => number;
const entre = (r: Rnd, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const um = <T,>(r: Rnd, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];

/** Gera um NPC. `r` é injetável para os testes. */
export function gerarNpc(tipo: TipoNpc, r: Rnd = Math.random): Npc {
  const atributos = Object.fromEntries(SIGLAS.map((s) => [s, entre(r, 3, 8)])) as Atributos;
  if (tipo === "gangue") { atributos.REF = entre(r, 6, 9); atributos.TCO = entre(r, 6, 9); }
  if (tipo === "corporativo") { atributos.INT = entre(r, 6, 9); atributos.AuCon = entre(r, 5, 8); }
  const detalhe =
    tipo === "rua" ? `Ofício: ${um(r, OFICIOS_RUA)}` : tipo === "gangue" ? `Arma: ${um(r, ARMAS_GANGUE)}` : `Empresa: ${um(r, EMPRESAS)}`;
  return {
    nome: `${um(r, APELIDOS)} "${um(r, APELIDOS)}" ${um(r, SOBRENOMES)}`,
    tipo,
    classe: um(r, CLASSES_POR_TIPO[tipo]),
    detalhe,
    atributos,
    pb: tipo === "gangue" ? entre(r, 10, 18) : entre(r, 0, 12),
    periciaChave: entre(r, 3, 7),
    traco: um(r, TRACOS),
  };
}

export function npcComoTexto(n: Npc): string {
  const a = n.atributos;
  return [
    `NOME: ${n.nome}`,
    `CLASSE: ${n.classe}`,
    n.detalhe,
    "",
    SIGLAS.map((s) => `${s} ${a[s]}`).join(" · "),
    `MTC ${mtc(a.TCO)} · Vitalidade ${a.TCO} · PB ${n.pb}`,
    `Perícia principal: +${n.periciaChave}`,
    "",
    `JEITO: ${n.traco}`,
  ].join("\n");
}

export const GANCHOS = [
  "Um atravessador oferece {n} mil eurodólares para entregar um pacote antes do amanhecer, sem perguntas.",
  "O grupo acha um cyberdeck abandonado que ainda está conectado a alguma coisa... e ela responde.",
  "Um corporativo disfarçado pede proteção por uma noite. A recompensa é boa demais.",
  "Tiroteio na esquina: uma gangue executa alguém que grita o nome de um dos personagens.",
  "Um netrunner morto deixou um bilhete: \"Se estão lendo isso, já sabem onde vocês moram.\"",
  "O bar do bairro foi invadido. Só levaram UMA coisa: o braço cibernético do segurança.",
  "Um garoto de rua oferece um golpe em troca de carona para fora da cidade.",
  "O grupo é confundido com os mercenários que deram um golpe ontem à noite.",
  "Todos os implantes do bairro falham por 10 segundos. Alguém sabe por quê.",
  "Um caminhão da Biotechnica capota na autoestrada. O motorista está vivo e foge de alguma coisa.",
  "Uma repórter quer que o grupo a leve até uma área de combate de gangues, ao vivo.",
  "O ripperdoc de confiança sumiu. A clínica está aberta, com o café ainda quente.",
  "Um nômade pede ajuda para tirar a família de um bloqueio policial antes do amanhecer.",
  "Alguém está vendendo, no mercado negro, o histórico médico de um dos personagens.",
  "Um show de um roqueiro famoso vira protesto. A polícia está chegando e alguém precisa sair dali.",
  "Uma corporação oferece emprego fixo a um dos personagens. Só ele. E só se aceitar hoje.",
];

export function gerarGancho(r: Rnd = Math.random): string {
  return um(r, GANCHOS).replace("{n}", String(entre(r, 1, 9) * 10));
}
