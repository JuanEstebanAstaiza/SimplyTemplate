import { notFound, redirect } from "next/navigation";
import { FormularioUsuario } from "@/components/FormularioUsuario";
import { usuarioActual } from "@/lib/auth/session";
import { puede } from "@/lib/authz";
import { prisma } from "@/lib/db";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await usuarioActual();
  if (!actor || !puede(actor.rol, "usuarios")) redirect("/");
  const { id } = await params;
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();
  return (
    <main>
      <h1 className="font-display text-4xl">{usuario.nombre}</h1>
      <FormularioUsuario
        id={usuario.id}
        inicial={{
          nombre: usuario.nombre,
          cedula: usuario.cedula,
          correo: usuario.correo,
          cargo: usuario.cargo,
          dependencia: usuario.dependencia,
          rol: usuario.rol,
          activo: usuario.activo,
        }}
      />
    </main>
  );
}
