import { NextResponse, type NextRequest } from "next/server";

const publicas = [/^\/login$/, /^\/setup$/, /^\/api\/login$/, /^\/api\/setup$/, /^\/api\/salud$/];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicas.some((regla) => regla.test(pathname))) return NextResponse.next();
  const sesion = request.cookies.get("st_session");
  if (sesion) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Debe iniciar sesión." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
