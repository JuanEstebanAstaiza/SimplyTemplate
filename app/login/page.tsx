"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Marca } from "@/components/Marca";

export default function LoginPage() {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Marca />
      <p className="mt-6 max-w-sm font-display text-2xl leading-snug">La estructura detrás de la gestión pública.</p>
      <p className="mt-2 text-graphite">Entre con su cédula para abrir el libro de la entidad.</p>
      <form
        className="mt-8 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cedula, password }),
          })
            .then(async (respuesta) => {
              const data = (await respuesta.json()) as { error?: string };
              if (!respuesta.ok) {
                setError(data.error || "No se pudo entrar.");
                return;
              }
              router.push("/");
              router.refresh();
            })
            .catch(() => setError("No se pudo entrar."));
        }}
      >
        <label className="block text-sm">
          Cédula
          <input className="mt-1 w-full border border-rule bg-card px-3 py-2" value={cedula} onChange={(e) => setCedula(e.target.value)} />
        </label>
        <label className="block text-sm">
          Contraseña
          <input className="mt-1 w-full border border-rule bg-card px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <p className="text-sm text-seal">{error}</p> : null}
        <button className="w-full bg-indigo px-3 py-2 text-white" type="submit">
          Entrar
        </button>
      </form>
      <a href="/setup" className="mt-6 text-sm underline">
        Primera instalación de la entidad
      </a>
    </main>
  );
}
