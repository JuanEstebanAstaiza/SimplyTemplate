import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const actor = await conUsuario();
    if (actor.rol !== "ADMINISTRADOR") throw new AccionError("Solo el administrador asigna columnas y filas.", 403);
    const { id } = await context.params;
    const body = (await request.json()) as {
      hojaId?: string;
      eje?: "COLUMNA" | "FILA";
      refs?: string[];
      titulo?: string;
      usuarioIds?: string[];
    };
    if (!body.hojaId || (body.eje !== "COLUMNA" && body.eje !== "FILA") || !body.refs?.length) {
      throw new AccionError("Falta la columna o la fila que quiere asignar.");
    }
    const usuarios = body.usuarioIds ?? [];
    await prisma.asignacion.deleteMany({
      where: { plantillaId: id, hojaId: body.hojaId, eje: body.eje, refId: { in: body.refs } },
    });
    if (usuarios.length) {
      await prisma.asignacion.createMany({
        data: body.refs.flatMap((refId) =>
          usuarios.map((usuarioId) => ({
            plantillaId: id,
            usuarioId,
            hojaId: body.hojaId!,
            eje: body.eje!,
            refId,
            titulo: body.titulo ?? "",
          })),
        ),
        skipDuplicates: true,
      });
    }
    return NextResponse.json({ ok: true });
  });
}
