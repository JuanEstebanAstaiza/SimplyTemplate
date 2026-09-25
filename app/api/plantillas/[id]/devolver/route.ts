import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { devolver } from "@/lib/folios/servicio";
import { conError } from "@/lib/rutas";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const autor = await conUsuario();
    const { id } = await context.params;
    const body = (await request.json()) as { numero?: number; password?: string; justificacion?: string };
    const resultado = await devolver(id, autor, Number(body.numero), body.password || "", body.justificacion || "");
    return NextResponse.json(resultado);
  });
}
