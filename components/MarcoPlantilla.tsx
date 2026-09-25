"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarcoPlantilla({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [vigenciaFin, setVigenciaFin] = useState("");

  async function enviar(accion: "activar" | "cerrar" | "prorrogar") {
    const respuesta = await fetch(`/api/plantillas/${id}/marco`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, password, justificacion, vigenciaFin }),
    });
    const data = (await respuesta.json()) as { error?: string };
    if (!respuesta.ok) {
      setError(data.error || "No se pudo actualizar la plantilla.");
      return;
    }
    setPassword("");
    setJustificacion("");
    router.refresh();
  }

  return (
    <form
      className="mt-4 grid gap-2 border border-rule bg-card p-3 md:grid-cols-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <input className="border border-rule px-2 py-1 md:col-span-2" placeholder="Por qué cambia el marco de la plantilla" value={justificacion} onChange={(e) => setJustificacion(e.target.value)} />
      <input className="border border-rule px-2 py-1" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input className="border border-rule px-2 py-1" type="date" value={vigenciaFin} onChange={(e) => setVigenciaFin(e.target.value)} />
      <div className="flex flex-wrap gap-2 md:col-span-4">
        {estado !== "ACTIVA" && estado !== "CERRADA" ? (
          <button type="button" className="bg-indigo px-3 py-2 text-sm text-white" onClick={() => void enviar("activar")}>
            Activar
          </button>
        ) : null}
        {estado !== "CERRADA" ? (
          <button type="button" className="border border-rule px-3 py-2 text-sm" onClick={() => void enviar("cerrar")}>
            Cerrar
          </button>
        ) : null}
        <button type="button" className="border border-tab px-3 py-2 text-sm text-tab" onClick={() => void enviar("prorrogar")}>
          Prorrogar vigencia
        </button>
      </div>
      {error ? <p className="text-sm text-seal md:col-span-4">{error}</p> : null}
    </form>
  );
}
