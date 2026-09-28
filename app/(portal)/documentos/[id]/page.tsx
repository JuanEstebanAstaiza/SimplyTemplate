import Link from "next/link";
import { notFound } from "next/navigation";
import { ArbolDocumentos } from "@/components/ArbolDocumentos";
import { usuarioActual } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { puedeVerDocumento } from "@/lib/documentos/acceso";
import { arbolDeDocumentos, type DocumentoHoja } from "@/lib/documentos/arbol";
import { estadoVigente } from "@/lib/folios/servicio";
import { formatoBogota } from "@/lib/vigencia";

export default async function DocumentosPlantillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioActual();
  const plantilla = await prisma.plantilla.findUnique({ where: { id } });
  if (!plantilla || !usuario) notFound();
  const estado = await estadoVigente(plantilla.headFolioId);
  const asignaciones = await prisma.asignacion.findMany({ where: { plantillaId: id, usuarioId: usuario.id } });
  const soportes = await prisma.soporteMeta.findMany({
    where: {
      OR: [{ folio: { plantillaId: id } }, { borradorOp: { borrador: { plantillaId: id, autorId: usuario.id } } }],
    },
    include: {
      folioOp: true,
      borradorOp: true,
      folio: { select: { numero: true } },
    },
    orderBy: { subidoEn: "desc" },
  });
  const autores = await prisma.usuario.findMany({
    where: { id: { in: [...new Set(soportes.map((item) => item.subidoPorId))] } },
    select: { id: true, nombre: true },
  });
  const nombres = new Map(autores.map((item) => [item.id, item.nombre]));
  const documentos: DocumentoHoja[] = [];
  for (const soporte of soportes) {
    const lugar = soporte.folioOp ?? soporte.borradorOp;
    if (!lugar?.hojaId || !lugar.filaId || !lugar.colId) continue;
    if (!puedeVerDocumento(usuario.rol, asignaciones, { hojaId: lugar.hojaId, filaId: lugar.filaId, colId: lugar.colId })) continue;
    documentos.push({
      id: soporte.id,
      nombre: soporte.nombreOriginal,
      mime: soporte.mime,
      bytes: soporte.bytes,
      sha256: soporte.sha256,
      cuando: formatoBogota(soporte.subidoEn),
      autor: nombres.get(soporte.subidoPorId) ?? "Funcionario",
      folio: soporte.folio ? `Folio ${soporte.folio.numero}` : "Borrador",
      hojaId: lugar.hojaId,
      filaId: lugar.filaId,
      colId: lugar.colId,
    });
  }
  return (
    <main>
      <p className="text-sm">
        <Link href="/documentos" className="underline">
          Gestión documental
        </Link>
      </p>
      <h1 className="mt-2 font-display text-4xl">{plantilla.nombre}</h1>
      <p className="mt-2 max-w-2xl text-graphite">Árbol de soportes de esta plantilla. PDF e imágenes se ven aquí. El resto se descarga.</p>
      <ArbolDocumentos columnas={arbolDeDocumentos(estado, documentos)} />
    </main>
  );
}
