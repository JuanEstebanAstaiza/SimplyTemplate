import { indiceAColumna } from "../libro/refs";
import { claveCelda, type EstadoLibro } from "../libro/tipos";

export type DocumentoHoja = {
  id: string;
  nombre: string;
  mime: string;
  bytes: number;
  sha256: string;
  cuando: string;
  autor: string;
  folio: string;
  hojaId: string;
  filaId: string;
  colId: string;
};

export type FilaDocumentos = {
  filaId: string;
  etiqueta: string;
  documentos: DocumentoHoja[];
};

export type ColumnaDocumentos = {
  colId: string;
  titulo: string;
  filas: FilaDocumentos[];
};

export function arbolDeDocumentos(estado: EstadoLibro | null, documentos: DocumentoHoja[]): ColumnaDocumentos[] {
  const hoja = estado?.hojas[0];
  const grupos = new Map<string, Map<string, DocumentoHoja[]>>();
  for (const documento of documentos) {
    const filas = grupos.get(documento.colId) ?? new Map<string, DocumentoHoja[]>();
    const lista = filas.get(documento.filaId) ?? [];
    lista.push(documento);
    filas.set(documento.filaId, lista);
    grupos.set(documento.colId, filas);
  }
  const columnas: ColumnaDocumentos[] = [];
  const ids = hoja ? hoja.colIds : [...grupos.keys()];
  ids.forEach((colId, indice) => {
    const filasMap = grupos.get(colId);
    if (!filasMap) return;
    const titulo = hoja
      ? hoja.celdas[claveCelda(hoja.filaIds[0] || "", colId)]?.valor?.trim() || `Columna ${indiceAColumna(indice)}`
      : `Columna ${colId.slice(0, 6)}`;
    const filas: FilaDocumentos[] = [];
    const ordenFilas = hoja ? hoja.filaIds : [...filasMap.keys()];
    ordenFilas.forEach((filaId, filaIndice) => {
      const docs = filasMap.get(filaId);
      if (!docs?.length) return;
      const nombreFila = hoja && indice > 0 ? hoja.celdas[claveCelda(filaId, hoja.colIds[0])]?.valor?.trim() : "";
      filas.push({
        filaId,
        etiqueta: filaIndice === 0 ? "Título" : nombreFila || `Fila ${filaIndice + 1}`,
        documentos: docs,
      });
    });
    if (filas.length) columnas.push({ colId, titulo, filas });
  });
  return columnas;
}

export function sePuedeVerEnPagina(mime: string) {
  return mime.startsWith("image/") || mime === "application/pdf";
}
