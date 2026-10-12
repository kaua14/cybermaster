import { redirect } from "next/navigation";
import { Estrada } from "@/components/Ilustracoes";
import { sessaoAtual } from "@/server/auth/current";

export const dynamic = "force-dynamic";

export default async function PublicoLayout({ children }: { children: React.ReactNode }) {
  if (await sessaoAtual()) redirect("/");
  return (
    <main className="porta">
      <div className="porta-caixa">
        <div className="marca">
          <b>Cyber<span>master</span></b>
          <small>Cyberpunk 2020 · mesa</small>
        </div>
        <div className="cena"><Estrada /></div>
        {children}
        <p className="nota-pe" style={{ marginTop: 18, textAlign: "center" }}>
          Ferramenta de fã, baseada em Cyberpunk 2020 © R. Talsorian Games.
        </p>
      </div>
    </main>
  );
}
