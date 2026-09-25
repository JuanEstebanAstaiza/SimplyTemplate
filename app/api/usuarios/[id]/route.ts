import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { puede } from "@/lib/authz";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { guardarBinario } from "@/lib/storage";
import { cedulaSchema, fichaSchema } from "@/lib/validacion";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return conError(async () => {
    const actor = await conUsuario();
    if (!puede(actor.rol, "usuarios")) throw new AccionError("No tiene permiso para editar funcionarios.", 403);
    const { id } = await context.params;
    const form = await request.formData();
    const password = String(form.get("password") || "");
    const ficha = fichaSchema.parse({
      nombre: form.get("nombre"),
      cedula: form.get("cedula"),
      correo: form.get("correo"),
      cargo: form.get("cargo"),
      dependencia: form.get("dependencia"),
      rol: form.get("rol"),
      password: password || "temporal-1",
    });
    cedulaSchema.parse(ficha.cedula);
    const foto = form.get("foto");
    let fotoId: string | undefined;
    if (foto instanceof File && foto.size) {
      if (foto.size > 2_000_000) throw new AccionError("La foto supera 2 MB.");
      fotoId = (await guardarBinario(foto.name, foto.type || "image/jpeg", Buffer.from(await foto.arrayBuffer()))).id;
    }
    await prisma.usuario.update({
      where: { id },
      data: {
        nombre: ficha.nombre,
        cedula: ficha.cedula,
        correo: ficha.correo,
        cargo: ficha.cargo,
        dependencia: ficha.dependencia,
        rol: ficha.rol,
        activo: form.get("activo") === "true",
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        ...(fotoId ? { fotoId } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  });
}
