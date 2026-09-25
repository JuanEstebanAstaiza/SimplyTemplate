import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { COOKIE, crearToken, opcionesCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { guardarBinario } from "@/lib/storage";
import { entidadSchema, fichaSchema } from "@/lib/validacion";

export async function POST(request: Request) {
  return conError(async () => {
    if (await prisma.entidad.count()) throw new AccionError("La entidad ya está configurada.", 409);
    const form = await request.formData();
    const entidad = entidadSchema.parse({
      nombre: form.get("nombreEntidad"),
      nit: form.get("nit"),
      nivel: form.get("nivel"),
      municipio: form.get("municipio") || "",
      departamento: form.get("departamento") || "",
    });
    const ficha = fichaSchema.parse({
      nombre: form.get("nombre"),
      cedula: form.get("cedula"),
      correo: form.get("correo"),
      cargo: form.get("cargo"),
      dependencia: form.get("dependencia"),
      rol: "ADMINISTRADOR",
      password: form.get("password"),
    });
    const foto = form.get("foto");
    let fotoId: string | undefined;
    if (foto instanceof File && foto.size) {
      fotoId = (await guardarBinario(foto.name, foto.type || "image/jpeg", Buffer.from(await foto.arrayBuffer()))).id;
    }
    await prisma.entidad.create({ data: entidad });
    const usuario = await prisma.usuario.create({
      data: {
        nombre: ficha.nombre,
        cedula: ficha.cedula,
        correo: ficha.correo,
        cargo: ficha.cargo,
        dependencia: ficha.dependencia,
        rol: "ADMINISTRADOR",
        passwordHash: await hashPassword(ficha.password),
        fotoId,
      },
    });
    const token = await crearToken({
      uid: usuario.id,
      cedula: usuario.cedula,
      nombre: usuario.nombre,
      rol: usuario.rol,
    });
    const respuesta = NextResponse.json({ ok: true });
    respuesta.cookies.set(COOKIE, token, opcionesCookie());
    return respuesta;
  });
}
