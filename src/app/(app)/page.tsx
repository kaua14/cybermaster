import Link from "next/link";
import { Vazio } from "@/components/Ilustracoes";
import { Painel, Titulo } from "@/components/Painel";
import { exigirSessao } from "@/server/auth/current";

export const metadata = { title: "Fichas" };

export default async function Hub() {
  const s = await exigirSessao();
  return (
    <>
      <Titulo numero="01" desc={s.tipo === "mestre" ? "Todas as fichas da mesa." : "Suas fichas. Só você e o mestre veem."}>
        Fichas
      </Titulo>
      <Painel legenda={s.tipo === "mestre" ? "Fichas da mesa" : "Seus personagens"}>
        <div className="vazio">
          <Vazio />
          <p>Nenhuma ficha ainda.</p>
          {s.tipo === "mestre" && (
            <p className="nota-pe" style={{ marginTop: 10 }}>
              Primeiro, <Link href="/jogadores">convide os jogadores</Link>.
            </p>
          )}
        </div>
      </Painel>
    </>
  );
}
