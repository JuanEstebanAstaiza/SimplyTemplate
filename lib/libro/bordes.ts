import type { Borde, GrosorBorde } from "./tipos";

export type ModoBorde = "todos" | "contorno" | "interior" | "arriba" | "abajo" | "izquierda" | "derecha" | "quitar";

export function bordeActivo(borde?: Borde | null): Borde | undefined {
  if (!borde) return undefined;
  if (!borde.arriba && !borde.derecha && !borde.abajo && !borde.izquierda) return undefined;
  return borde;
}

export function bordeParaCelda(
  actual: Borde | undefined,
  modo: ModoBorde,
  lugar: { fila: number; col: number; f1: number; c1: number; f2: number; c2: number },
  color: string,
  grosor: GrosorBorde,
): Borde | undefined {
  if (modo === "quitar") return undefined;
  const base: Borde = {
    arriba: actual?.arriba,
    derecha: actual?.derecha,
    abajo: actual?.abajo,
    izquierda: actual?.izquierda,
    color,
    grosor,
  };
  const { fila, col, f1, c1, f2, c2 } = lugar;
  if (modo === "todos") return { ...base, arriba: true, derecha: true, abajo: true, izquierda: true };
  if (modo === "contorno") {
    return bordeActivo({
      ...base,
      arriba: fila === f1 || Boolean(base.arriba),
      abajo: fila === f2 || Boolean(base.abajo),
      izquierda: col === c1 || Boolean(base.izquierda),
      derecha: col === c2 || Boolean(base.derecha),
    });
  }
  if (modo === "interior") {
    return bordeActivo({
      ...base,
      arriba: fila > f1 || base.arriba,
      abajo: fila < f2 || base.abajo,
      izquierda: col > c1 || base.izquierda,
      derecha: col < c2 || base.derecha,
    });
  }
  return bordeActivo({ ...base, [modo]: true });
}

export function estiloBorde(borde?: Borde): {
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
} {
  const activo = bordeActivo(borde);
  if (!activo) return {};
  const px = activo.grosor === "grueso" ? 3 : activo.grosor === "medio" ? 2 : 1;
  const color = activo.color || "#152238";
  const trazo = `${px}px solid ${color}`;
  return {
    borderTop: activo.arriba ? trazo : undefined,
    borderRight: activo.derecha ? trazo : undefined,
    borderBottom: activo.abajo ? trazo : undefined,
    borderLeft: activo.izquierda ? trazo : undefined,
  };
}
