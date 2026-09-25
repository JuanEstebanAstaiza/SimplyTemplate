"use client";

import { useState } from "react";
import { etiquetaRol, type Rol } from "@/lib/authz";

export function FormularioCuenta({
  nombre,
  cedula,
  cargo,
  dependencia,
  rol,
  correo,
  fotoId,
}: {
  nombre: string;
  cedula: string;
  cargo: string;
  dependencia: string;
  rol: Rol;
  correo: string;
  fotoId?: string | null;
}) {
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [vista, setVista] = useState<string | null>(null);
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  return (
    <div className="mt-8 border border-rule border-t-[3px] border-t-brass bg-card p-6">
      <div className="flex items-center gap-5">
        {vista || fotoId ? (
          <img
            src={vista || `/api/fotos/${fotoId}`}
            alt=""
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-ink text-2xl text-paper">
            {iniciales || "?"}
          </span>
        )}
        <div>
          <h2 className="font-display text-3xl">{nombre}</h2>
          <p className="mt-1 font-mono text-sm text-graphite">{cedula}</p>
          <p className="text-sm">
            {cargo} · {dependencia}
          </p>
          <p className="text-sm text-ink-soft">{etiquetaRol[rol]}</p>
        </div>
      </div>
      <form
        className="mt-6 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void fetch("/api/cuenta", { method: "PATCH", body: form })
            .then(async (respuesta) => {
              const data = (await respuesta.json()) as { error?: string };
              if (!respuesta.ok) {
                setError(data.error || "No se pudo guardar.");
                setMensaje("");
                return;
              }
              setError("");
              setMensaje("La cuenta quedó actualizada.");
            })
            .catch(() => setError("No se pudo guardar."));
        }}
      >
        <label className="block text-sm">
          Correo
          <input name="correo" type="email" required defaultValue={correo} className="mt-1 w-full border border-rule bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Contraseña nueva
          <input name="password" type="password" className="mt-1 w-full border border-rule bg-paper px-3 py-2" />
        </label>
        <label className="block text-sm">
          Foto
          <input
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block"
            onChange={(event) => {
              const archivo = event.target.files?.[0];
              if (!archivo) return;
              const lector = new FileReader();
              lector.onload = () => setVista(typeof lector.result === "string" ? lector.result : null);
              lector.readAsDataURL(archivo);
            }}
          />
        </label>
        {error ? <p className="text-sm text-seal">{error}</p> : null}
        {mensaje ? <p className="text-sm">{mensaje}</p> : null}
        <button className="bg-indigo px-3 py-2 text-white" type="submit">
          Guardar cuenta
        </button>
      </form>
    </div>
  );
}
