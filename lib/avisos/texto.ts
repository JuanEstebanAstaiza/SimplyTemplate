export function textoRadicacion(nombre: string, cambios: number, casillas: number, plantilla: string) {
  if (casillas === 0) {
    const cambio = cambios === 1 ? "un cambio de estructura" : `${cambios} cambios de estructura`;
    return `${nombre} radicó ${cambio} en ${plantilla}.`;
  }
  const c = cambios === 1 ? "1 cambio" : `${cambios} cambios`;
  const k = casillas === 1 ? "1 casilla" : `${casillas} casillas`;
  return `${nombre} radicó ${c} en ${k} de ${plantilla}.`;
}

export function textoDevolucion(nombre: string, plantilla: string, numero: number) {
  return `${nombre} devolvió ${plantilla} al folio ${numero}.`;
}

export function textoContrafirmaPendiente(nombre: string, plantilla: string) {
  return `${nombre} dejó una constancia pendiente de contrafirma en ${plantilla}.`;
}

export function textoContrafirma(nombre: string, plantilla: string, numero: number, rechazo: boolean) {
  if (rechazo) return `${nombre} rechazó el folio ${numero} de ${plantilla}.`;
  return `${nombre} contrafirmó el folio ${numero} de ${plantilla}.`;
}

export function contarCasillas(
  ops: { tipo: string; hojaId?: string; filaId?: string; colId?: string }[],
) {
  const celdas = new Set<string>();
  for (const op of ops) {
    if (op.tipo === "SET_CELL" && op.hojaId && op.filaId && op.colId) {
      celdas.add(`${op.hojaId}:${op.filaId}:${op.colId}`);
    }
  }
  return { cambios: ops.length, casillas: celdas.size };
}
