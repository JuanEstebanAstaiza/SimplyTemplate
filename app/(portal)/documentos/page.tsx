import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DocumentosPage() {
  const plantillas = await prisma.plantilla.findMany({ orderBy: { nombre: "asc" } });
  return (
    <main>
      <h1 className="font-display text-4xl">Gestión documental</h1>
      <p className="mt-2 max-w-2xl text-graphite">
        Cada plantilla guarda su propio árbol de soportes. Lo que usted ve depende de las columnas y filas que tenga asignadas.
      </p>
      <ul className="mt-6 divide-y divide-rule border border-rule bg-card">
        {plantillas.map((plantilla) => (
          <li key={plantilla.id}>
            <Link href={`/documentos/${plantilla.id}`} className="block px-4 py-3 text-ink no-underline">
              <span className="font-display text-2xl">{plantilla.nombre}</span>
              <span className="mt-1 block text-sm text-graphite">Abrir el árbol de documentos</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
