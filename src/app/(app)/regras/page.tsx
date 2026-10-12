import { Titulo } from "@/components/Painel";
import { exigirSessao } from "@/server/auth/current";
import { Regras } from "./Regras";

export const metadata = { title: "Regras" };

export default async function Pagina() {
  await exigirSessao();
  return (
    <>
      <Titulo numero="02" desc="Cola para narrar sem travar. Resumos com palavras nossas e a página do livro em cada regra. O que não deu para confirmar aparece com “conferir”.">
        Regras
      </Titulo>
      <Regras />
    </>
  );
}
