import { indiceAColumna } from "./refs";
import { claveCelda, type EstadoLibro } from "./tipos";

export type CambioRama = {
  etiqueta: string;
  antes: string;
  despues: string;
};

export type Rama = {
  titulo: string;
  cambios: CambioRama[];
};

export function ramasDeCambio(antes: EstadoLibro | null, despues: EstadoLibro): Rama[] {
  const ramas = new Map<string, Rama>();
  for (const hoja of despues.hojas) {
    const previa = antes?.hojas.find((item) => item.id === hoja.id);
    hoja.colIds.forEach((colId, c) => {
      const titulo =
        hoja.celdas[claveCelda(hoja.filaIds[0] || "", colId)]?.valor?.trim() || `Columna ${indiceAColumna(c)}`;
      hoja.filaIds.forEach((filaId, f) => {
        const nuevo = hoja.celdas[claveCelda(filaId, colId)];
        const viejo = previa?.celdas[claveCelda(filaId, colId)];
        const va = viejo?.formula || viejo?.valor || "";
        const vb = nuevo?.formula || nuevo?.valor || "";
        if (va === vb) return;
        const nombreFila =
          c > 0 ? hoja.celdas[claveCelda(filaId, hoja.colIds[0])]?.valor?.trim() : "";
        const etiqueta = f === 0 ? "Título" : nombreFila || `Fila ${f + 1}`;
        const clave = `${hoja.id}:${colId}`;
        const rama = ramas.get(clave) ?? { titulo, cambios: [] };
        rama.titulo = titulo;
        rama.cambios.push({ etiqueta, antes: va, despues: vb });
        ramas.set(clave, rama);
      });
    });
  }
  return [...ramas.values()];
}
