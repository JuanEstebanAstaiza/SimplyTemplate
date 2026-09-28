import type { Rol } from "../authz";

export type AsignacionDoc = {
  hojaId: string;
  eje: string;
  refId: string;
};

export function puedeVerDocumento(
  rol: Rol,
  asignaciones: AsignacionDoc[],
  lugar: { hojaId: string; filaId: string; colId: string },
) {
  if (rol === "ADMINISTRADOR" || rol === "AUDITOR") return true;
  if (asignaciones.length === 0) return true;
  return asignaciones.some(
    (item) =>
      item.hojaId === lugar.hojaId &&
      ((item.eje === "COLUMNA" && item.refId === lugar.colId) || (item.eje === "FILA" && item.refId === lugar.filaId)),
  );
}
