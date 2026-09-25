"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";

type Fila = {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string;
  fotoId: string | null;
  estado: string;
  enLinea: number;
  inactivo: number;
  ausente: number;
};

const etiqueta: Record<string, string> = {
  EN_LINEA: "En línea",
  INACTIVO: "Inactivo",
  AUSENTE: "Ausente",
  DESCONECTADO: "Desconectado",
};

export default function PresenciaPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      void fetch("/api/presencia")
        .then(async (respuesta) => {
          const data = (await respuesta.json()) as { usuarios?: Fila[]; error?: string };
          if (!vivo) return;
          if (!respuesta.ok) {
            setError(data.error || "No se pudo leer la presencia.");
            return;
          }
          setFilas(data.usuarios ?? []);
        })
        .catch(() => setError("No se pudo leer la presencia."));
    };
    cargar();
    const timer = setInterval(cargar, 10000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <main>
      <h1 className="font-display text-4xl">Presencia</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        En línea es la pestaña visible con actividad reciente. Inactivo es la pestaña abierta sin actividad. Ausente es la pestaña oculta o un silencio más largo.
      </p>
      {error ? <p className="mt-3 text-sm text-seal">{error}</p> : null}
      <ul className="mt-6 divide-y divide-rule border border-rule bg-card">
        {filas.map((fila) => (
          <li key={fila.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar nombre={fila.nombre} fotoId={fila.fotoId} />
            <div>
              <p>
                {fila.nombre} · {fila.cedula}
              </p>
              <p className="text-sm text-ink-soft">
                {etiqueta[fila.estado] || fila.estado} · hoy {fila.enLinea} min en línea, {fila.inactivo} min inactivo, {fila.ausente} min ausente
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
