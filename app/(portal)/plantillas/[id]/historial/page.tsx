import Link from "next/link";
import { notFound } from "next/navigation";
import { HistorialGit } from "@/components/HistorialGit";
import { usuarioActual } from "@/lib/auth/session";
import { puede } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { verificarCadena } from "@/lib/folios/servicio";
import { formatoBogota } from "@/lib/vigencia";

export default async function HistorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioActual();
  const plantilla = await prisma.plantilla.findUnique({ where: { id } });
  if (!plantilla || !usuario) notFound();
  const folios = await prisma.folio.findMany({
    where: { plantillaId: id },
    orderBy: { numero: "desc" },
    include: { soportes: true, operaciones: { orderBy: { orden: "asc" } } },
  });
  const cadena = await verificarCadena(id);
  const nodos = folios.map((folio) => ({
    id: folio.id,
    numero: folio.numero,
    tipo: folio.tipo,
    estado: folio.estado,
    resumen: folio.resumen,
    nombreAutor: folio.nombreAutor,
    cedula: folio.cedula,
    cargoAutor: folio.cargoAutor,
    cuando: formatoBogota(folio.creadoEn),
    hashCorto: folio.hashFolio.slice(0, 10),
    esCabeza: folio.id === plantilla.headFolioId,
    operaciones: folio.operaciones.map((op) => `${op.tipo}${op.justificacion ? ` · ${op.justificacion}` : ""}`),
    soportes: folio.soportes.map((soporte) => soporte.nombreOriginal),
  }));
  return (
    <main>
      <p className="text-sm">
        <Link href={`/plantillas/${id}`} className="underline">
          Volver a la hoja
        </Link>
      </p>
      <h1 className="mt-2 font-display text-4xl">Historial de folios</h1>
      <p className="mt-2 max-w-2xl text-graphite">
        Cada folio es un punto de la cadena. La cabeza es la versión vigente. Devolver crea un folio nuevo y deja los anteriores a la vista.
      </p>
      <p className={`mt-2 text-sm ${cadena.ok ? "text-ink" : "text-seal"}`}>
        {cadena.ok
          ? `La cadena cierra en ${cadena.folios} folios.`
          : `La cadena se rompe en el folio ${cadena.numero}: ${cadena.motivo}`}
      </p>
      <HistorialGit
        plantillaId={id}
        nodos={nodos}
        puedeDevolver={puede(usuario.rol, "devolver")}
        puedeFirmar={puede(usuario.rol, "contrafirmar")}
      />
    </main>
  );
}
