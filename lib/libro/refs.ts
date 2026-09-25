export function indiceAColumna(indice: number): string {
  let n = indice + 1;
  let letras = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

export function columnaAIndice(letras: string): number {
  let n = 0;
  const u = letras.toUpperCase();
  for (let i = 0; i < u.length; i++) {
    n = n * 26 + (u.charCodeAt(i) - 64);
  }
  return n - 1;
}

export type Referencia = {
  fila: number;
  columna: number;
  filaAbs: boolean;
  colAbs: boolean;
};

const REF = /^(\$?)([A-Z]+)(\$?)(\d+)$/i;

export function parsearReferencia(texto: string): Referencia | null {
  const m = REF.exec(texto.trim());
  if (!m) return null;
  const columna = columnaAIndice(m[2]);
  const fila = Number(m[4]) - 1;
  if (fila < 0 || columna < 0) return null;
  return { fila, columna, colAbs: m[1] === "$", filaAbs: m[3] === "$" };
}

export function escribirReferencia(ref: Referencia): string {
  const col = `${ref.colAbs ? "$" : ""}${indiceAColumna(ref.columna)}`;
  const fila = `${ref.filaAbs ? "$" : ""}${ref.fila + 1}`;
  return col + fila;
}

export function desplazarFormula(formula: string, dFila: number, dCol: number): string {
  if (!formula.startsWith("=")) return formula;
  return formula.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (todo, colAbs, letras, filaAbs, num) => {
    const ref = parsearReferencia(`${colAbs}${letras}${filaAbs}${num}`);
    if (!ref) return todo;
    const fila = ref.filaAbs ? ref.fila : ref.fila + dFila;
    const columna = ref.colAbs ? ref.columna : ref.columna + dCol;
    if (fila < 0 || columna < 0) return "#REF";
    return escribirReferencia({ ...ref, fila, columna });
  });
}
