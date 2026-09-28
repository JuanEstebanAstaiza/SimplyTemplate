import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { guardarBinario } from "@/lib/storage";

const PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const autor = await conUsuario();
    const { id } = await context.params;
    const form = await request.formData();
    const opId = String(form.get("opId") || "");
    const archivos = form.getAll("archivo").filter((item): item is File => item instanceof File && item.size > 0);
    if (!archivos.length || !opId) throw new AccionError("Anexe uno o más archivos al cambio.");
    const operacion = await prisma.borradorOperacion.findFirst({
      where: { id: opId, borrador: { plantillaId: id, autorId: autor.id } },
    });
    if (!operacion) throw new AccionError("El cambio no está en su borrador.");
    const soportes = [];
    for (const archivo of archivos) {
      const extension = archivo.name.toLowerCase();
      const extensionValida = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".csv", ".docx", ".xlsx", ".xlsm"].some((item) =>
        extension.endsWith(item),
      );
      if (!extensionValida && !PERMITIDOS.has(archivo.type)) throw new AccionError("Ese tipo de archivo no se puede anexar.");
      if (archivo.size > Number(process.env.MAX_UPLOAD_BYTES || 15_728_640)) throw new AccionError("Un soporte supera el tamaño permitido.");
      const buffer = Buffer.from(await archivo.arrayBuffer());
      const guardado = await guardarBinario(archivo.name, archivo.type || "application/octet-stream", buffer);
      const soporte = await prisma.soporteMeta.create({
        data: {
          borradorOpId: operacion.id,
          nombreOriginal: archivo.name,
          mime: archivo.type || "application/octet-stream",
          bytes: archivo.size,
          sha256: guardado.sha256,
          gridfsId: guardado.id,
          subidoPorId: autor.id,
        },
      });
      soportes.push({ id: soporte.id, nombre: soporte.nombreOriginal });
    }
    return NextResponse.json({ soporte: soportes[0], soportes });
  });
}
