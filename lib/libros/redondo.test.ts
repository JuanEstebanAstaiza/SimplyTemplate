import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { aplicar } from "../libro/aplicar";
import { libroVacio } from "../libro/vacio";
import { escribirCsv, escribirExcel, inyectarOriginal } from "./escribir";
import { leerCsv, leerExcel } from "./leer";

describe("libros", () => {
  it("conserva una combinación al exportar y volver a cargar", async () => {
    const base = libroVacio();
    const hoja = base.hojas[0];
    const estado = aplicar(base, {
      tipo: "MERGE",
      hojaId: hoja.id,
      filaId: hoja.filaIds[0],
      colId: hoja.colIds[0],
      filas: 2,
      columnas: 3,
      justificacion: "El título del plan ocupa el encabezado combinado.",
    });
    const leido = await leerExcel(await escribirExcel(estado));
    expect(leido.estado.hojas[0].combinadas[0]).toMatchObject({ filas: 2, columnas: 3 });
  });

  it("el csv entra y sale con los mismos valores", () => {
    const estado = leerCsv("Linea,Valor\nSalud,10\n");
    expect(escribirCsv(estado)).toContain("Salud,10");
  });

  it("devuelve el proyecto VBA dentro del xlsm", async () => {
    const zip = new JSZip();
    zip.file("xl/vbaProject.bin", "macro");
    zip.file("[Content_Types].xml", "<Types></Types>");
    zip.file("xl/_rels/workbook.xml.rels", "<Relationships></Relationships>");
    const original = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
    const generado = await escribirExcel(libroVacio());
    const resultado = await JSZip.loadAsync(await inyectarOriginal(generado, original));
    expect(resultado.file("xl/vbaProject.bin")).toBeTruthy();
  });
});
