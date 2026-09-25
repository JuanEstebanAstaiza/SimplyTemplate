import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { radicar } from "@/lib/folios/servicio";
import { conError } from "@/lib/rutas";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const autor = await conUsuario();
    const { id } = await context.params;
    const body = (await request.json()) as { password?: string; resumen?: string };
    const resultado = await radicar(id, autor, body.password || "", body.resumen || "");
    return NextResponse.json(resultado);
  });
}
