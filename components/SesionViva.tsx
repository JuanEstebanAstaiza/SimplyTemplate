"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { clasificarPresencia } from "@/lib/presencia/tramos";

type Aviso = {
  id: string;
  texto: string;
  creadoEn: string;
  folioId: string | null;
  plantillaId: string | null;
  leido?: boolean;
  actor: { nombre: string; fotoId: string | null };
};

export function SesionViva({
  minutosEnLinea,
  minutosAusente,
}: {
  minutosEnLinea: number;
  minutosAusente: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<Aviso[]>([]);
  const [panel, setPanel] = useState(false);
  const [lista, setLista] = useState<Aviso[]>([]);
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    let activo = true;
    let ultimo = new Date().toISOString();
    const cargar = async (anunciar: boolean) => {
      try {
        const respuesta = await fetch(`/api/avisos?desde=${encodeURIComponent(ultimo)}`, { cache: "no-store" });
        if (!respuesta.ok || !activo) return;
        const data = (await respuesta.json()) as { recientes?: Aviso[]; nuevos?: Aviso[]; noLeidos?: number };
        if (!activo) return;
        setLista(data.recientes ?? []);
        setNoLeidos(data.noLeidos ?? 0);
        const nuevos = data.nuevos ?? [];
        if (anunciar && nuevos.length) {
          setToasts((prev) => [...prev, ...nuevos].slice(-4));
          ultimo = nuevos[nuevos.length - 1].creadoEn;
        }
      } catch {
        // El servidor puede estar reiniciando. El siguiente intento vuelve a consultar.
      }
    };
    void cargar(false);
    const timer = setInterval(() => void cargar(true), 5000);
    return () => {
      activo = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let ultimoMovimiento = Date.now();
    const mover = () => {
      ultimoMovimiento = Date.now();
    };
    window.addEventListener("pointerdown", mover);
    window.addEventListener("keydown", mover);
    const latir = () => {
      const segundos = (Date.now() - ultimoMovimiento) / 1000;
      const visible = document.visibilityState === "visible";
      const estado = clasificarPresencia({
        visible,
        segundosSinActividad: segundos,
        minutosEnLinea,
        minutosAusente,
      });
      const coincidencia = pathname.match(/^\/plantillas\/([^/]+)/);
      const plantillaId = coincidencia && coincidencia[1] !== "nueva" ? coincidencia[1] : "";
      void fetch("/api/presencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, plantillaId }),
      }).catch(() => undefined);
    };
    latir();
    const timer = setInterval(latir, 25000);
    document.addEventListener("visibilitychange", latir);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", mover);
      window.removeEventListener("keydown", mover);
      document.removeEventListener("visibilitychange", latir);
    };
  }, [pathname, minutosEnLinea, minutosAusente]);

  useEffect(() => {
    if (!panel) return;
    const ids = lista.filter((aviso) => !aviso.leido).map((aviso) => aviso.id);
    if (ids.length) marcarLeidos(ids);
  }, [panel, lista]);

  function marcarLeidos(ids: string[]) {
    if (!ids.length) return;
    setToasts((prev) => prev.filter((aviso) => !ids.includes(aviso.id)));
    setLista((prev) => prev.map((aviso) => (ids.includes(aviso.id) ? { ...aviso, leido: true } : aviso)));
    setNoLeidos((valor) => Math.max(0, valor - ids.length));
    void fetch("/api/avisos/leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      cache: "no-store",
    }).catch(() => undefined);
  }

  function cerrar(id: string) {
    marcarLeidos([id]);
  }

  function abrir(aviso: Aviso) {
    cerrar(aviso.id);
    setPanel(false);
    if (aviso.plantillaId && aviso.folioId) router.push(`/plantillas/${aviso.plantillaId}/historial`);
  }

  return (
    <>
      <button
        type="button"
        className="fixed right-5 top-4 z-30 border border-mist bg-card px-3 py-1 text-sm text-ink"
        onClick={() => setPanel((valor) => !valor)}
      >
        Avisos{noLeidos ? ` (${noLeidos})` : ""}
      </button>
      {panel ? (
        <div className="fixed right-5 top-14 z-30 w-80 border border-rule bg-card p-3 shadow-sm">
          {lista.length === 0 ? <p className="text-sm text-ink-soft">No hay avisos recientes.</p> : null}
          <ul className="space-y-2">
            {lista.map((aviso) => (
              <li key={aviso.id}>
                <button
                  type="button"
                  className={`flex w-full gap-2 text-left text-sm ${aviso.leido ? "text-ink-soft" : "text-ink"}`}
                  onClick={() => abrir(aviso)}
                >
                  <Avatar nombre={aviso.actor.nombre} fotoId={aviso.actor.fotoId} size={28} />
                  <span>{aviso.texto}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="fixed bottom-4 right-4 z-40 flex w-80 flex-col gap-2">
        {toasts.map((aviso) => (
          <button
            key={aviso.id}
            type="button"
            onClick={() => abrir(aviso)}
            className="toast-in flex gap-3 border border-rule bg-card p-3 text-left shadow-sm"
          >
            <Avatar nombre={aviso.actor.nombre} fotoId={aviso.actor.fotoId} size={36} />
            <span className="text-sm leading-5">{aviso.texto}</span>
          </button>
        ))}
      </div>
    </>
  );
}
