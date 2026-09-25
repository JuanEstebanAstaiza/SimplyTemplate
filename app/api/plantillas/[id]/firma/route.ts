import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { responderFirma } from "@/lib/folios/servicio";
import { conError } from "@/lib/rutas";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const autor = await conUsuario();
    const { id } = await context.params;
    const body = (await request.json()) as { folioId?: string; password?: string; rechazo?: boolean; justificacion?: string };
    await responderFirma(id, autor, body.folioId || "", body.password || "", Boolean(body.rechazo), body.justificacion || "");
    return NextResponse.json({ ok: true });
  });
}
