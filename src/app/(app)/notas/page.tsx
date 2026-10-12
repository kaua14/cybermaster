import { Titulo } from "@/components/Painel";
import { exigirMestre } from "@/server/auth/current";
import { Notas } from "./Notas";

export const metadata = { title: "Notas" };

export default async function Pagina() {
  await exigirMestre();
  return (
    <>
      <Titulo numero="04" desc="Notas da campanha. Ficam no banco e só o mestre vê. Salvam sozinhas.">Notas</Titulo>
      <Notas />
    </>
  );
}
