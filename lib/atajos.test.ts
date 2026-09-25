import { describe, expect, it } from "vitest";
import { ATAJOS_DEFECTO, duplicados, eventoAAtajo, mapaEfectivo } from "./atajos";

describe("atajos", () => {
  it("usa Ctrl+B como negrita predeterminada y conserva un cambio del funcionario", () => {
    expect(ATAJOS_DEFECTO.negrita).toBe("Ctrl+B");
    expect(mapaEfectivo({ porcentaje: "Alt+5" }).porcentaje).toBe("Alt+5");
    expect(mapaEfectivo({ porcentaje: "Alt+5" }).negrita).toBe("Ctrl+B");
  });

  it("traduce la pulsación y detecta dos acciones con la misma tecla", () => {
    expect(eventoAAtajo({ key: "b", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe("Ctrl+B");
    expect(eventoAAtajo({ key: "Control", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe("");
    const mapa = { ...ATAJOS_DEFECTO, numero: "Alt+T" };
    expect(duplicados(mapa)).toEqual(expect.arrayContaining(["numero", "texto"]));
  });
});
