export type EstadoPresencia = "EN_LINEA" | "INACTIVO" | "AUSENTE" | "DESCONECTADO";

export function clasificarPresencia(input: {
  visible: boolean;
  segundosSinActividad: number;
  minutosEnLinea: number;
  minutosAusente: number;
}): EstadoPresencia {
  const enLinea = input.minutosEnLinea * 60;
  const ausente = input.minutosAusente * 60;
  if (!input.visible || input.segundosSinActividad >= ausente) return "AUSENTE";
  if (input.segundosSinActividad >= enLinea) return "INACTIVO";
  return "EN_LINEA";
}

export function sumarTramos(tramos: { estado: EstadoPresencia; inicio: Date; fin: Date | null }[], ahora = new Date()) {
  const totales: Record<EstadoPresencia, number> = {
    EN_LINEA: 0,
    INACTIVO: 0,
    AUSENTE: 0,
    DESCONECTADO: 0,
  };
  for (const tramo of tramos) {
    const fin = tramo.fin ?? ahora;
    const ms = Math.max(0, fin.getTime() - tramo.inicio.getTime());
    totales[tramo.estado] += ms;
  }
  return totales;
}

export function minutos(ms: number) {
  return Math.round(ms / 60000);
}
