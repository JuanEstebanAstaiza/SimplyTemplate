import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { conError } from "@/lib/rutas";
import { leerBinario } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    await conUsuario();
    const { id } = await context.params;
    const archivo = await leerBinario(id);
    if (!archivo) return NextResponse.json({ error: "La foto no está." }, { status: 404 });
    return new NextResponse(new Uint8Array(archivo.buffer), {
      headers: { "Content-Type": archivo.mime, "Cache-Control": "private, max-age=3600" },
    });
  });
}
