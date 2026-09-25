"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navegacion({ enlaces }: { enlaces: string[][] }) {
  const ruta = usePathname();
  return (
    <div className="flex flex-wrap gap-1 lg:flex-col">
      {enlaces.map(([href, etiqueta]) => {
        const activa = href === "/" ? ruta === "/" : ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`border-l-2 px-3 py-1.5 text-sm text-white no-underline ${
              activa ? "border-brass bg-white/10" : "border-transparent"
            }`}
          >
            {etiqueta}
          </Link>
        );
      })}
    </div>
  );
}
