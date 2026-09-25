import Link from "next/link";
import { notFound } from "next/navigation";
import { AccionesFolio } from "@/components/AccionesFolio";
import { EditorHoja } from "@/components/EditorHoja";
import { usuarioActual } from "@/lib/auth/session";
import { puede } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { diferencias } from "@/lib/libro/diff";
import type { EstadoLibro } from "@/lib/libro/tipos";
import { libroVacio } from "@/lib/libro/vacio";
import { leerEstado } from "@/lib/storage";
import { formatoBogota } from "@/lib/vigencia";

export default async function FolioPage({ params }: { params: Promise<{ id: string; numero: string }> }) {
  const { id, numero } = await params;
  const usuario = await usuarioActual();
  const folio = await prisma.folio.findUnique({
    where: { plantillaId_numero: { plantillaId: id, numero: Number(numero) } },
    include: { plantilla: true, operaciones: { orderBy: { orden: "asc" } }, soportes: true, firmas: true },
  });
  if (!folio || !usuario) notFound();
  const estado = (await leerEstado<EstadoLibro>(folio.mongoEstadoId)) ?? libroVacio();
  const anterior = folio.numero > 1
    ? await prisma.folio.findUnique({ where: { plantillaId_numero: { plantillaId: id, numero: folio.numero - 1 } } })
    : null;
  const estadoAnterior = anterior ? await leerEstado<EstadoLibro>(anterior.mongoEstadoId) : null;
  const cambios = estadoAnterior ? diferencias(estadoAnterior, estado) : [];
  return (
    <main>
      <p className="text-sm">
        <Link className="underline" href={`/plantillas/${id}/historial`}>
          Historial
        </Link>
      </p>
      <div className="mt-2 border border-rule bg-card px-4 py-3">
        <h1 className="font-display text-4xl">
          Folio {folio.numero} · {folio.plantilla.nombre}
        </h1>
        <p className="mt-1 text-sm">
          {folio.nombreAutor} · cédula {folio.cedula} · {folio.cargoAutor} · {formatoBogota(folio.creadoEn)} · {folio.estado}
        </p>
        <p className="mt-1 break-all text-xs text-ink-soft">Huella {folio.hashFolio}</p>
        <div className="mt-2 flex gap-3 text-sm">
          <a className="underline" href={`/api/plantillas/${id}/export?formato=xlsx&folio=${folio.numero}`}>
            Excel
          </a>
          <a className="underline" href={`/api/plantillas/${id}/export?formato=csv&folio=${folio.numero}`}>
            CSV
          </a>
        </div>
      </div>
      <ul className="my-4 space-y-1 text-sm">
        {cambios.map((cambio, index) => (
          <li key={`${cambio.donde}-${index}`}>
            {cambio.hoja} {cambio.donde}: {cambio.antes || "vacío"} → {cambio.despues || "vacío"}
          </li>
        ))}
      </ul>
      <ul className="mb-4 text-sm">
        {folio.operaciones.map((op) => (
          <li key={op.id}>
            {op.tipo} · {op.justificacion}
          </li>
        ))}
        {folio.soportes.map((soporte) => (
          <li key={soporte.id}>
            <a className="underline" href={`/api/soportes/${soporte.id}`}>
              {soporte.nombreOriginal}
            </a>{" "}
            · {soporte.sha256}
          </li>
        ))}
      </ul>
      <AccionesFolio
        plantillaId={id}
        numero={folio.numero}
        folioId={folio.id}
        pendiente={folio.estado === "PENDIENTE_FIRMA"}
        puedeDevolver={puede(usuario.rol, "devolver")}
        puedeFirmar={puede(usuario.rol, "contrafirmar")}
      />
      <div className="mt-6">
        <EditorHoja
          plantillaId={id}
          estadoInicial={estado}
          operacionesIniciales={[]}
          lectura
          desfasado={false}
          tieneMacros={folio.plantilla.tieneMacros}
          tieneTablaDinamica={folio.plantilla.tieneTablaDinamica}
          fueraDeVigencia={false}
          mostrarRadicar={false}
        />
      </div>
    </main>
  );
}
