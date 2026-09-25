import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { conError } from "@/lib/rutas";

export async function GET(request: Request) {
  return conError(async () => {
    const actor = await conUsuario();
    const desde = new URL(request.url).searchParams.get("desde");
    const destinos = await prisma.avisoDestino.findMany({
      where: { usuarioId: actor.id },
      orderBy: { aviso: { creadoEn: "desc" } },
      take: 30,
      include: { aviso: true },
    });
    const actores = await prisma.usuario.findMany({
      where: { id: { in: [...new Set(destinos.map((item) => item.aviso.actorId))] } },
      select: { id: true, nombre: true, fotoId: true },
    });
    const porId = new Map(actores.map((usuario) => [usuario.id, usuario]));
    const vista = destinos.map((item) => ({
      id: item.aviso.id,
      texto: item.aviso.texto,
      creadoEn: item.aviso.creadoEn.toISOString(),
      folioId: item.aviso.folioId,
      plantillaId: item.aviso.plantillaId,
      leido: Boolean(item.leidoEn),
      actor: porId.get(item.aviso.actorId) ?? { nombre: "Funcionario", fotoId: null },
    }));
    const nuevos = desde ? vista.filter((aviso) => aviso.creadoEn > desde).reverse() : [];
    return NextResponse.json(
      {
        recientes: vista,
        nuevos,
        noLeidos: destinos.filter((item) => !item.leidoEn).length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
