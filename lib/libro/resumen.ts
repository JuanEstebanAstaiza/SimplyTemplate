import type { HojaEstado } from "./tipos";
import { claveCelda } from "./tipos";

export type Agregacion = "suma" | "conteo" | "promedio" | "porcentaje";

export function resumir(
  hoja: HojaEstado,
  filaCampo: number,
  valorCampo: number,
  agregacion: Agregacion,
  columnaCampo?: number,
) {
  const grupos = new Map<string, { columna: string; numeros: number[]; total: number }>();
  for (let f = 1; f < hoja.filaIds.length; f++) {
    const filaId = hoja.filaIds[f];
    const etiqueta = texto(hoja, filaId, hoja.colIds[filaCampo]);
    if (!etiqueta) continue;
    const columna = columnaCampo === undefined ? "" : texto(hoja, filaId, hoja.colIds[columnaCampo]);
    const clave = `${etiqueta}||${columna}`;
    const actual = grupos.get(clave) ?? { columna, numeros: [], total: 0 };
    const crudo = texto(hoja, filaId, hoja.colIds[valorCampo]);
    const n = Number(crudo);
    if (crudo !== "" && !Number.isNaN(n)) actual.numeros.push(n);
    actual.total += 1;
    grupos.set(clave, actual);
  }
  const filas = [...grupos.entries()].map(([clave, dato]) => {
    const etiqueta = clave.split("||")[0];
    let valor = 0;
    if (agregacion === "conteo") valor = dato.total;
    else if (agregacion === "promedio") {
      valor = dato.numeros.length ? dato.numeros.reduce((a, b) => a + b, 0) / dato.numeros.length : 0;
    } else if (agregacion === "porcentaje") {
      const suma = dato.numeros.reduce((a, b) => a + b, 0);
      valor = dato.numeros.length ? suma / dato.numeros.length : 0;
    } else valor = dato.numeros.reduce((a, b) => a + b, 0);
    return { etiqueta, columna: dato.columna, valor };
  });
  return filas;
}

function texto(hoja: HojaEstado, filaId: string, colId: string | undefined) {
  if (!colId) return "";
  return hoja.celdas[claveCelda(filaId, colId)]?.valor ?? "";
}
