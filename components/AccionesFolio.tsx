"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccionesFolio({
  plantillaId,
  numero,
  folioId,
  pendiente,
  puedeDevolver,
  puedeFirmar,
}: {
  plantillaId: string;
  numero: number;
  folioId: string;
  pendiente: boolean;
  puedeDevolver: boolean;
  puedeFirmar: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [error, setError] = useState("");

  async function enviar(url: string, body: unknown) {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await respuesta.json()) as { error?: string };
    if (!respuesta.ok) {
      setError(data.error || "No se pudo completar la acción.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2">
      {puedeDevolver ? (
        <form
          className="grid gap-2 border border-rule bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void enviar(`/api/plantillas/${plantillaId}/devolver`, { numero, password, justificacion });
          }}
        >
          <p className="text-sm">Devolver la hoja a este folio. Queda un folio nuevo y este sigue consultable.</p>
          <textarea className="border border-rule p-2" rows={3} value={justificacion} onChange={(e) => setJustificacion(e.target.value)} placeholder="Por qué se devuelve" />
          <input className="border border-rule px-2 py-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
          <button className="bg-indigo px-3 py-2 text-white" type="submit">
            Devolver a este folio
          </button>
        </form>
      ) : null}
      {pendiente && puedeFirmar ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="bg-indigo px-3 py-2 text-white"
            onClick={() => void enviar(`/api/plantillas/${plantillaId}/firma`, { folioId, password, rechazo: false })}
          >
            Contrafirma
          </button>
          <button
            type="button"
            className="border border-seal px-3 py-2 text-seal"
            onClick={() => void enviar(`/api/plantillas/${plantillaId}/firma`, { folioId, password, rechazo: true, justificacion })}
          >
            Rechazar
          </button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-seal">{error}</p> : null}
    </div>
  );
}
