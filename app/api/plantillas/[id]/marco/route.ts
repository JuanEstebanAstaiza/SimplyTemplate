import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { moverPlantilla } from "@/lib/folios/servicio";
import { conError } from "@/lib/rutas";
import { finDiaBogota } from "@/lib/vigencia";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const autor = await conUsuario();
    const { id } = await context.params;
    const body = (await request.json()) as {
      accion?: "activar" | "cerrar" | "prorrogar";
      password?: string;
      justificacion?: string;
      vigenciaFin?: string;
    };
    if (!body.accion) return NextResponse.json({ error: "Falta la acción." }, { status: 400 });
    await moverPlantilla({
      plantillaId: id,
      autor,
      password: body.password || "",
      justificacion: body.justificacion || "",
      accion: body.accion,
      vigenciaFin: body.vigenciaFin ? finDiaBogota(body.vigenciaFin) : undefined,
    });
    return NextResponse.json({ ok: true });
  });
}
