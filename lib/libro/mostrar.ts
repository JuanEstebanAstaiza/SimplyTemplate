import { formulaSoportada } from "./formulas";
import type { Celda } from "./tipos";

export function mostrar(celda?: Celda) {
  if (!celda) return "";
  if (celda.formula && !formulaSoportada(celda.formula)) {
    return celda.valor || celda.formula;
  }
  const n = Number(celda.valor);
  const numerico = celda.valor !== "" && !Number.isNaN(n);
  if (celda.formato === "porcentaje" && numerico) {
    return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n * 100)} %`;
  }
  if (celda.formato === "moneda" && numerico) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);
  }
  if (celda.formato === "numero" && numerico) {
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(n);
  }
  return celda.valor;
}
