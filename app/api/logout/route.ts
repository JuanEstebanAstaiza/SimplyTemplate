import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth/session";

export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return respuesta;
}
