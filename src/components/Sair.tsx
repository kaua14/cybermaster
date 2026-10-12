"use client";
import { useRouter } from "next/navigation";
import { useApi } from "./Api";

export function Sair() {
  const api = useApi();
  const router = useRouter();
  return (
    <button
      className="btn"
      onClick={async () => {
        await api("POST", "/api/auth/logout");
        router.replace("/login");
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
