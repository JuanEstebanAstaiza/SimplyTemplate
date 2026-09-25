"use client";

import Link from "next/link";
import { useState } from "react";
import { AccionesFolio } from "./AccionesFolio";

export type NodoFolio = {
  id: string;
  numero: number;
  tipo: string;
  estado: string;
  resumen: string;
  nombreAutor: string;
  cedula: string;
  cargoAutor: string;
  cuando: string;
  hashCorto: string;
  esCabeza: boolean;
  operaciones: string[];
  soportes: string[];
};

export function HistorialGit({
  plantillaId,
  nodos,
  puedeDevolver,
  puedeFirmar,
}: {
  plantillaId: string;
  nodos: NodoFolio[];
  puedeDevolver: boolean;
  puedeFirmar: boolean;
}) {
  const [abierto, setAbierto] = useState<number | null>(null);
  return (
    <ol className="mt-6">
      {nodos.map((nodo, indice) => (
        <li key={nodo.id} className="grid grid-cols-[28px_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span
              className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-indigo"
              style={{ background: nodo.esCabeza ? "#B38B4D" : "#ffffff" }}
            />
            {indice < nodos.length - 1 ? <span className="w-px flex-1 bg-indigo" /> : null}
          </div>
          <article className="mb-4 border border-rule bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/plantillas/${plantillaId}/folios/${nodo.numero}`} className="font-display text-2xl text-ink no-underline">
                Folio {nodo.numero}
                {nodo.esCabeza ? " · cabeza" : ""}
              </Link>
              <span className="font-mono text-xs text-ink-soft">{nodo.hashCorto}</span>
            </div>
            <p className="mt-1 text-sm">{nodo.resumen}</p>
            <p className="text-sm text-graphite">
              {nodo.nombreAutor} · {nodo.cedula} · {nodo.cargoAutor}
            </p>
            <p className="font-mono text-xs text-ink-soft">
              {nodo.cuando} · {nodo.tipo} · {nodo.estado}
            </p>
            {nodo.operaciones.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {nodo.operaciones.map((linea, i) => (
                  <li key={i}>{linea}</li>
                ))}
              </ul>
            ) : null}
            {nodo.soportes.length ? <p className="mt-2 text-sm">{nodo.soportes.join(", ")}</p> : null}
            {puedeDevolver || (puedeFirmar && nodo.estado === "PENDIENTE_FIRMA") ? (
              <button type="button" className="mt-3 text-sm underline" onClick={() => setAbierto(abierto === nodo.numero ? null : nodo.numero)}>
                {abierto === nodo.numero ? "Cerrar acciones" : "Devolver o firmar"}
              </button>
            ) : null}
            {abierto === nodo.numero ? (
              <AccionesFolio
                plantillaId={plantillaId}
                numero={nodo.numero}
                folioId={nodo.id}
                pendiente={nodo.estado === "PENDIENTE_FIRMA"}
                puedeDevolver={puedeDevolver}
                puedeFirmar={puedeFirmar}
              />
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}
