import { Titulo } from "@/components/Painel";
import { exigirSessao } from "@/server/auth/current";
import { db } from "@/server/db";
import { NovaFicha } from "./NovaFicha";

export const metadata = { title: "Nova ficha" };

export default async function Pagina() {
  const s = await exigirSessao();
  const jogadores = s.tipo === "mestre" ? (await db()`select id, name as nome from player order by lower(name)`).map((j) => ({ id: j.id as string, nome: j.nome as string })) : [];
  return (
    <>
      <Titulo numero="01" desc="Escolha a classe e o método dos atributos. O resto você preenche na ficha.">Nova ficha</Titulo>
      <NovaFicha mestre={s.tipo === "mestre"} jogadores={jogadores} />
    </>
  );
}
