"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Menu({ itens }: { itens: { href: string; rotulo: string }[] }) {
  const atual = usePathname();
  return (
    <nav aria-label="Principal">
      <ul className="menu">
        {itens.map((i) => {
          const ativa = i.href === "/" ? atual === "/" : atual.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} className={ativa ? "ativa" : undefined} aria-current={ativa ? "page" : undefined}>
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
