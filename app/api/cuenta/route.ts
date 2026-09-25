import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { conError } from "@/lib/rutas";
import { guardarBinario } from "@/lib/storage";
import { passwordSchema } from "@/lib/validacion";
import { z } from "zod";

export async function PATCH(request: Request) {
  return conError(async () => {
    const actor = await conUsuario();
    const form = await request.formData();
    const correo = z.string().email().parse(form.get("correo"));
    const password = String(form.get("password") || "");
    if (password) passwordSchema.parse(password);
    const foto = form.get("foto");
    let fotoId: string | undefined;
    if (foto instanceof File && foto.size) {
      if (foto.size > 2_000_000) throw new AccionError("La foto supera 2 MB.");
      fotoId = (await guardarBinario(foto.name, foto.type || "image/jpeg", Buffer.from(await foto.arrayBuffer()))).id;
    }
    await prisma.usuario.update({
      where: { id: actor.id },
      data: { correo, ...(password ? { passwordHash: await hashPassword(password) } : {}), ...(fotoId ? { fotoId } : {}) },
    });
    return NextResponse.json({ ok: true });
  });
}
