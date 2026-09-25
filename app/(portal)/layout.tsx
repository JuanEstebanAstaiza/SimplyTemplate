import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Marca } from "@/components/Marca";
import { Navegacion } from "@/components/Navegacion";
import { Salir } from "@/components/Salir";
import { SesionViva } from "@/components/SesionViva";
import { usuarioActual } from "@/lib/auth/session";
import { etiquetaRol, puede } from "@/lib/authz";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  const entidad = await prisma.entidad.findFirst();
  if (!entidad) redirect("/setup");
  const enlaces = [
    ["/", "Inicio"],
    ["/plantillas/nueva", "Nueva plantilla"],
    ["/auditoria", "Auditoría"],
    ...(puede(usuario.rol, "presencia") ? [["/presencia", "Presencia"]] : []),
    ...(puede(usuario.rol, "usuarios") ? [["/usuarios", "Funcionarios"]] : []),
    ["/cuenta", "Cuenta"],
  ];
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
      <nav className="flex flex-wrap items-center gap-4 bg-ink px-5 py-4 text-paper lg:min-h-screen lg:flex-col lg:items-stretch lg:gap-6">
        <div>
          <Marca invert />
          <p className="mt-3 font-mono text-[11px] tracking-[0.08em] text-paper/70 uppercase">{entidad.nombre}</p>
        </div>
        <Navegacion enlaces={enlaces} />
        <div className="mt-auto flex items-center gap-3">
          <Avatar nombre={usuario.nombre} fotoId={usuario.fotoId} />
          <div className="text-sm">
            <p>{usuario.nombre}</p>
            <p className="text-paper/70">{etiquetaRol[usuario.rol]}</p>
            <Salir />
          </div>
        </div>
      </nav>
      <div className="min-w-0 px-4 py-6 lg:px-8">
        <SesionViva minutosEnLinea={entidad.minutosEnLinea} minutosAusente={entidad.minutosAusente} />
        {children}
      </div>
    </div>
  );
}
