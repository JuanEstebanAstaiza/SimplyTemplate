import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { conError } from "@/lib/rutas";
import { leerBinario } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    await conUsuario();
    const { id } = await context.params;
    const soporte = await prisma.soporteMeta.findUnique({ where: { id } });
    if (!soporte) return NextResponse.json({ error: "El soporte no está." }, { status: 404 });
    const archivo = await leerBinario(soporte.gridfsId);
    if (!archivo) return NextResponse.json({ error: "El archivo no está." }, { status: 404 });
    return new NextResponse(new Uint8Array(archivo.buffer), {
      headers: {
        "Content-Type": soporte.mime,
        "Content-Disposition": `attachment; filename="${soporte.nombreOriginal.replace(/"/g, "")}"`,
      },
    });
  });
}
