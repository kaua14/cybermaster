import { CsrfProvider } from "@/components/Api";
import { Paisagem } from "@/components/Ilustracoes";
import { Menu } from "@/components/Menu";
import { Sair } from "@/components/Sair";
import { exigirSessao } from "@/server/auth/current";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Cada página confere a sessão de novo; aqui só monta a moldura.
  const s = await exigirSessao({ permitirTrocaPendente: true });
  const itens = s.trocarSenha
    ? [{ href: "/conta", rotulo: "Conta" }]
    : [
        { href: "/", rotulo: "Fichas" },
        { href: "/regras", rotulo: "Regras" },
        ...(s.tipo === "mestre"
          ? [
              { href: "/npcs", rotulo: "NPCs" },
              { href: "/notas", rotulo: "Notas" },
              { href: "/jogadores", rotulo: "Jogadores" },
            ]
          : []),
        { href: "/conta", rotulo: "Conta" },
      ];

  return (
    <CsrfProvider token={s.csrf}>
      <div className="app">
        <aside className="lateral">
          <div className="cena"><Paisagem /></div>
          <div className="marca">
            <b>Cyber<span>master</span></b>
            <small>Cyberpunk 2020 · mesa</small>
          </div>
          <Menu itens={itens} />
          <div className="lateral-rodape">
            <Sair />
            <div style={{ marginTop: 6 }}>Ferramenta de fã. Sem rastreio, sem anúncios.</div>
          </div>
        </aside>
        <main className="conteudo">
          <div className="status">
            <span>Edição <b>Devir · 1996</b></span>
            <span>Entrou como <b>{s.tipo === "mestre" ? "Mestre" : s.nome}</b></span>
          </div>
          {children}
          <div className="aviso">Ferramenta de fã, baseada em Cyberpunk 2020 © R. Talsorian Games. Não substitui o livro.</div>
        </main>
      </div>
    </CsrfProvider>
  );
}
