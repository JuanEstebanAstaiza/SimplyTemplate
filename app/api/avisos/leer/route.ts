import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { conError } from "@/lib/rutas";

export async function POST(request: Request) {
  return conError(async () => {
    const actor = await conUsuario();
    const body = (await request.json()) as { ids?: string[] };
    await prisma.avisoDestino.updateMany({
      where: { usuarioId: actor.id, avisoId: { in: body.ids ?? [] }, leidoEn: null },
      data: { leidoEn: new Date() },
    });
    return NextResponse.json({ ok: true });
  });
}
