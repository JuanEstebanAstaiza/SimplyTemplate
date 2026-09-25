import { describe, expect, it } from "vitest";
import { insertarFuncion, sugerirFunciones } from "./sugerencias";

describe("autocompletado de fórmulas", () => {
  it("sugiere SUM y SUMIF al escribir SU", () => {
    const nombres = sugerirFunciones("=SU", 3).map((funcion) => funcion.nombre);
    expect(nombres).toEqual(["SUM", "SUMIF"]);
  });

  it("no sugiere cuando la referencia ya tiene número", () => {
    expect(sugerirFunciones("=A1", 3)).toEqual([]);
  });

  it("inserta la función y deja el cursor dentro del paréntesis", () => {
    expect(insertarFuncion("=SU", 3, "SUM")).toEqual({ texto: "=SUM(", cursor: 5 });
  });
});
