import ExcelJS from "exceljs";
import JSZip from "jszip";
import Papa from "papaparse";
import { bordeActivo } from "../libro/bordes";
import { claveCelda, type Borde, type Celda, type EstadoLibro, type Formato, type GrosorBorde } from "../libro/tipos";
import { hojaVacia } from "../libro/vacio";
import { columnaAIndice, parsearReferencia } from "../libro/refs";

export type LibroLeido = {
  estado: EstadoLibro;
  tieneMacros: boolean;
  tieneTablaDinamica: boolean;
};

function bordeExcel(border?: Partial<ExcelJS.Borders>): Borde | undefined {
  if (!border) return undefined;
  const presente = (lado?: { style?: string }) => Boolean(lado?.style && lado.style !== "none");
  const arriba = presente(border.top);
  const derecha = presente(border.right);
  const abajo = presente(border.bottom);
  const izquierda = presente(border.left);
  if (!arriba && !derecha && !abajo && !izquierda) return undefined;
  const argb = border.top?.color?.argb || border.bottom?.color?.argb || border.left?.color?.argb || border.right?.color?.argb;
  const estilo = border.top?.style || border.bottom?.style || border.left?.style || border.right?.style;
  const grosor: GrosorBorde = estilo === "thick" ? "grueso" : estilo === "medium" ? "medio" : "fino";
  return bordeActivo({
    arriba,
    derecha,
    abajo,
    izquierda,
    color: argb && argb.length >= 6 ? `#${argb.slice(-6)}` : "#152238",
    grosor,
  });
}

function formatoDe(numFmt: string | undefined, valor: unknown): Formato | undefined {
  const fmt = numFmt || "";
  if (fmt.includes("%")) return "porcentaje";
  if (fmt.includes("$") || fmt.toLowerCase().includes("cop")) return "moneda";
  if (/[dy]/i.test(fmt) && fmt.includes("m")) return "fecha";
  if (typeof valor === "number" || valor instanceof Date) return valor instanceof Date ? "fecha" : "numero";
  return undefined;
}

function textoDe(valor: ExcelJS.CellValue): { valor: string; formula: string } {
  if (valor == null) return { valor: "", formula: "" };
  if (typeof valor === "number") return { valor: String(valor), formula: "" };
  if (typeof valor === "string") return { valor, formula: "" };
  if (typeof valor === "boolean") return { valor: valor ? "TRUE" : "FALSE", formula: "" };
  if (valor instanceof Date) return { valor: valor.toISOString().slice(0, 10), formula: "" };
  if (typeof valor === "object" && "formula" in valor) {
    const result = "result" in valor ? valor.result : "";
    const texto = result instanceof Date ? result.toISOString().slice(0, 10) : result == null ? "" : String(result);
    return { valor: texto, formula: `=${valor.formula}` };
  }
  if (typeof valor === "object" && "richText" in valor) {
    return { valor: valor.richText.map((parte) => parte.text).join(""), formula: "" };
  }
  if (typeof valor === "object" && "text" in valor) {
    return { valor: String(valor.text), formula: "" };
  }
  return { valor: String(valor), formula: "" };
}

export async function leerExcel(buffer: Buffer): Promise<LibroLeido> {
  const zip = await JSZip.loadAsync(buffer);
  const tieneMacros = Boolean(zip.file("xl/vbaProject.bin"));
  const tieneTablaDinamica = Object.keys(zip.files).some((ruta) => ruta.startsWith("xl/pivotTables/"));
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const estado: EstadoLibro = { hojas: [], zonas: [] };
  libro.eachSheet((sheet, indice) => {
    const filas = Math.max(sheet.rowCount + 5, 20);
    const columnas = Math.max(sheet.columnCount + 3, 8);
    const hoja = hojaVacia(sheet.name || `Hoja ${indice}`, indice - 1, filas, columnas);
    sheet.columns.forEach((columna, i) => {
      if (hoja.anchos[i] && columna.width) hoja.anchos[i] = Math.round(columna.width * 8);
    });
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber - 1 >= hoja.filaIds.length) return;
      if (row.height) hoja.altos[rowNumber - 1] = Math.round(row.height);
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber - 1 >= hoja.colIds.length) return;
        const leido = textoDe(cell.value);
        const formato = formatoDe(cell.numFmt, cell.value);
        const negrita = Boolean(cell.font?.bold) || undefined;
        const argb = cell.fill && cell.fill.type === "pattern" ? cell.fill.fgColor?.argb : undefined;
        const relleno = argb && argb.length >= 6 ? `#${argb.slice(-6)}` : undefined;
        const borde = bordeExcel(cell.border);
        if (!leido.valor && !leido.formula && !negrita && !relleno && !formato && !borde) return;
        const celda: Celda = {
          valor: leido.valor,
          formula: leido.formula || undefined,
          formato,
          negrita,
          relleno,
          borde,
        };
        hoja.celdas[claveCelda(hoja.filaIds[rowNumber - 1], hoja.colIds[colNumber - 1])] = celda;
      });
    });
    for (const rango of sheet.model.merges ?? []) {
      const [inicio, fin] = rango.split(":");
      const a = parsearReferencia(inicio);
      const b = parsearReferencia(fin || inicio);
      if (!a || !b) continue;
      const f1 = Math.min(a.fila, b.fila);
      const c1 = Math.min(a.columna, b.columna);
      const f2 = Math.max(a.fila, b.fila);
      const c2 = Math.max(a.columna, b.columna);
      if (!hoja.filaIds[f1] || !hoja.colIds[c1]) continue;
      hoja.combinadas.push({
        filaId: hoja.filaIds[f1],
        colId: hoja.colIds[c1],
        filas: f2 - f1 + 1,
        columnas: c2 - c1 + 1,
      });
    }
    estado.hojas.push(hoja);
  });
  if (!estado.hojas.length) estado.hojas.push(hojaVacia("Hoja 1", 0));
  return { estado, tieneMacros, tieneTablaDinamica };
}

function inferirTexto(texto: string): { valor: string; formato?: Formato } {
  const t = texto.trim();
  if (!t) return { valor: "" };
  if (/^-?\d+(?:[.,]\d+)?%$/.test(t)) {
    const n = Number(t.replace("%", "").replace(",", "."));
    return { valor: String(n / 100), formato: "porcentaje" };
  }
  if (/^\$?\s?-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(t)) {
    return { valor: t.replace(/\$/g, "").replace(/\./g, "").replace(",", ".").trim(), formato: t.includes("$") ? "moneda" : "numero" };
  }
  if (/^-?\d+,\d+$/.test(t)) return { valor: t.replace(",", "."), formato: "numero" };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { valor: t, formato: "numero" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return { valor: t, formato: "fecha" };
  const fecha = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (fecha) return { valor: `${fecha[3]}-${fecha[2].padStart(2, "0")}-${fecha[1].padStart(2, "0")}`, formato: "fecha" };
  return { valor: t, formato: "texto" };
}

export function leerCsv(texto: string, separador?: string): EstadoLibro {
  const parsed = Papa.parse<string[]>(texto, {
    delimiter: separador || "",
    skipEmptyLines: false,
  });
  const filas = parsed.data.filter((fila) => fila.some((celda) => String(celda).trim() !== ""));
  const columnas = Math.max(8, ...filas.map((fila) => fila.length));
  const hoja = hojaVacia("CSV", 0, Math.max(20, filas.length + 5), columnas);
  filas.forEach((fila, f) => {
    fila.forEach((crudo, c) => {
      const inferido = inferirTexto(String(crudo));
      if (!inferido.valor) return;
      hoja.celdas[claveCelda(hoja.filaIds[f], hoja.colIds[c])] = {
        valor: inferido.valor,
        formato: inferido.formato,
        negrita: f === 0 || undefined,
      };
    });
  });
  return { hojas: [hoja], zonas: [] };
}

export { columnaAIndice };
