import { describe, expect, it } from "vitest";
import { bordeParaCelda } from "./bordes";

describe("bordes", () => {
  it("marca solo el contorno de la selección", () => {
    const esquina = bordeParaCelda(undefined, "contorno", { fila: 0, col: 0, f1: 0, c1: 0, f2: 1, c2: 1 }, "#152238", "fino");
    const centro = bordeParaCelda(undefined, "contorno", { fila: 1, col: 1, f1: 0, c1: 0, f2: 1, c2: 1 }, "#152238", "fino");
    expect(esquina).toMatchObject({ arriba: true, izquierda: true, abajo: false, derecha: false });
    expect(centro).toMatchObject({ abajo: true, derecha: true, arriba: false, izquierda: false });
  });

  it("quita los bordes", () => {
    expect(
      bordeParaCelda({ arriba: true, color: "#000" }, "quitar", { fila: 0, col: 0, f1: 0, c1: 0, f2: 0, c2: 0 }, "#152238", "fino"),
    ).toBeUndefined();
  });
});