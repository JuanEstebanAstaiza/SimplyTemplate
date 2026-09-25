import ExcelJS from "exceljs";
import JSZip from "jszip";
import { formulaSoportada } from "../libro/formulas";
import { claveCelda, type Celda, type EstadoLibro } from "../libro/tipos";

function valorExcel(celda: Celda): ExcelJS.CellValue {
  if (celda.formula) {
    const result = celda.valor === "" || Number.isNaN(Number(celda.valor)) ? celda.valor : Number(celda.valor);
    return { formula: celda.formula.replace(/^=/, ""), result };
  }
  if (celda.formato === "numero" || celda.formato === "porcentaje" || celda.formato === "moneda") {
    const n = Number(celda.valor);
    if (celda.valor !== "" && !Number.isNaN(n)) return n;
  }
  if (celda.formato === "fecha" && /^\d{4}-\d{2}-\d{2}$/.test(celda.valor)) return new Date(`${celda.valor}T00:00:00Z`);
  return celda.valor;
}

export async function escribirExcel(estado: EstadoLibro, trazabilidad: string[][] = []) {
  const libro = new ExcelJS.Workbook();
  for (const hoja of estado.hojas) {
    const sheet = libro.addWorksheet((hoja.nombre || "Hoja").slice(0, 31));
    hoja.anchos.forEach((ancho, indice) => {
      sheet.getColumn(indice + 1).width = Math.max(10, Math.round(ancho / 8));
    });
    for (let f = 0; f < hoja.filaIds.length; f++) {
      for (let c = 0; c < hoja.colIds.length; c++) {
        const celda = hoja.celdas[claveCelda(hoja.filaIds[f], hoja.colIds[c])];
        if (!celda) continue;
        const cell = sheet.getCell(f + 1, c + 1);
        if (celda.formula && !formulaSoportada(celda.formula)) {
          cell.value = celda.valor || celda.formula;
        } else {
          cell.value = valorExcel(celda);
        }
        if (celda.negrita) cell.font = { bold: true };
        if (celda.relleno) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${celda.relleno.replace("#", "")}` } };
        }
        if (celda.borde) {
          const estilo: "thin" | "medium" | "thick" =
            celda.borde.grosor === "grueso" ? "thick" : celda.borde.grosor === "medio" ? "medium" : "thin";
          const color = { argb: `FF${(celda.borde.color || "#152238").replace("#", "")}` };
          const lado = (activo?: boolean) => (activo ? { style: estilo, color } : undefined);
          cell.border = {
            top: lado(celda.borde.arriba),
            right: lado(celda.borde.derecha),
            bottom: lado(celda.borde.abajo),
            left: lado(celda.borde.izquierda),
          };
        }
        if (celda.formato === "porcentaje") cell.numFmt = "0.00%";
        if (celda.formato === "moneda") cell.numFmt = '"$"#,##0';
        if (celda.formato === "fecha") cell.numFmt = "yyyy-mm-dd";
        if (celda.formato === "numero") cell.numFmt = "#,##0.####";
      }
    }
    for (const merge of hoja.combinadas) {
      const f = hoja.filaIds.indexOf(merge.filaId);
      const c = hoja.colIds.indexOf(merge.colId);
      if (f < 0 || c < 0) continue;
      sheet.mergeCells(f + 1, c + 1, f + merge.filas, c + merge.columnas);
    }
  }
  if (trazabilidad.length) {
    const sheet = libro.addWorksheet("Trazabilidad");
    trazabilidad.forEach((fila, f) => {
      fila.forEach((valor, c) => {
        const cell = sheet.getCell(f + 1, c + 1);
        cell.value = valor;
        if (f === 0) cell.font = { bold: true };
      });
    });
  }
  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function escribirCsv(estado: EstadoLibro, hojaId?: string) {
  const hoja = estado.hojas.find((item) => item.id === hojaId) ?? estado.hojas[0];
  if (!hoja) return "";
  const lineas = hoja.filaIds.map((filaId) =>
    hoja.colIds
      .map((colId) => {
        const valor = hoja.celdas[claveCelda(filaId, colId)]?.valor ?? "";
        return /[",\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
      })
      .join(","),
  );
  return lineas.join("\n");
}

export async function inyectarOriginal(generado: Buffer, original: Buffer) {
  const nuevo = await JSZip.loadAsync(generado);
  const viejo = await JSZip.loadAsync(original);
  const vba = viejo.file("xl/vbaProject.bin");
  if (vba) nuevo.file("xl/vbaProject.bin", await vba.async("nodebuffer"));
  const copias = Object.keys(viejo.files).filter(
    (ruta) => ruta.startsWith("xl/pivotTables/") || ruta.startsWith("xl/pivotCache/"),
  );
  for (const ruta of copias) {
    const archivo = viejo.file(ruta);
    if (archivo && !archivo.dir) nuevo.file(ruta, await archivo.async("nodebuffer"));
  }
  if (vba) {
    const tipos = await nuevo.file("[Content_Types].xml")?.async("string");
    if (tipos && !tipos.includes("/xl/vbaProject.bin")) {
      const override =
        '<Override PartName="/xl/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject"/>';
      nuevo.file("[Content_Types].xml", tipos.replace("</Types>", `${override}</Types>`));
    }
    const relsPath = "xl/_rels/workbook.xml.rels";
    const rels = await nuevo.file(relsPath)?.async("string");
    if (rels && !rels.includes("vbaProject")) {
      const relacion =
        '<Relationship Id="rIdMacro" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/>';
      nuevo.file(relsPath, rels.replace("</Relationships>", `${relacion}</Relationships>`));
    }
  }
  return Buffer.from(await nuevo.generateAsync({ type: "nodebuffer" }));
}
