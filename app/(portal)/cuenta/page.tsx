import { redirect } from "next/navigation";
import { FormularioCuenta } from "@/components/FormularioCuenta";
import { usuarioActual } from "@/lib/auth/session";

export default async function CuentaPage() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  return (
    <main className="max-w-xl">
      <h1 className="font-display text-4xl">Cuenta</h1>
      <p className="mt-2 text-graphite">Su ficha dentro de la entidad. El administrador sostiene el nombre, la cédula y el cargo.</p>
      <FormularioCuenta
        nombre={usuario.nombre}
        cedula={usuario.cedula}
        cargo={usuario.cargo}
        dependencia={usuario.dependencia}
        rol={usuario.rol}
        correo={usuario.correo}
        fotoId={usuario.fotoId}
      />
    </main>
  );
}
