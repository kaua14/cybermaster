import { Painel, Titulo } from "@/components/Painel";
import { Sair } from "@/components/Sair";
import { exigirSessao } from "@/server/auth/current";
import { TrocarSenha } from "./TrocarSenha";

export const metadata = { title: "Conta" };

export default async function Conta() {
  const s = await exigirSessao({ permitirTrocaPendente: true });
  return (
    <>
      <Titulo numero={s.tipo === "mestre" ? "06" : "03"}>Conta</Titulo>
      {s.tipo === "jogador" ? (
        <TrocarSenha temporaria={s.trocarSenha} />
      ) : (
        <Painel legenda="Senha do mestre">
          <p>A senha do mestre não se troca por aqui. Quem administra o servidor roda o script <code>scripts/set-master-password</code> (veja o README).</p>
        </Painel>
      )}
      <Painel legenda="Sessão">
        <Sair />
      </Painel>
    </>
  );
}
