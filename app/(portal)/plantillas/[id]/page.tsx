import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorHoja, type OpVista } from "@/components/EditorHoja";
import { Estado } from "@/components/Estado";
import { MarcoPlantilla } from "@/components/MarcoPlantilla";
import { usuarioActual } from "@/lib/auth/session";
import { puede } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { comoOperacion, estadoVigente } from "@/lib/folios/servicio";
import { aplicarTodas } from "@/lib/libro/aplicar";
import type { Operacion } from "@/lib/libro/tipos";
import { dentroDeVigencia, fechaCortaBogota, formatoBogota } from "@/lib/vigencia";

export default async function PlantillaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioActual();
  const plantilla = await prisma.plantilla.findUnique({ where: { id } });
  if (!plantilla || !usuario) notFound();
  const base = await estadoVigente(plantilla.headFolioId);
  const borrador = await prisma.borrador.findUnique({
    where: { plantillaId_autorId: { plantillaId: id, autorId: usuario.id } },
    include: { operaciones: { orderBy: { orden: "asc" }, include: { soportes: true } } },
  });
  const operaciones: OpVista[] = (borrador?.operaciones ?? []).map((row) => ({
    id: row.id,
    op: comoOperacion(row.payload, row.justificacion),
    soportes: row.soportes.map((soporte) => ({ id: soporte.id, nombre: soporte.nombreOriginal })),
  }));
  const vista = aplicarTodas(base, operaciones.map((item) => item.op as Operacion));
  const vigente = plantilla.estado !== "ACTIVA" || dentroDeVigencia(plantilla.vigenciaInicio, plantilla.vigenciaFin);
  const lectura = !puede(usuario.rol, "editar") || plantilla.estado === "CERRADA" || (plantilla.estado === "ACTIVA" && !vigente);
  const folio = plantilla.headFolioId ? await prisma.folio.findUnique({ where: { id: plantilla.headFolioId } }) : null;
  const funcionarios = await prisma.usuario.findMany({
    where: { activo: true, rol: { in: ["EDITOR", "REVISOR", "ADMINISTRADOR"] } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
  const asignaciones = await prisma.asignacion.findMany({ where: { plantillaId: id } });
  const nombres = new Map(funcionarios.map((persona) => [persona.id, persona.nombre]));
  const limitado = usuario.rol !== "ADMINISTRADOR" && asignaciones.some((item) => item.usuarioId === usuario.id);
  return (
    <main className="flex min-h-[80vh] flex-col">
      <div className="mb-4 border border-rule border-t-[3px] border-t-brass bg-card px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Estado valor={plantilla.estado} />
            <h1 className="mt-1 font-display text-4xl">{plantilla.nombre}</h1>
          </div>
          <p className="text-sm">
            Folio {folio?.numero ?? "—"} · {folio ? folio.nombreAutor : "sin radicar"} · {folio?.cedula} ·{" "}
            {folio ? formatoBogota(folio.creadoEn) : ""}
          </p>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Vigencia {fechaCortaBogota(plantilla.vigenciaInicio)} – {fechaCortaBogota(plantilla.vigenciaFin)}
        </p>
        <div className="mt-2 flex gap-4 text-sm">
          <Link className="underline" href={`/plantillas/${id}/historial`}>
            Historial de folios
          </Link>
          <Link className="underline" href={`/documentos/${id}`}>
            Documentos
          </Link>
          <a className="underline" href={`/api/plantillas/${id}/export?formato=xlsx`}>
            Exportar xlsx
          </a>
          <a className="underline" href={`/api/plantillas/${id}/export?formato=csv`}>
            Exportar csv
          </a>
          {plantilla.tieneMacros ? (
            <a className="underline" href={`/api/plantillas/${id}/export?formato=xlsm`}>
              Exportar xlsm
            </a>
          ) : null}
        </div>
        {puede(usuario.rol, "vigencia") ? <MarcoPlantilla id={id} estado={plantilla.estado} /> : null}
      </div>
      <EditorHoja
        plantillaId={id}
        estadoInicial={vista}
        operacionesIniciales={operaciones}
        lectura={lectura}
        desfasado={Boolean(borrador && (borrador.baseFolioId ?? null) !== (plantilla.headFolioId ?? null))}
        tieneMacros={plantilla.tieneMacros}
        tieneTablaDinamica={plantilla.tieneTablaDinamica}
        fueraDeVigencia={plantilla.estado === "ACTIVA" && !vigente}
        esAdmin={usuario.rol === "ADMINISTRADOR"}
        limitado={limitado}
        funcionarios={funcionarios.map((persona) => ({ id: persona.id, nombre: persona.nombre }))}
        atajosInicial={usuario.atajos}
        asignaciones={asignaciones.map((item) => ({
          hojaId: item.hojaId,
          eje: item.eje,
          refId: item.refId,
          usuario: nombres.get(item.usuarioId) ?? "Funcionario",
          propia: item.usuarioId === usuario.id,
        }))}
      />
    </main>
  );
}
