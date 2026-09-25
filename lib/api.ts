import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { usuarioActual } from "./auth/session";
import { AccionError } from "./errores";

export async function conUsuario() {
  const usuario = await usuarioActual();
  if (!usuario) throw new AccionError("Debe iniciar sesión.", 401);
  return usuario;
}

export function responderError(error: unknown) {
  if (error instanceof AccionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Revise los datos." }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "No se pudo completar la acción." }, { status: 500 });
}
