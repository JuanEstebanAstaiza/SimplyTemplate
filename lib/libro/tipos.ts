export type Formato = "texto" | "numero" | "porcentaje" | "moneda" | "fecha";

export type Celda = {
  valor: string;
  formula?: string;
  formato?: Formato;
  negrita?: boolean;
  relleno?: string;
};

export type Combinada = {
  filaId: string;
  colId: string;
  filas: number;
  columnas: number;
};

export type HojaEstado = {
  id: string;
  nombre: string;
  orden: number;
  filaIds: string[];
  colIds: string[];
  anchos: number[];
  altos: number[];
  celdas: Record<string, Celda>;
  combinadas: Combinada[];
  filaArchivo: string[];
  colArchivo: string[];
};

export type Zona = {
  id: string;
  hojaId: string;
  filaIdInicio: string;
  filaIdFin: string;
  colIdInicio: string;
  colIdFin: string;
  minSoportes: number;
  descripcion: string;
};

export type EstadoLibro = {
  hojas: HojaEstado[];
  zonas: Zona[];
};

export type Operacion =
  | {
      tipo: "SET_CELL";
      hojaId: string;
      filaId: string;
      colId: string;
      valor: string;
      formula: string;
      formato?: Formato;
      negrita?: boolean;
      relleno?: string;
      justificacion: string;
    }
  | {
      tipo: "MERGE";
      hojaId: string;
      filaId: string;
      colId: string;
      filas: number;
      columnas: number;
      justificacion: string;
    }
  | {
      tipo: "UNMERGE";
      hojaId: string;
      filaId: string;
      colId: string;
      justificacion: string;
    }
  | { tipo: "INSERT_ROW"; hojaId: string; index: number; filaId: string; justificacion: string }
  | { tipo: "INSERT_COL"; hojaId: string; index: number; colId: string; justificacion: string }
  | { tipo: "ARCHIVE_ROW"; hojaId: string; filaId: string; justificacion: string }
  | { tipo: "ARCHIVE_COL"; hojaId: string; colId: string; justificacion: string }
  | { tipo: "ADD_SHEET"; hoja: HojaEstado; justificacion: string }
  | { tipo: "SET_ZONE"; zona: Zona; justificacion: string }
  | { tipo: "REMOVE_ZONE"; zonaId: string; justificacion: string };

export function claveCelda(filaId: string, colId: string) {
  return `${filaId}:${colId}`;
}
