"use client";
import { useRouter } from "next/navigation";

export function FiltroJogador({ jogadores, atual }: { jogadores: { id: string; nome: string }[]; atual: string }) {
  const router = useRouter();
  return (
    <div style={{ minWidth: 200 }}>
      <label htmlFor="filtro-jogador">Jogador</label>
      <select id="filtro-jogador" value={atual} onChange={(e) => router.push(e.target.value ? `/?jogador=${e.target.value}` : "/")}>
        <option value="">Todos</option>
        {jogadores.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
      </select>
    </div>
  );
}
