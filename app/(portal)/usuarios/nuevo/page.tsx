import { redirect } from "next/navigation";
import { FormularioUsuario } from "@/components/FormularioUsuario";
import { usuarioActual } from "@/lib/auth/session";
import { puede } from "@/lib/authz";

export default async function NuevoUsuarioPage() {
  const actor = await usuarioActual();
  if (!actor || !puede(actor.rol, "usuarios")) redirect("/");
  return (
    <main>
      <h1 className="font-display text-4xl">Crear funcionario</h1>
      <FormularioUsuario />
    </main>
  );
}
