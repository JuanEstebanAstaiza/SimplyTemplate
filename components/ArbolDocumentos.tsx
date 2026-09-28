"use client";

import { useState } from "react";
import type { ColumnaDocumentos, DocumentoHoja } from "@/lib/documentos/arbol";
import { sePuedeVerEnPagina } from "@/lib/documentos/arbol";

export function ArbolDocumentos({ columnas }: { columnas: ColumnaDocumentos[] }) {
  const primero = columnas[0]?.filas[0]?.documentos[0] ?? null;
  const [activo, setActivo] = useState<DocumentoHoja | null>(primero);
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="border border-rule bg-card p-3">
        {columnas.length === 0 ? <p className="text-sm text-graphite">Esta plantilla todavía no tiene soportes visibles para su usuario.</p> : null}
        <ul className="space-y-3">
          {columnas.map((columna) => (
            <li key={columna.colId}>
              <p className="font-display text-lg">{columna.titulo}</p>
              <ul className="mt-1 border-l border-brass pl-3">
                {columna.filas.map((fila) => (
                  <li key={fila.filaId} className="mt-2">
                    <p className="text-sm text-graphite">{fila.etiqueta}</p>
                    <ul>
                      {fila.documentos.map((documento) => (
                        <li key={documento.id}>
                          <button
                            type="button"
                            className={`mt-1 block w-full px-2 py-1 text-left text-sm ${activo?.id === documento.id ? "bg-[#e7eef8]" : ""}`}
                            onClick={() => setActivo(documento)}
                          >
                            {documento.nombre}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      <article className="min-h-[70vh] border border-rule bg-card p-4">
        {!activo ? <p className="text-sm text-graphite">Elija un documento del árbol.</p> : null}
        {activo ? (
          <>
            <h2 className="font-display text-2xl">{activo.nombre}</h2>
            <p className="mt-1 text-sm text-graphite">
              {activo.autor} · {activo.cuando} · {activo.folio}
            </p>
            <p className="break-all font-mono text-[11px] text-ink-soft">{activo.sha256}</p>
            <a className="mt-2 inline-block text-sm underline" href={`/api/soportes/${activo.id}`}>
              Descargar
            </a>
            {sePuedeVerEnPagina(activo.mime) ? (
              activo.mime.startsWith("image/") ? (
                <img src={`/api/soportes/${activo.id}?ver=1`} alt="" className="mt-4 max-h-[65vh] max-w-full border border-rule" />
              ) : (
                <iframe title={activo.nombre} src={`/api/soportes/${activo.id}?ver=1`} className="mt-4 h-[65vh] w-full border border-rule" />
              )
            ) : (
              <p className="mt-4 text-sm">Este formato se abre con Descargar.</p>
            )}
          </>
        ) : null}
      </article>
    </div>
  );
}
