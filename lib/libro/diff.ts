import { indiceAColumna } from "./refs";
import { claveCelda, type EstadoLibro } from "./tipos";

export type Diferencia = {
  hoja: string;
  donde: string;
  antes: string;
  despues: string;
};

export function diferencias(antes: EstadoLibro, despues: EstadoLibro): Diferencia[] {
  const salida: Diferencia[] = [];
  const hojas = new Set([...antes.hojas.map((h) => h.id), ...despues.hojas.map((h) => h.id)]);
  for (const id of hojas) {
    const a = antes.hojas.find((h) => h.id === id);
    const b = despues.hojas.find((h) => h.id === id);
    if (!a && b) {
      salida.push({ hoja: b.nombre, donde: "Hoja", antes: "", despues: "Creada" });
      continue;
    }
    if (a && !b) {
      salida.push({ hoja: a.nombre, donde: "Hoja", antes: "Existía", despues: "Ya no está" });
      continue;
    }
    if (!a || !b) continue;
    if (a.filaIds.length !== b.filaIds.length) {
      salida.push({
        hoja: b.nombre,
        donde: "Filas",
        antes: String(a.filaIds.length),
        despues: String(b.filaIds.length),
      });
    }
    if (a.colIds.length !== b.colIds.length) {
      salida.push({
        hoja: b.nombre,
        donde: "Columnas",
        antes: String(a.colIds.length),
        despues: String(b.colIds.length),
      });
    }
    const claves = new Set([...Object.keys(a.celdas), ...Object.keys(b.celdas)]);
    for (const clave of claves) {
      const ca = a.celdas[clave];
      const cb = b.celdas[clave];
      const va = ca?.formula || ca?.valor || "";
      const vb = cb?.formula || cb?.valor || "";
      if (va === vb && (ca?.formato || "") === (cb?.formato || "") && Boolean(ca?.negrita) === Boolean(cb?.negrita)) {
        continue;
      }
      const [filaId, colId] = clave.split(":");
      const fila = b.filaIds.indexOf(filaId);
      const col = b.colIds.indexOf(colId);
      const donde = fila >= 0 && col >= 0 ? `${indiceAColumna(col)}${fila + 1}` : claveCelda(filaId, colId);
      salida.push({ hoja: b.nombre, donde, antes: va, despues: vb });
    }
    if (JSON.stringify(a.combinadas) !== JSON.stringify(b.combinadas)) {
      salida.push({
        hoja: b.nombre,
        donde: "Celdas combinadas",
        antes: String(a.combinadas.length),
        despues: String(b.combinadas.length),
      });
    }
  }
  return salida;
}
