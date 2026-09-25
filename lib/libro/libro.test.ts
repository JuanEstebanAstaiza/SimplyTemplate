import { describe, expect, it } from "vitest";
import { aplicar, aplicarTodas } from "./aplicar";
import { canonico } from "./canonica";
import { diferencias } from "./diff";
import { evaluarFormula } from "./formulas";
import { desplazarFormula } from "./refs";
import { resumir } from "./resumen";
import { claveCelda, type EstadoLibro, type Operacion } from "./tipos";
import { libroVacio } from "./vacio";
import { minSoportes } from "./zonas";

function celda(estado: EstadoLibro, hoja = 0, fila = 0, col = 0) {
  const h = estado.hojas[hoja];
  return h.celdas[claveCelda(h.filaIds[fila], h.colIds[col])]?.valor ?? "";
}

describe("fórmulas", () => {
  it("calcula sumas, condiciones y porcentajes", () => {
    const leer = (f: number, c: number) => {
      const tabla = [
        ["10", "2"],
        ["5", "4"],
        ["0", "1"],
      ];
      return tabla[f]?.[c] ?? "";
    };
    expect(evaluarFormula("=SUM(A1:A3)", leer)).toBe("15");
    expect(evaluarFormula("=AVERAGE(B1:B3)", leer)).toBe("2.3333333333");
    expect(evaluarFormula("=IF(A1>A2,\"alto\",\"bajo\")", leer)).toBe("alto");
    expect(evaluarFormula("=ROUND(B1/A1, 2)", leer)).toBe("0.2");
    expect(evaluarFormula("=SUMIF(A1:A3,\">0\",B1:B3)", leer)).toBe("6");
    expect(evaluarFormula("=A1+B1*2", leer)).toBe("14");
  });

  it("marca la división por cero y la referencia circular", () => {
    expect(evaluarFormula("=1/0", () => "")).toBe("#DIV/0");
    expect(evaluarFormula("=A1", () => "1", { fila: 0, columna: 0 })).toBe("#CIRCULAR");
  });

  it("desplaza referencias relativas", () => {
    expect(desplazarFormula("=A1+B$2", 1, 1)).toBe("=B2+C$2");
  });
});

describe("hoja", () => {
  it("combina celdas, inserta una fila y conserva el valor del ancla", () => {
    const base = libroVacio();
    const hoja = base.hojas[0];
    const ops: Operacion[] = [
      {
        tipo: "SET_CELL",
        hojaId: hoja.id,
        filaId: hoja.filaIds[0],
        colId: hoja.colIds[0],
        valor: "Meta",
        formula: "",
        negrita: true,
        justificacion: "Se registra el nombre de la meta del plan.",
      },
      {
        tipo: "MERGE",
        hojaId: hoja.id,
        filaId: hoja.filaIds[0],
        colId: hoja.colIds[0],
        filas: 1,
        columnas: 2,
        justificacion: "El título ocupa las dos primeras columnas.",
      },
      {
        tipo: "INSERT_ROW",
        hojaId: hoja.id,
        index: 1,
        filaId: "f_nueva",
        justificacion: "Se agrega una fila para la nueva meta.",
      },
    ];
    const estado = aplicarTodas(base, ops);
    expect(celda(estado)).toBe("Meta");
    expect(estado.hojas[0].combinadas).toHaveLength(1);
    expect(estado.hojas[0].filaIds[1]).toBe("f_nueva");
    expect(aplicar(estado, ops[2]).hojas[0].filaIds.filter((id) => id === "f_nueva")).toHaveLength(2);
  });

  it("calcula una fórmula al radicar el cambio de casilla", () => {
    const base = libroVacio();
    const hoja = base.hojas[0];
    const estado = aplicarTodas(base, [
      {
        tipo: "SET_CELL",
        hojaId: hoja.id,
        filaId: hoja.filaIds[0],
        colId: hoja.colIds[0],
        valor: "10",
        formula: "",
        formato: "numero",
        justificacion: "Se carga el valor base de la meta.",
      },
      {
        tipo: "SET_CELL",
        hojaId: hoja.id,
        filaId: hoja.filaIds[1],
        colId: hoja.colIds[0],
        valor: "5",
        formula: "",
        formato: "numero",
        justificacion: "Se carga el avance de la meta.",
      },
      {
        tipo: "SET_CELL",
        hojaId: hoja.id,
        filaId: hoja.filaIds[2],
        colId: hoja.colIds[0],
        valor: "",
        formula: "=A1+A2",
        formato: "numero",
        justificacion: "La casilla suma el valor base y el avance.",
      },
    ]);
    expect(celda(estado, 0, 2, 0)).toBe("15");
  });

  it("exige soporte dentro de la zona marcada", () => {
    const base = libroVacio();
    const hoja = base.hojas[0];
    const conZona = aplicar(base, {
      tipo: "SET_ZONE",
      justificacion: "La ejecución presupuestal exige soporte.",
      zona: {
        id: "z1",
        hojaId: hoja.id,
        filaIdInicio: hoja.filaIds[0],
        filaIdFin: hoja.filaIds[2],
        colIdInicio: hoja.colIds[1],
        colIdFin: hoja.colIds[1],
        minSoportes: 1,
        descripcion: "Porcentaje de ejecución",
      },
    });
    expect(minSoportes(conZona, conZona.hojas[0], hoja.filaIds[1], hoja.colIds[1])).toBe(1);
    expect(minSoportes(conZona, conZona.hojas[0], hoja.filaIds[1], hoja.colIds[0])).toBe(0);
  });

  it("muestra la diferencia entre dos folios", () => {
    const base = libroVacio();
    const hoja = base.hojas[0];
    const despues = aplicar(base, {
      tipo: "SET_CELL",
      hojaId: hoja.id,
      filaId: hoja.filaIds[0],
      colId: hoja.colIds[0],
      valor: "12",
      formula: "",
      justificacion: "Se actualiza el porcentaje de ejecución.",
    });
    const diff = diferencias(base, despues);
    expect(diff).toEqual([expect.objectContaining({ donde: "A1", antes: "", despues: "12" })]);
  });

  it("arma una tabla resumen por etiqueta", () => {
    const base = libroVacio();
    const hoja = base.hojas[0];
    const estado = aplicarTodas(base, [
      ["Línea", "Valor"],
      ["Salud", "10"],
      ["Salud", "5"],
      ["Educación", "7"],
    ].flatMap((fila, f) =>
      fila.map((valor, c) => ({
        tipo: "SET_CELL" as const,
        hojaId: hoja.id,
        filaId: hoja.filaIds[f],
        colId: hoja.colIds[c],
        valor,
        formula: "",
        justificacion: "Se carga un dato de la tabla de resumen.",
      })),
    ));
    const filas = resumir(estado.hojas[0], 0, 1, "suma");
    expect(filas.find((f) => f.etiqueta === "Salud")?.valor).toBe(15);
    expect(filas.find((f) => f.etiqueta === "Educación")?.valor).toBe(7);
  });
});

describe("canónico", () => {
  it("no cambia la huella si solo cambia el orden de las claves", () => {
    expect(canonico({ b: 1, a: { d: 2, c: 3 } })).toBe(canonico({ a: { c: 3, d: 2 }, b: 1 }));
  });
});
