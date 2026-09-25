const OFFSET = "-05:00";

export function inicioDiaBogota(isoDate: string) {
  return new Date(`${isoDate}T00:00:00${OFFSET}`);
}

export function finDiaBogota(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999${OFFSET}`);
}

export function dentroDeVigencia(inicio: Date, fin: Date, ahora = new Date()) {
  return ahora.getTime() >= inicio.getTime() && ahora.getTime() <= fin.getTime();
}

export function formatoBogota(fecha: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

export function fechaCortaBogota(fecha: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
  }).format(fecha);
}
