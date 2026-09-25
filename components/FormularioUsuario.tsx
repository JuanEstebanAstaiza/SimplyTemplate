"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FormularioUsuario({
  id,
  inicial,
}: {
  id?: string;
  inicial?: {
    nombre: string;
    cedula: string;
    correo: string;
    cargo: string;
    dependencia: string;
    rol: string;
    activo: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <form
      className="mt-6 grid max-w-3xl gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const url = id ? `/api/usuarios/${id}` : "/api/usuarios";
        void fetch(url, { method: id ? "PATCH" : "POST", body: form })
          .then(async (respuesta) => {
            const data = (await respuesta.json()) as { error?: string };
            if (!respuesta.ok) {
              setError(data.error || "No se pudo guardar la ficha.");
              return;
            }
            router.push("/usuarios");
            router.refresh();
          })
          .catch(() => setError("No se pudo guardar la ficha."));
      }}
    >
      <Campo nombre="nombre" etiqueta="Nombre completo" valor={inicial?.nombre} />
      <Campo nombre="cedula" etiqueta="Cédula" valor={inicial?.cedula} />
      <Campo nombre="correo" etiqueta="Correo" tipo="email" valor={inicial?.correo} />
      <Campo nombre="cargo" etiqueta="Cargo" valor={inicial?.cargo} />
      <Campo nombre="dependencia" etiqueta="Dependencia" valor={inicial?.dependencia} />
      <label className="text-sm">
        Rol
        <select name="rol" defaultValue={inicial?.rol || "EDITOR"} className="mt-1 w-full border border-rule bg-card px-3 py-2">
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="EDITOR">Editor</option>
          <option value="REVISOR">Revisor</option>
          <option value="AUDITOR">Auditor</option>
        </select>
      </label>
      <Campo nombre="password" etiqueta={id ? "Contraseña nueva, si va a cambiarla" : "Contraseña inicial"} tipo="password" />
      <label className="text-sm">
        Foto
        <input name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block" />
      </label>
      {id ? (
        <label className="flex items-center gap-2 text-sm">
          <input name="activo" type="checkbox" value="true" defaultChecked={inicial?.activo !== false} />
          Acceso activo
        </label>
      ) : null}
      {error ? <p className="text-sm text-seal md:col-span-2">{error}</p> : null}
      <button className="bg-indigo px-3 py-2 text-white" type="submit">
        {id ? "Guardar ficha" : "Crear funcionario"}
      </button>
    </form>
  );
}

function Campo({
  nombre,
  etiqueta,
  tipo = "text",
  valor,
}: {
  nombre: string;
  etiqueta: string;
  tipo?: string;
  valor?: string;
}) {
  return (
    <label className="text-sm">
      {etiqueta}
      <input name={nombre} type={tipo} defaultValue={valor} className="mt-1 w-full border border-rule bg-card px-3 py-2" />
    </label>
  );
}
