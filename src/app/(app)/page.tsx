import Link from "next/link";
import { Vazio } from "@/components/Ilustracoes";
import { Painel, Titulo } from "@/components/Painel";
import { CLASSE_POR_ID } from "@/rules/classes";
import { estadoDoDano } from "@/rules/ferimentos";
import { exigirSessao } from "@/server/auth/current";
import { db } from "@/server/db";
import { FiltroJogador } from "./FiltroJogador";

export const metadata = { title: "Fichas" };

export default async function Hub({ searchParams }: { searchParams: Promise<{ jogador?: string }> }) {
  const s = await exigirSessao();
  const mestre = s.tipo === "mestre";
  const { jogador } = await searchParams;
  const filtro = mestre && jogador && /^[0-9a-f-]{36}$/i.test(jogador) ? jogador : null;
  const dono = mestre ? filtro : s.jogadorId;

  const fichas = await db()`
    select c.id, c.nome, c.classe, c.dano, c.criacao_concluida, p.name as jogador
    from character c join player p on p.id = c.owner_id
    where (${dono}::uuid is null or c.owner_id = ${dono}::uuid)
    order by lower(p.name), lower(c.nome)`;
  const jogadores = mestre ? await db()`select id, name as nome from player order by lower(name)` : [];

  return (
    <>
      <Titulo numero="01" desc={mestre ? "Todas as fichas da mesa." : "Suas fichas. Só você e o mestre veem."}>
        Fichas
      </Titulo>
      <div className="linha" style={{ justifyContent: "space-between", marginBottom: 26 }}>
        {(!mestre || jogadores.length > 0) && <Link href="/fichas/nova" className="btn btn-principal">Nova ficha</Link>}
        {mestre && jogadores.length > 0 && (
          <FiltroJogador jogadores={jogadores.map((j) => ({ id: j.id, nome: j.nome }))} atual={filtro ?? ""} />
        )}
      </div>
      <Painel legenda={mestre ? "Fichas da mesa" : "Seus personagens"}>
        {fichas.length === 0 ? (
          <div className="vazio">
            <Vazio />
            <p>Nenhuma ficha ainda.</p>
            {mestre && jogadores.length === 0 && (
              <p className="nota-pe" style={{ marginTop: 10 }}>
                Primeiro, <Link href="/jogadores">convide os jogadores</Link>.
              </p>
            )}
          </div>
        ) : (
          <div className="tabela-rolavel">
            <table>
              <thead>
                <tr>
                  <th>Personagem</th>
                  <th>Classe</th>
                  {mestre && <th>Jogador</th>}
                  <th>Ferimento</th>
                  <th>Criação</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.id}>
                    <td><Link href={`/fichas/${f.id}`}>{f.nome}</Link></td>
                    <td>{CLASSE_POR_ID.get(f.classe)?.nome ?? f.classe}</td>
                    {mestre && <td>{f.jogador}</td>}
                    <td className="pag">{estadoDoDano(f.dano)?.nome ?? "Ileso"}</td>
                    <td>{f.criacao_concluida ? <span className="etiqueta ouro">Pronta</span> : <span className="etiqueta cinza">Em criação</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>
    </>
  );
}
