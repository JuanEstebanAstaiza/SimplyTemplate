import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { formatoBogota } from "@/lib/vigencia";
import { conError } from "@/lib/rutas";
import { escribirCsv, escribirExcel, inyectarOriginal } from "@/lib/libros/escribir";
import { leerBinario, leerEstado } from "@/lib/storage";
import type { EstadoLibro } from "@/lib/libro/tipos";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    await conUsuario();
    const { id } = await context.params;
    const url = new URL(request.url);
    const formato = url.searchParams.get("formato") || "xlsx";
    const numero = Number(url.searchParams.get("folio") || 0);
    const plantilla = await prisma.plantilla.findUnique({ where: { id } });
    if (!plantilla) throw new AccionError("La plantilla no existe.", 404);
    const folio = numero
      ? await prisma.folio.findUnique({ where: { plantillaId_numero: { plantillaId: id, numero } } })
      : plantilla.headFolioId
        ? await prisma.folio.findUnique({ where: { id: plantilla.headFolioId } })
        : null;
    if (!folio) throw new AccionError("No hay un folio para exportar.");
    const estado = await leerEstado<EstadoLibro>(folio.mongoEstadoId);
    if (!estado) throw new AccionError("No se encontró el estado del folio.");
    const folios = await prisma.folio.findMany({
      where: { plantillaId: id, numero: { lte: folio.numero } },
      orderBy: { numero: "asc" },
      include: { operaciones: true, soportes: true },
    });
    if (formato === "csv") {
      return new NextResponse(escribirCsv(estado), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${plantilla.nombre}-folio-${folio.numero}.csv"`,
        },
      });
    }
    const trazabilidad = [
      ["Folio", "Fecha", "Cédula", "Funcionario", "Cargo", "Tipo", "Resumen", "Soportes", "Huella"],
      ...folios.map((item) => [
        String(item.numero),
        formatoBogota(item.creadoEn),
        item.cedula,
        item.nombreAutor,
        item.cargoAutor,
        item.tipo,
        item.resumen,
        item.soportes.map((soporte) => `${soporte.nombreOriginal} ${soporte.sha256}`).join("; "),
        item.hashFolio,
      ]),
    ];
    let buffer = await escribirExcel(estado, trazabilidad);
    const macro = formato === "xlsm" && plantilla.libroOriginalId;
    if (macro) {
      const original = await leerBinario(plantilla.libroOriginalId!);
      if (original) buffer = await inyectarOriginal(buffer, original.buffer);
    }
    const extension = macro ? "xlsm" : "xlsx";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": macro
          ? "application/vnd.ms-excel.sheet.macroEnabled.12"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${plantilla.nombre}-folio-${folio.numero}.${extension}"`,
      },
    });
  });
}
