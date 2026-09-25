import { evaluarFormula, formulaSoportada } from "./formulas";
import { bordeActivo } from "./bordes";
import { claveCelda, type Celda, type EstadoLibro, type HojaEstado, type Operacion } from "./tipos";

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function hojaDe(estado: EstadoLibro, hojaId: string) {
  const hoja = estado.hojas.find((h) => h.id === hojaId);
  if (!hoja) throw new Error("La hoja no existe.");
  return hoja;
}

function anclaQueCubre(hoja: HojaEstado, filaId: string, colId: string) {
  const fi = hoja.filaIds.indexOf(filaId);
  const ci = hoja.colIds.indexOf(colId);
  for (const merge of hoja.combinadas) {
    const af = hoja.filaIds.indexOf(merge.filaId);
    const ac = hoja.colIds.indexOf(merge.colId);
    if (af < 0 || ac < 0) continue;
    if (fi >= af && fi < af + merge.filas && ci >= ac && ci < ac + merge.columnas) {
      return merge;
    }
  }
  return null;
}

function recalcular(estado: EstadoLibro): EstadoLibro {
  for (const hoja of estado.hojas) {
    const leerBase = (fila: number, columna: number) => {
      const filaId = hoja.filaIds[fila];
      const colId = hoja.colIds[columna];
      if (!filaId || !colId) return "";
      const celda = hoja.celdas[claveCelda(filaId, colId)];
      if (!celda) return "";
      if (celda.formula && celda.formula.startsWith("=") && formulaSoportada(celda.formula)) {
        return celda.valor;
      }
      return celda.valor;
    };
    const pendientes = Object.entries(hoja.celdas).filter(
      ([, celda]) => celda.formula && celda.formula.startsWith("=") && formulaSoportada(celda.formula),
    );
    const visitando = new Set<string>();
    const resuelto = new Set<string>();
    const evaluarClave = (key: string): string => {
      const celda = hoja.celdas[key];
      if (!celda?.formula || !formulaSoportada(celda.formula)) return celda?.valor ?? "";
      if (resuelto.has(key)) return celda.valor;
      if (visitando.has(key)) return "#CIRCULAR";
      visitando.add(key);
      const [filaId, colId] = key.split(":");
      const fila = hoja.filaIds.indexOf(filaId);
      const columna = hoja.colIds.indexOf(colId);
      const valor = evaluarFormula(
        celda.formula,
        (f, c) => {
          const idF = hoja.filaIds[f];
          const idC = hoja.colIds[c];
          if (!idF || !idC) return "";
          const destino = claveCelda(idF, idC);
          const otra = hoja.celdas[destino];
          if (otra?.formula && formulaSoportada(otra.formula)) return evaluarClave(destino);
          return leerBase(f, c);
        },
        { fila, columna },
      );
      visitando.delete(key);
      celda.valor = valor;
      resuelto.add(key);
      return valor;
    };
    for (const [key] of pendientes) evaluarClave(key);
    for (const [key, celda] of Object.entries(hoja.celdas)) {
      if (celda.formula && celda.formula.startsWith("=") && !formulaSoportada(celda.formula)) {
        if (!celda.valor) hoja.celdas[key].valor = "";
      }
    }
  }
  return estado;
}

function ajustarCombinadas(hoja: HojaEstado, index: number, eje: "fila" | "col") {
  for (const merge of hoja.combinadas) {
    const ids = eje === "fila" ? hoja.filaIds : hoja.colIds;
    const ancla = eje === "fila" ? merge.filaId : merge.colId;
    const pos = ids.indexOf(ancla);
    const span = eje === "fila" ? merge.filas : merge.columnas;
    if (pos < 0) continue;
    if (pos < index && pos + span > index) {
      if (eje === "fila") merge.filas += 1;
      else merge.columnas += 1;
    }
  }
}

export function aplicar(estado: EstadoLibro, op: Operacion): EstadoLibro {
  const siguiente = clonar(estado);
  if (op.tipo === "ADD_SHEET") {
    siguiente.hojas.push({ ...op.hoja, orden: siguiente.hojas.length });
    return siguiente;
  }
  if (op.tipo === "SET_ZONE") {
    siguiente.zonas = siguiente.zonas.filter((z) => z.id !== op.zona.id).concat(op.zona);
    return siguiente;
  }
  if (op.tipo === "REMOVE_ZONE") {
    siguiente.zonas = siguiente.zonas.filter((z) => z.id !== op.zonaId);
    return siguiente;
  }

  const hoja = hojaDe(siguiente, op.hojaId);
  if (op.tipo === "INSERT_ROW") {
    hoja.filaIds.splice(op.index, 0, op.filaId);
    hoja.altos.splice(op.index, 0, 28);
    ajustarCombinadas(hoja, op.index, "fila");
    return siguiente;
  }
  if (op.tipo === "INSERT_COL") {
    hoja.colIds.splice(op.index, 0, op.colId);
    hoja.anchos.splice(op.index, 0, 120);
    ajustarCombinadas(hoja, op.index, "col");
    return siguiente;
  }
  if (op.tipo === "ARCHIVE_ROW") {
    const index = hoja.filaIds.indexOf(op.filaId);
    if (index >= 0) {
      hoja.filaIds.splice(index, 1);
      hoja.altos.splice(index, 1);
      hoja.filaArchivo.push(op.filaId);
      hoja.combinadas = hoja.combinadas.filter((m) => m.filaId !== op.filaId);
    }
    return siguiente;
  }
  if (op.tipo === "ARCHIVE_COL") {
    const index = hoja.colIds.indexOf(op.colId);
    if (index >= 0) {
      hoja.colIds.splice(index, 1);
      hoja.anchos.splice(index, 1);
      hoja.colArchivo.push(op.colId);
      hoja.combinadas = hoja.combinadas.filter((m) => m.colId !== op.colId);
    }
    return siguiente;
  }
  if (op.tipo === "UNMERGE") {
    hoja.combinadas = hoja.combinadas.filter((m) => !(m.filaId === op.filaId && m.colId === op.colId));
    return siguiente;
  }
  if (op.tipo === "MERGE") {
    const af = hoja.filaIds.indexOf(op.filaId);
    const ac = hoja.colIds.indexOf(op.colId);
    if (af < 0 || ac < 0) throw new Error("La combinación cae fuera de la hoja.");
    hoja.combinadas = hoja.combinadas.filter((m) => {
      const mf = hoja.filaIds.indexOf(m.filaId);
      const mc = hoja.colIds.indexOf(m.colId);
      const separadas =
        mf + m.filas <= af || af + op.filas <= mf || mc + m.columnas <= ac || ac + op.columnas <= mc;
      return separadas;
    });
    for (let f = af; f < af + op.filas; f++) {
      for (let c = ac; c < ac + op.columnas; c++) {
        if (f === af && c === ac) continue;
        const idF = hoja.filaIds[f];
        const idC = hoja.colIds[c];
        if (idF && idC) delete hoja.celdas[claveCelda(idF, idC)];
      }
    }
    hoja.combinadas.push({ filaId: op.filaId, colId: op.colId, filas: op.filas, columnas: op.columnas });
    return siguiente;
  }

  const cubierta = anclaQueCubre(hoja, op.filaId, op.colId);
  if (cubierta && (cubierta.filaId !== op.filaId || cubierta.colId !== op.colId)) {
    throw new Error("Esa casilla está cubierta por una combinación. Edite la celda ancla.");
  }
  const key = claveCelda(op.filaId, op.colId);
  const previa = hoja.celdas[key];
  const borde = op.borde === null ? undefined : bordeActivo(op.borde ?? previa?.borde);
  const celda: Celda = {
    valor: op.valor,
    formula: op.formula || undefined,
    formato: op.formato,
    negrita: op.negrita || undefined,
    relleno: op.relleno || undefined,
    borde,
  };
  if (!celda.valor && !celda.formula && !celda.formato && !celda.negrita && !celda.relleno && !celda.borde) {
    delete hoja.celdas[key];
  } else {
    hoja.celdas[key] = celda;
  }
  return recalcular(siguiente);
}

export function aplicarTodas(estado: EstadoLibro, ops: Operacion[]): EstadoLibro {
  return ops.reduce(aplicar, estado);
}

export function calcularLibro(estado: EstadoLibro) {
  return recalcular(structuredClone(estado));
}

export function celdaCubierta(hoja: HojaEstado, filaId: string, colId: string) {
  const ancla = anclaQueCubre(hoja, filaId, colId);
  if (!ancla) return false;
  return ancla.filaId !== filaId || ancla.colId !== colId;
}

export function extensionAncla(hoja: HojaEstado, filaId: string, colId: string) {
  const merge = hoja.combinadas.find((m) => m.filaId === filaId && m.colId === colId);
  if (!merge) return null;
  return { filas: merge.filas, columnas: merge.columnas };
}
