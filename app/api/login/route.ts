import { NextResponse } from "next/server";
import { verificarPassword } from "@/lib/auth/password";
import { COOKIE, crearToken, opcionesCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { cedulaSchema, passwordSchema } from "@/lib/validacion";

export async function POST(request: Request) {
  return conError(async () => {
    const body = (await request.json()) as { cedula?: string; password?: string };
    const cedula = cedulaSchema.parse(body.cedula || "");
    const password = passwordSchema.parse(body.password || "");
    const usuario = await prisma.usuario.findUnique({ where: { cedula } });
    if (!usuario || !usuario.activo || !(await verificarPassword(password, usuario.passwordHash))) {
      throw new AccionError("La cédula o la contraseña no coinciden.", 401);
    }
    await prisma.bitacora.create({ data: { usuarioId: usuario.id, accion: "ingreso", detalle: usuario.cedula } });
    const token = await crearToken({ uid: usuario.id, cedula: usuario.cedula, nombre: usuario.nombre, rol: usuario.rol });
    const respuesta = NextResponse.json({ ok: true });
    respuesta.cookies.set(COOKIE, token, opcionesCookie());
    return respuesta;
  });
}
