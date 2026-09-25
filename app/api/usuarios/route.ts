import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { puede } from "@/lib/authz";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { guardarBinario } from "@/lib/storage";
import { fichaSchema } from "@/lib/validacion";

export async function GET() {
  return conError(async () => {
    const actor = await conUsuario();
    if (!puede(actor.rol, "usuarios")) throw new AccionError("No tiene permiso para ver los funcionarios.", 403);
    const usuarios = await prisma.usuario.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, cedula: true, correo: true, cargo: true, dependencia: true, rol: true, fotoId: true, activo: true },
    });
    return NextResponse.json({ usuarios });
  });
}

export async function POST(request: Request) {
  return conError(async () => {
    const actor = await conUsuario();
    if (!puede(actor.rol, "usuarios")) throw new AccionError("No tiene permiso para crear funcionarios.", 403);
    const form = await request.formData();
    const ficha = fichaSchema.parse({
      nombre: form.get("nombre"),
      cedula: form.get("cedula"),
      correo: form.get("correo"),
      cargo: form.get("cargo"),
      dependencia: form.get("dependencia"),
      rol: form.get("rol"),
      password: form.get("password"),
    });
    const foto = form.get("foto");
    let fotoId: string | undefined;
    if (foto instanceof File && foto.size) {
      if (foto.size > 2_000_000) throw new AccionError("La foto supera 2 MB.");
      fotoId = (await guardarBinario(foto.name, foto.type || "image/jpeg", Buffer.from(await foto.arrayBuffer()))).id;
    }
    const usuario = await prisma.usuario.create({
      data: {
        nombre: ficha.nombre,
        cedula: ficha.cedula,
        correo: ficha.correo,
        cargo: ficha.cargo,
        dependencia: ficha.dependencia,
        rol: ficha.rol,
        passwordHash: await hashPassword(ficha.password),
        fotoId,
      },
    });
    await prisma.bitacora.create({ data: { usuarioId: actor.id, accion: "crear-usuario", detalle: usuario.cedula } });
    return NextResponse.json({ id: usuario.id });
  });
}
