import { NextResponse } from "next/server";
import { EstadoPresencia } from "@prisma/client";
import { puede } from "@/lib/authz";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { minutos, sumarTramos } from "@/lib/presencia/tramos";

const estados = new Set(["EN_LINEA", "INACTIVO", "AUSENTE", "DESCONECTADO"]);

export async function POST(request: Request) {
  return conError(async () => {
    const actor = await conUsuario();
    const body = (await request.json()) as { estado?: string; plantillaId?: string };
    if (!body.estado || !estados.has(body.estado)) throw new AccionError("El estado de presencia no es válido.");
    const estado = body.estado as EstadoPresencia;
    const plantillaId = body.plantillaId || "";
    const ahora = new Date();
    const actual = await prisma.presenciaActual.findUnique({ where: { usuarioId: actor.id } });
    if (!actual || actual.estado !== estado || actual.plantillaId !== plantillaId) {
      await prisma.presenciaTramo.updateMany({ where: { usuarioId: actor.id, fin: null }, data: { fin: ahora } });
      await prisma.presenciaTramo.create({ data: { usuarioId: actor.id, estado, plantillaId, inicio: ahora } });
      await prisma.presenciaActual.upsert({
        where: { usuarioId: actor.id },
        create: { usuarioId: actor.id, estado, plantillaId, ultimoLatido: ahora, desdeEn: ahora },
        update: { estado, plantillaId, ultimoLatido: ahora, desdeEn: ahora },
      });
    } else {
      await prisma.presenciaActual.update({ where: { usuarioId: actor.id }, data: { ultimoLatido: ahora } });
    }
    const limite = new Date(ahora.getTime() - 40_000);
    const frios = await prisma.presenciaActual.findMany({
      where: { ultimoLatido: { lt: limite }, NOT: { estado: "DESCONECTADO" } },
    });
    for (const frio of frios) {
      await prisma.presenciaTramo.updateMany({ where: { usuarioId: frio.usuarioId, fin: null }, data: { fin: ahora } });
      await prisma.presenciaTramo.create({
        data: { usuarioId: frio.usuarioId, estado: "DESCONECTADO", inicio: ahora },
      });
      await prisma.presenciaActual.update({
        where: { usuarioId: frio.usuarioId },
        data: { estado: "DESCONECTADO", plantillaId: "", ultimoLatido: ahora, desdeEn: ahora },
      });
    }
    return NextResponse.json({ ok: true });
  });
}

export async function GET() {
  return conError(async () => {
    const actor = await conUsuario();
    if (!puede(actor.rol, "presencia") && actor.rol !== "ADMINISTRADOR") {
      throw new AccionError("No tiene permiso para ver la presencia.", 403);
    }
    const ahora = new Date();
    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);
    const usuarios = await prisma.usuario.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, cedula: true, cargo: true, fotoId: true },
    });
    const actuales = await prisma.presenciaActual.findMany();
    const tramos = await prisma.presenciaTramo.findMany({ where: { inicio: { gte: inicio } } });
    const porUsuario = usuarios.map((usuario) => {
      const actual = actuales.find((item) => item.usuarioId === usuario.id);
      const propios = tramos.filter((item) => item.usuarioId === usuario.id);
      const totales = sumarTramos(propios, ahora);
      return {
        ...usuario,
        estado: actual?.estado ?? "DESCONECTADO",
        enLinea: minutos(totales.EN_LINEA),
        inactivo: minutos(totales.INACTIVO),
        ausente: minutos(totales.AUSENTE),
      };
    });
    return NextResponse.json({ usuarios: porUsuario });
  });
}
