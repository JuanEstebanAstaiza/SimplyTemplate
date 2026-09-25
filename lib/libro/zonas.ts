import type { EstadoLibro, HojaEstado, Zona } from "./tipos";

export function idsEntre(ids: string[], inicio: string, fin: string): Set<string> {
  const a = ids.indexOf(inicio);
  const b = ids.indexOf(fin);
  if (a < 0 || b < 0) return new Set();
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return new Set(ids.slice(lo, hi + 1));
}

export function zonasDeCelda(estado: EstadoLibro, hoja: HojaEstado, filaId: string, colId: string): Zona[] {
  return estado.zonas.filter((zona) => {
    if (zona.hojaId !== hoja.id) return false;
    const filas = idsEntre(hoja.filaIds, zona.filaIdInicio, zona.filaIdFin);
    const cols = idsEntre(hoja.colIds, zona.colIdInicio, zona.colIdFin);
    return filas.has(filaId) && cols.has(colId);
  });
}

export function minSoportes(estado: EstadoLibro, hoja: HojaEstado, filaId: string, colId: string) {
  const zonas = zonasDeCelda(estado, hoja, filaId, colId);
  if (!zonas.length) return 0;
  return Math.max(...zonas.map((z) => z.minSoportes));
}
