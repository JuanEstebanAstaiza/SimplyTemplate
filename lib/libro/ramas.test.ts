import { describe, expect, it } from "vitest";
import { aplicar } from "./aplicar";
import { ramasDeCambio } from "./ramas";
import { libroVacio } from "./vacio";

describe("ramas de columnas", () => {
  it("agrupa el cambio bajo el título de la columna", () => {
    const base = libroVacio();
    const hoja = base.hojas[0];
    const conTitulos = aplicar(base, {
      tipo: "SET_CELL",
      hojaId: hoja.id,
      filaId: hoja.filaIds[0],
      colId: hoja.colIds[1],
      valor: "Ejecución",
      formula: "",
      justificacion: "Se nombra la columna de ejecución presupuestal.",
    });
    const editada = aplicar(conTitulos, {
      tipo: "SET_CELL",
      hojaId: hoja.id,
      filaId: hoja.filaIds[1],
      colId: hoja.colIds[0],
      valor: "Salud",
      formula: "",
      justificacion: "Se escribe la línea de la fila.",
    });
    const despues = aplicar(editada, {
      tipo: "SET_CELL",
      hojaId: hoja.id,
      filaId: hoja.filaIds[1],
      colId: hoja.colIds[1],
      valor: "0.55",
      formula: "",
      justificacion: "Se actualiza el porcentaje de ejecución.",
    });
    const ramas = ramasDeCambio(editada, despues);
    expect(ramas).toEqual([
      { titulo: "Ejecución", cambios: [{ etiqueta: "Salud", antes: "", despues: "0.55" }] },
    ]);
  });
});
