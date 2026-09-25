import { redirect } from "next/navigation";
import { ConfiguracionAtajos } from "@/components/ConfiguracionAtajos";
import { mapaEfectivo } from "@/lib/atajos";
import { usuarioActual } from "@/lib/auth/session";

export default async function ConfiguracionPage() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  return (
    <main>
      <h1 className="font-display text-4xl">Configuración rápida</h1>
      <p className="mt-2 max-w-2xl text-graphite">
        Estas teclas actúan sobre la selección de la hoja. Pulse el recuadro de una función y luego la combinación que quiera usar. Las predeterminadas ya vienen listas para trabajar.
      </p>
      <ConfiguracionAtajos inicial={mapaEfectivo(usuario.atajos)} />
    </main>
  );
}
