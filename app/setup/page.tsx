"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Marca } from "@/components/Marca";

export default function SetupPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Marca />
      <p className="mt-6 font-display text-3xl">Del Excel a la plantilla oficial.</p>
      <p className="mt-2 max-w-xl text-graphite">
        Configure la entidad y el primer administrador. Esta instalación atiende una sola entidad.
      </p>
      <form
        className="mt-8 grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void fetch("/api/setup", { method: "POST", body: form })
            .then(async (respuesta) => {
              const data = (await respuesta.json()) as { error?: string };
              if (!respuesta.ok) {
                setError(data.error || "No se pudo configurar.");
                return;
              }
              router.push("/");
              router.refresh();
            })
            .catch(() => setError("No se pudo configurar."));
        }}
      >
        <Campo nombre="nombreEntidad" etiqueta="Nombre de la entidad" />
        <Campo nombre="nit" etiqueta="NIT" />
        <label className="text-sm">
          Nivel
          <select name="nivel" className="mt-1 w-full border border-rule bg-card px-3 py-2">
            <option value="ALCALDIA">Alcaldía</option>
            <option value="GOBERNACION">Gobernación</option>
            <option value="PRESIDENCIA">Presidencia</option>
            <option value="OTRA">Otra</option>
          </select>
        </label>
        <Campo nombre="municipio" etiqueta="Municipio" />
        <Campo nombre="departamento" etiqueta="Departamento" />
        <Campo nombre="nombre" etiqueta="Nombre del administrador" />
        <Campo nombre="cedula" etiqueta="Cédula" />
        <Campo nombre="correo" etiqueta="Correo" tipo="email" />
        <Campo nombre="cargo" etiqueta="Cargo" />
        <Campo nombre="dependencia" etiqueta="Dependencia" />
        <Campo nombre="password" etiqueta="Contraseña" tipo="password" />
        <label className="text-sm">
          Foto
          <input name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block" />
        </label>
        {error ? <p className="text-sm text-seal md:col-span-2">{error}</p> : null}
        <button className="bg-indigo px-3 py-2 text-white md:col-span-2" type="submit">
          Dejar la entidad lista
        </button>
      </form>
    </main>
  );
}

function Campo({ nombre, etiqueta, tipo = "text" }: { nombre: string; etiqueta: string; tipo?: string }) {
  return (
    <label className="text-sm">
      {etiqueta}
      <input name={nombre} type={tipo} className="mt-1 w-full border border-rule bg-card px-3 py-2" />
    </label>
  );
}
