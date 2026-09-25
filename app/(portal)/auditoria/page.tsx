import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatoBogota } from "@/lib/vigencia";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ cedula?: string; plantilla?: string; desde?: string; hasta?: string }>;
}) {
  const filtros = await searchParams;
  const plantillas = await prisma.plantilla.findMany({ orderBy: { nombre: "asc" } });
  const folios = await prisma.folio.findMany({
    where: {
      cedula: filtros.cedula || undefined,
      plantillaId: filtros.plantilla || undefined,
      creadoEn:
        filtros.desde || filtros.hasta
          ? {
              gte: filtros.desde ? new Date(`${filtros.desde}T00:00:00-05:00`) : undefined,
              lte: filtros.hasta ? new Date(`${filtros.hasta}T23:59:59-05:00`) : undefined,
            }
          : undefined,
    },
    include: { plantilla: true },
    orderBy: { creadoEn: "desc" },
    take: 300,
  });
  return (
    <main>
      <h1 className="font-display text-4xl">Auditoría</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Recorra los folios por cédula, plantilla y fecha. Cada folio abre su estado, sus soportes y su huella.
      </p>
      <form className="mt-4 flex flex-wrap gap-2" action="/auditoria">
        <input name="cedula" defaultValue={filtros.cedula} placeholder="Cédula" className="border border-rule bg-card px-2 py-1" />
        <select name="plantilla" defaultValue={filtros.plantilla} className="border border-rule bg-card px-2 py-1">
          <option value="">Todas las plantillas</option>
          {plantillas.map((plantilla) => (
            <option key={plantilla.id} value={plantilla.id}>
              {plantilla.nombre}
            </option>
          ))}
        </select>
        <input name="desde" type="date" defaultValue={filtros.desde} className="border border-rule bg-card px-2 py-1" />
        <input name="hasta" type="date" defaultValue={filtros.hasta} className="border border-rule bg-card px-2 py-1" />
        <button className="bg-indigo px-3 py-1 text-white" type="submit">
          Filtrar
        </button>
      </form>
      <ul className="mt-6 divide-y divide-rule border border-rule bg-card">
        {folios.map((folio) => (
          <li key={folio.id} className="px-4 py-3 text-sm">
            <Link className="underline" href={`/plantillas/${folio.plantillaId}/folios/${folio.numero}`}>
              {folio.plantilla.nombre} · folio {folio.numero}
            </Link>
            <p>
              {folio.nombreAutor} · {folio.cedula} · {formatoBogota(folio.creadoEn)} · {folio.resumen}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
