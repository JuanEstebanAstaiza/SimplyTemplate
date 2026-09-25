import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { anotarOperacion, descartarBorrador, justificarOperacion, tomarFolioVigente } from "@/lib/folios/servicio";
import type { Operacion } from "@/lib/libro/tipos";
import { conError } from "@/lib/rutas";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const autor = await conUsuario();
    const { id } = await context.params;
    const body = (await request.json()) as { op: Operacion };
    const opId = await anotarOperacion(id, autor, body.op);
    return NextResponse.json({ id: opId });
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const autor = await conUsuario();
    const { id } = await context.params;
    const body = (await request.json()) as { opId?: string; justificacion?: string; tomarVigente?: boolean; descartar?: boolean };
    if (body.descartar) {
      await descartarBorrador(id, autor.id);
      return NextResponse.json({ ok: true });
    }
    if (body.tomarVigente) {
      await tomarFolioVigente(id, autor.id);
      return NextResponse.json({ ok: true });
    }
    if (!body.opId || !body.justificacion) return NextResponse.json({ error: "Falta la justificación." }, { status: 400 });
    await justificarOperacion(id, autor.id, body.opId, body.justificacion);
    return NextResponse.json({ ok: true });
  });
}
