"use client";

import { useMemo, useRef, useState } from "react";
import { insertarFuncion, sugerirFunciones } from "@/lib/libro/sugerencias";

export function CampoFormula({ value, onChange }: { value: string; onChange: (valor: string) => void }) {
  const campo = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(value.length);
  const [indice, setIndice] = useState(0);
  const sugerencias = useMemo(() => sugerirFunciones(value, cursor), [value, cursor]);
  const visible = value.startsWith("=") && sugerencias.length > 0;
  const activo = sugerencias[Math.min(indice, sugerencias.length - 1)];

  function elegir(nombre: string) {
    const resultado = insertarFuncion(value, cursor, nombre);
    onChange(resultado.texto);
    setCursor(resultado.cursor);
    setIndice(0);
    requestAnimationFrame(() => {
      campo.current?.focus();
      campo.current?.setSelectionRange(resultado.cursor, resultado.cursor);
    });
  }

  return (
    <div className="relative">
      <input
        ref={campo}
        className="mt-1 w-full border border-rule px-2 py-1 font-mono"
        value={value}
        autoFocus
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setCursor(event.target.selectionStart ?? event.target.value.length);
          setIndice(0);
        }}
        onClick={(event) => setCursor(event.currentTarget.selectionStart ?? value.length)}
        onKeyUp={(event) => setCursor(event.currentTarget.selectionStart ?? value.length)}
        onKeyDown={(event) => {
          if (!visible) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIndice((actual) => (actual + 1) % sugerencias.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setIndice((actual) => (actual - 1 + sugerencias.length) % sugerencias.length);
          } else if ((event.key === "Enter" || event.key === "Tab") && activo) {
            event.preventDefault();
            elegir(activo.nombre);
          } else if (event.key === "Escape") {
            setCursor(-1);
          }
        }}
      />
      {visible && cursor >= 0 ? (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto border border-rule bg-card shadow-sm" role="listbox">
          {sugerencias.map((funcion, posicion) => (
            <li key={funcion.nombre}>
              <button
                type="button"
                className={`block w-full px-2 py-1 text-left ${posicion === indice ? "bg-[#e7eef8]" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  elegir(funcion.nombre);
                }}
              >
                <span className="font-mono text-sm">{funcion.firma}</span>
                <span className="mt-0.5 block text-xs text-graphite">{funcion.ayuda}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
