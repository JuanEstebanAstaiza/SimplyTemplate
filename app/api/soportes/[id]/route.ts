import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { puedeVerDocumento } from "@/lib/documentos/acceso";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { leerBinario } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const usuario = await conUsuario();
    const { id } = await context.params;
    const soporte = await prisma.soporteMeta.findUnique({
      where: { id },
      include: {
        folioOp: true,
        folio: { select: { plantillaId: true } },
        borradorOp: { include: { borrador: { select: { plantillaId: true, autorId: true } } } },
      },
    });
    if (!soporte) return NextResponse.json({ error: "El soporte no está." }, { status: 404 });
    const lugar = soporte.folioOp ?? soporte.borradorOp;
    const plantillaId = soporte.folio?.plantillaId ?? soporte.borradorOp?.borrador.plantillaId;
    if (!lugar || !plantillaId) throw new AccionError("El soporte no está ligado a una plantilla.", 404);
    const ajeno = soporte.borradorOp && soporte.borradorOp.borrador.autorId !== usuario.id && usuario.rol !== "ADMINISTRADOR" && !soporte.folioId;
    if (ajeno) throw new AccionError("Ese soporte todavía no está radicado.", 403);
    const asignaciones = await prisma.asignacion.findMany({ where: { plantillaId, usuarioId: usuario.id } });
    if (!puedeVerDocumento(usuario.rol, asignaciones, { hojaId: lugar.hojaId, filaId: lugar.filaId, colId: lugar.colId })) {
      throw new AccionError("No tiene permiso para ver este soporte.", 403);
    }
    const archivo = await leerBinario(soporte.gridfsId);
    if (!archivo) return NextResponse.json({ error: "El archivo no está." }, { status: 404 });
    const ver = new URL(request.url).searchParams.get("ver") === "1";
    const visible = soporte.mime.startsWith("image/") || soporte.mime === "application/pdf";
    return new NextResponse(new Uint8Array(archivo.buffer), {
      headers: {
        "Content-Type": soporte.mime,
        "Content-Disposition": `${ver && visible ? "inline" : "attachment"}; filename="${soporte.nombreOriginal.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
