import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "../db";
import type { Rol } from "../authz";

const COOKIE = "st_session";

export type Sesion = {
  uid: string;
  cedula: string;
  nombre: string;
  rol: Rol;
};

function secreto() {
  const valor = process.env.AUTH_SECRET;
  if (!valor) throw new Error("Falta AUTH_SECRET.");
  return new TextEncoder().encode(valor);
}

export async function crearToken(sesion: Sesion) {
  return new SignJWT(sesion)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sesion.uid)
    .setExpirationTime("12h")
    .sign(secreto());
}

export async function leerToken(token: string): Promise<Sesion | null> {
  try {
    const { payload } = await jwtVerify(token, secreto());
    if (!payload.uid || !payload.rol || !payload.cedula || !payload.nombre) return null;
    return {
      uid: String(payload.uid),
      cedula: String(payload.cedula),
      nombre: String(payload.nombre),
      rol: payload.rol as Rol,
    };
  } catch {
    return null;
  }
}

export function opcionesCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export async function sesionActual(): Promise<Sesion | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const sesion = await leerToken(token);
  if (!sesion) return null;
  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.uid } });
  if (!usuario || !usuario.activo) return null;
  return {
    uid: usuario.id,
    cedula: usuario.cedula,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}

export async function usuarioActual() {
  const sesion = await sesionActual();
  if (!sesion) return null;
  return prisma.usuario.findUnique({ where: { id: sesion.uid } });
}

export { COOKIE };
