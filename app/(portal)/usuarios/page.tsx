import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { usuarioActual } from "@/lib/auth/session";
import { etiquetaRol, puede } from "@/lib/authz";
import { prisma } from "@/lib/db";

export default async function UsuariosPage() {
  const actor = await usuarioActual();
  if (!actor || !puede(actor.rol, "usuarios")) redirect("/");
  const usuarios = await prisma.usuario.findMany({ orderBy: { nombre: "asc" } });
  return (
    <main>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Funcionarios</h1>
          <p className="mt-2 text-ink-soft">La ficha guarda la foto y la información personal, más el rol de acceso.</p>
        </div>
        <Link href="/usuarios/nuevo" className="bg-indigo px-3 py-2 text-sm text-white no-underline" style={{ color: "#ffffff" }}>
          Crear funcionario
        </Link>
      </div>
      <ul className="mt-6 divide-y divide-rule border border-rule bg-card">
        {usuarios.map((usuario) => (
          <li key={usuario.id}>
            <Link href={`/usuarios/${usuario.id}`} className="flex items-center gap-3 px-4 py-3">
              <Avatar nombre={usuario.nombre} fotoId={usuario.fotoId} />
              <span>
                <span className="block">{usuario.nombre}</span>
                <span className="text-sm text-ink-soft">
                  {usuario.cedula} · {usuario.cargo} · {usuario.dependencia} · {etiquetaRol[usuario.rol]}
                  {usuario.activo ? "" : " · inactivo"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
