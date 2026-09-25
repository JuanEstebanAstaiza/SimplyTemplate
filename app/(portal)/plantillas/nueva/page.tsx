"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <main className="max-w-3xl">
      <h1 className="font-display text-4xl">Nueva plantilla</h1>
      <p className="mt-2 text-ink-soft">Cargue un xlsx, un xlsm o un csv, o empiece con un libro en blanco.</p>
      <form
        className="mt-6 grid gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void fetch("/api/plantillas", { method: "POST", body: form })
            .then(async (respuesta) => {
              const data = (await respuesta.json()) as { id?: string; error?: string };
              if (!respuesta.ok || !data.id) {
                setError(data.error || "No se pudo crear la plantilla.");
                return;
              }
              router.push(`/plantillas/${data.id}`);
              router.refresh();
            })
            .catch(() => setError("No se pudo crear la plantilla."));
        }}
      >
        <label className="text-sm md:col-span-2">
          Nombre
          <input name="nombre" className="mt-1 w-full border border-rule bg-card px-3 py-2" />
        </label>
        <label className="text-sm md:col-span-2">
          Descripción
          <input name="descripcion" className="mt-1 w-full border border-rule bg-card px-3 py-2" />
        </label>
        <label className="text-sm">
          Vigencia desde
          <input name="vigenciaInicio" type="date" className="mt-1 w-full border border-rule bg-card px-3 py-2" />
        </label>
        <label className="text-sm">
          Vigencia hasta
          <input name="vigenciaFin" type="date" className="mt-1 w-full border border-rule bg-card px-3 py-2" />
        </label>
        <label className="text-sm md:col-span-2">
          Archivo
          <input name="archivo" type="file" accept=".xlsx,.xlsm,.csv" className="mt-1 block" />
        </label>
        <label className="text-sm">
          Separador CSV, si hace falta
          <input name="separador" className="mt-1 w-full border border-rule bg-card px-3 py-2" placeholder="," />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="exigeContrafirma" type="checkbox" /> Exigir contrafirma
        </label>
        <label className="text-sm">
          Periodo de gobierno
          <input name="periodoNombre" className="mt-1 w-full border border-rule bg-card px-3 py-2" placeholder="Alcaldía 2024-2027" />
        </label>
        <label className="text-sm">
          Mandatario
          <input name="mandatario" className="mt-1 w-full border border-rule bg-card px-3 py-2" />
        </label>
        <label className="text-sm md:col-span-2">
          Contraseña para la constancia del folio inicial
          <input name="password" type="password" className="mt-1 w-full border border-rule bg-card px-3 py-2" />
        </label>
        {error ? <p className="text-sm text-seal md:col-span-2">{error}</p> : null}
        <button className="bg-indigo px-3 py-2 text-white" type="submit">
          Crear plantilla
        </button>
      </form>
    </main>
  );
}
