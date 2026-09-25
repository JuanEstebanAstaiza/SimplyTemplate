import { NextResponse } from "next/server";
import { ACCIONES_ATAJO, duplicados, mapaEfectivo, type IdAtajo } from "@/lib/atajos";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";

export async function GET() {
  return conError(async () => {
    const usuario = await conUsuario();
    return NextResponse.json({ atajos: mapaEfectivo(usuario.atajos) });
  });
}

export async function PUT(request: Request) {
  return conError(async () => {
    const usuario = await conUsuario();
    const body = (await request.json()) as { atajos?: Record<string, string> };
    const mapa = mapaEfectivo(body.atajos);
    const repetidos = duplicados(mapa);
    if (repetidos.length) throw new AccionError("Hay dos funciones con la misma tecla. Cambie una de ellas.");
    const guardado = Object.fromEntries(ACCIONES_ATAJO.map((accion) => [accion.id, mapa[accion.id as IdAtajo]]));
    await prisma.usuario.update({ where: { id: usuario.id }, data: { atajos: guardado } });
    return NextResponse.json({ atajos: mapa });
  });
}
