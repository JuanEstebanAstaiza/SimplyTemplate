import { describe, expect, it } from "vitest";
import { contarCasillas, textoRadicacion } from "../avisos/texto";
import { GENESIS, hashEstado, hashFolio } from "./hash";
import { libroVacio } from "../libro/vacio";
import { clasificarPresencia, sumarTramos } from "../presencia/tramos";
import { dentroDeVigencia, finDiaBogota, inicioDiaBogota } from "../vigencia";
import { cedulaSchema } from "../validacion";

describe("cadena de folios", () => {
  it("encadena el primer folio contra GENESIS y cambia si cambia el estado", () => {
    const estado = libroVacio();
    const creadoEn = new Date("2026-03-14T14:00:00.000Z");
    const base = {
      hashAnterior: GENESIS,
      hashEstado: hashEstado(estado),
      cedula: "1234567890",
      creadoEn,
      numero: 1,
      tipo: "CREACION",
      resumen: "Cargue inicial de la plantilla",
      justificaciones: ["Cargue inicial de la plantilla"],
      soporteHashes: [],
    };
    const primero = hashFolio(base);
    const otro = hashFolio({ ...base, hashEstado: hashEstado({ ...estado, zonas: [] }) });
    expect(primero).toHaveLength(64);
    expect(hashFolio({ ...base, justificaciones: ["Otra justificación distinta"] })).not.toBe(primero);
    expect(hashFolio({ ...base, soporteHashes: ["abc"] })).not.toBe(primero);
    expect(otro).toBe(primero);
  });
});

describe("avisos", () => {
  it("describe los cambios y las casillas, y no cuenta dos veces la misma celda", () => {
    const cuenta = contarCasillas([
      { tipo: "SET_CELL", hojaId: "h", filaId: "f1", colId: "c1" },
      { tipo: "SET_CELL", hojaId: "h", filaId: "f1", colId: "c1" },
      { tipo: "SET_CELL", hojaId: "h", filaId: "f2", colId: "c1" },
      { tipo: "SET_CELL", hojaId: "h", filaId: "f3", colId: "c2" },
      { tipo: "INSERT_ROW" },
    ]);
    expect(cuenta).toEqual({ cambios: 5, casillas: 3 });
    expect(textoRadicacion("Ana Gómez", 4, 3, "Plan de desarrollo")).toBe(
      "Ana Gómez radicó 4 cambios en 3 casillas de Plan de desarrollo.",
    );
  });
});

describe("vigencia y presencia", () => {
  it("cierra la edición cuando la fecha está fuera de la vigencia", () => {
    const inicio = inicioDiaBogota("2026-01-01");
    const fin = finDiaBogota("2026-12-31");
    expect(dentroDeVigencia(inicio, fin, new Date("2026-06-01T15:00:00-05:00"))).toBe(true);
    expect(dentroDeVigencia(inicio, fin, new Date("2027-01-01T00:00:00-05:00"))).toBe(false);
  });

  it("separa en línea, inactivo y ausente sin solapar los tramos", () => {
    expect(clasificarPresencia({ visible: true, segundosSinActividad: 30, minutosEnLinea: 2, minutosAusente: 15 })).toBe(
      "EN_LINEA",
    );
    expect(clasificarPresencia({ visible: true, segundosSinActividad: 180, minutosEnLinea: 2, minutosAusente: 15 })).toBe(
      "INACTIVO",
    );
    expect(clasificarPresencia({ visible: false, segundosSinActividad: 10, minutosEnLinea: 2, minutosAusente: 15 })).toBe(
      "AUSENTE",
    );
    const inicio = new Date("2026-03-14T10:00:00Z");
    const totales = sumarTramos([
      { estado: "EN_LINEA", inicio, fin: new Date("2026-03-14T10:10:00Z") },
      { estado: "INACTIVO", inicio: new Date("2026-03-14T10:10:00Z"), fin: new Date("2026-03-14T10:20:00Z") },
      { estado: "AUSENTE", inicio: new Date("2026-03-14T10:20:00Z"), fin: new Date("2026-03-14T10:30:00Z") },
    ]);
    expect(totales.EN_LINEA).toBe(10 * 60 * 1000);
    expect(totales.INACTIVO).toBe(10 * 60 * 1000);
    expect(totales.AUSENTE).toBe(10 * 60 * 1000);
    expect(totales.EN_LINEA + totales.INACTIVO + totales.AUSENTE).toBe(30 * 60 * 1000);
  });
});

describe("cédula", () => {
  it("acepta la cédula con puntos y la guarda solo en dígitos", () => {
    expect(cedulaSchema.parse("1.234.567.890")).toBe("1234567890");
    expect(cedulaSchema.safeParse("123").success).toBe(false);
  });
});
