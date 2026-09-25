"use client";

import { useState } from "react";
import { ACCIONES_ATAJO, ATAJOS_DEFECTO, duplicados, eventoAAtajo, type IdAtajo } from "@/lib/atajos";

export function ConfiguracionAtajos({ inicial }: { inicial: Record<IdAtajo, string> }) {
  const [mapa, setMapa] = useState(inicial);
  const [escuchando, setEscuchando] = useState<IdAtajo | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const repetidos = new Set(duplicados(mapa));

  async function guardar(siguiente = mapa) {
    setError("");
    setMensaje("");
    const respuesta = await fetch("/api/atajos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atajos: siguiente }),
    });
    const data = (await respuesta.json()) as { error?: string };
    if (!respuesta.ok) {
      setError(data.error || "No se pudieron guardar los atajos.");
      return;
    }
    setMensaje("Las teclas quedaron guardadas para su usuario.");
  }

  return (
    <div className="mt-6 max-w-3xl border border-rule border-t-[3px] border-t-brass bg-card">
      {ACCIONES_ATAJO.map((accion) => (
        <div key={accion.id} className="grid grid-cols-[1fr_180px] items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
          <div>
            <p>{accion.nombre}</p>
            <p className="text-xs text-ink-soft">{accion.grupo}</p>
          </div>
          <button
            type="button"
            className={`border px-2 py-1 font-mono text-sm ${repetidos.has(accion.id) ? "border-seal text-seal" : "border-rule bg-paper"}`}
            onClick={() => setEscuchando(accion.id)}
            onKeyDown={(event) => {
              if (escuchando !== accion.id) return;
              event.preventDefault();
              event.stopPropagation();
              const combo = eventoAAtajo(event);
              if (!combo) return;
              setMapa((actual) => ({ ...actual, [accion.id]: combo }));
              setEscuchando(null);
            }}
          >
            {escuchando === accion.id ? "Pulse la combinación" : mapa[accion.id]}
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 p-4">
        <button type="button" className="bg-indigo px-3 py-2 text-white" onClick={() => void guardar()}>
          Guardar teclas
        </button>
        <button
          type="button"
          className="border border-rule px-3 py-2"
          onClick={() => {
            setMapa(ATAJOS_DEFECTO);
            void guardar(ATAJOS_DEFECTO);
          }}
        >
          Volver a las predeterminadas
        </button>
      </div>
      {error ? <p className="px-4 pb-4 text-sm text-seal">{error}</p> : null}
      {mensaje ? <p className="px-4 pb-4 text-sm">{mensaje}</p> : null}
    </div>
  );
}
