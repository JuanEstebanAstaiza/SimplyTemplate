import { describe, expect, it } from "vitest";
import { puedeVerDocumento } from "./acceso";

describe("documentos por asignación", () => {
  const lugar = { hojaId: "h", filaId: "f2", colId: "c2" };

  it("deja ver todo cuando el funcionario no tiene columnas asignadas", () => {
    expect(puedeVerDocumento("EDITOR", [], lugar)).toBe(true);
  });

  it("limita al editor a los documentos de su columna o su fila", () => {
    expect(puedeVerDocumento("EDITOR", [{ hojaId: "h", eje: "COLUMNA", refId: "c2" }], lugar)).toBe(true);
    expect(puedeVerDocumento("EDITOR", [{ hojaId: "h", eje: "COLUMNA", refId: "c9" }], lugar)).toBe(false);
    expect(puedeVerDocumento("EDITOR", [{ hojaId: "h", eje: "FILA", refId: "f2" }], lugar)).toBe(true);
  });

  it("el auditor ve los documentos de toda la plantilla", () => {
    expect(puedeVerDocumento("AUDITOR", [{ hojaId: "h", eje: "COLUMNA", refId: "c9" }], lugar)).toBe(true);
  });
});
