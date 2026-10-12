import { notFound } from "next/navigation";
import { Titulo } from "@/components/Painel";
import { CLASSE_POR_ID } from "@/rules/classes";
import { exigirSessao } from "@/server/auth/current";
import { carregarFicha } from "@/server/fichas";
import { ErroHttp } from "@/server/http";
import { Editor } from "./Editor";

export const metadata = { title: "Ficha" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSessao();
  const { id } = await params;
  let f;
  try {
    f = await carregarFicha(s, id);
  } catch (e) {
    if (e instanceof ErroHttp && e.status === 404) notFound();
    throw e;
  }
  return (
    <>
      <Titulo numero="01" desc={CLASSE_POR_ID.get(f.classe)?.nome}>{f.nome}</Titulo>
      <Editor
        id={f.id}
        inicial={{ nome: f.nome, classe: f.classe, dados: f.dados }}
        version={f.version}
        dano={f.dano}
        concluida={f.criacaoConcluida}
        dono={f.dono.nome}
        mestre={s.tipo === "mestre"}
      />
    </>
  );
}
