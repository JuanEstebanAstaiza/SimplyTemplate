import type { EstadoLibro, HojaEstado } from "./tipos";

export function nuevoId(prefijo: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefijo}_${hex}`;
}

export function hojaVacia(nombre: string, orden: number, filas = 30, columnas = 12): HojaEstado {
  const filaIds = Array.from({ length: filas }, () => nuevoId("f"));
  const colIds = Array.from({ length: columnas }, () => nuevoId("c"));
  return {
    id: nuevoId("h"),
    nombre,
    orden,
    filaIds,
    colIds,
    anchos: colIds.map(() => 120),
    altos: filaIds.map(() => 28),
    celdas: {},
    combinadas: [],
    filaArchivo: [],
    colArchivo: [],
  };
}

export function libroVacio(): EstadoLibro {
  return { hojas: [hojaVacia("Hoja 1", 0)], zonas: [] };
}
