import { Titulo } from "@/components/Painel";
import { exigirMestre } from "@/server/auth/current";
import { Npcs } from "./Npcs";

export const metadata = { title: "NPCs e ganchos" };

export default async function Pagina() {
  await exigirMestre();
  return (
    <>
      <Titulo numero="03" desc="Tabelas para improvisar. Os valores são ponto de partida, ajuste à vontade.">NPCs e ganchos</Titulo>
      <Npcs />
    </>
  );
}
