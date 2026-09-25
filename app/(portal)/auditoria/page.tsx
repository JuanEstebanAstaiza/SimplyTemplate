import { ArbolGit, type NodoArbol } from "@/components/ArbolGit";
import { prisma } from "@/lib/db";
import { ramasDeCambio } from "@/lib/libro/ramas";
import type { EstadoLibro } from "@/lib/libro/tipos";
import { leerEstado } from "@/lib/storage";
import { formatoBogota } from "@/lib/vigencia";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ cedula?: string; plantilla?: string; desde?: string; hasta?: string }>;
}) {
  const filtros = await searchParams;
  const plantillas = await prisma.plantilla.findMany({ orderBy: { nombre: "asc" } });
  const elegidas = filtros.plantilla ? plantillas.filter((item) => item.id === filtros.plantilla) : plantillas;
  const arboles = [];
  for (const plantilla of elegidas) {
    const folios = await prisma.folio.findMany({
      where: {
        plantillaId: plantilla.id,
        cedula: filtros.cedula || undefined,
        creadoEn:
          filtros.desde || filtros.hasta
            ? {
                gte: filtros.desde ? new Date(`${filtros.desde}T00:00:00-05:00`) : undefined,
                lte: filtros.hasta ? new Date(`${filtros.hasta}T23:59:59-05:00`) : undefined,
              }
            : undefined,
      },
      orderBy: { numero: "desc" },
      take: 40,
    });
    const nodos: NodoArbol[] = [];
    for (const folio of folios) {
      const despues = await leerEstado<EstadoLibro>(folio.mongoEstadoId);
      const padre = folio.padreId ? await prisma.folio.findUnique({ where: { id: folio.padreId } }) : null;
      const antes = padre ? await leerEstado<EstadoLibro>(padre.mongoEstadoId) : null;
      nodos.push({
        id: folio.id,
        plantillaId: plantilla.id,
        numero: folio.numero,
        resumen: folio.resumen,
        autor: folio.nombreAutor,
        cedula: folio.cedula,
        cuando: formatoBogota(folio.creadoEn),
        hashCorto: folio.hashFolio.slice(0, 10),
        esCabeza: folio.id === plantilla.headFolioId,
        ramas: despues ? ramasDeCambio(antes, despues) : [],
      });
    }
    arboles.push({ nombre: plantilla.nombre, nodos });
  }
  return (
    <main>
      <h1 className="font-display text-4xl">Auditoría</h1>
      <p className="mt-2 max-w-2xl text-graphite">
        Cada plantilla es un tronco de folios. De cada folio salen ramas con el título de la columna que cambió, para leer la edición sin abrir la hoja.
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
      {arboles.map((arbol) => (
        <ArbolGit key={arbol.nombre} nombre={arbol.nombre} nodos={arbol.nodos} />
      ))}
    </main>
  );
}
