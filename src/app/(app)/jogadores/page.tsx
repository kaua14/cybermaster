import { Titulo } from "@/components/Painel";
import { exigirMestre } from "@/server/auth/current";
import { Jogadores } from "./Jogadores";

export const metadata = { title: "Jogadores" };

export default async function Pagina() {
  await exigirMestre();
  return (
    <>
      <Titulo numero="02" desc="Convide cada jogador pelo nome. Ele recebe um código e cria a própria senha. Você nunca vê a senha de ninguém.">
        Jogadores
      </Titulo>
      <Jogadores />
    </>
  );
}
