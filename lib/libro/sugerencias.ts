export type FuncionFormula = {
  nombre: string;
  firma: string;
  ayuda: string;
};

export const FUNCIONES_FORMULA: FuncionFormula[] = [
  { nombre: "SUM", firma: "SUM(rango)", ayuda: "Suma los números del rango." },
  { nombre: "AVERAGE", firma: "AVERAGE(rango)", ayuda: "Calcula el promedio del rango." },
  { nombre: "MIN", firma: "MIN(rango)", ayuda: "Devuelve el menor valor." },
  { nombre: "MAX", firma: "MAX(rango)", ayuda: "Devuelve el mayor valor." },
  { nombre: "ROUND", firma: "ROUND(número, decimales)", ayuda: "Redondea el número." },
  { nombre: "IF", firma: "IF(condición, si_verdadero, si_falso)", ayuda: "Elige un valor según la condición." },
  { nombre: "AND", firma: "AND(condición1, condición2)", ayuda: "Verdadero solo si todas se cumplen." },
  { nombre: "OR", firma: "OR(condición1, condición2)", ayuda: "Verdadero si alguna se cumple." },
  { nombre: "COUNT", firma: "COUNT(rango)", ayuda: "Cuenta las celdas con número." },
  { nombre: "COUNTA", firma: "COUNTA(rango)", ayuda: "Cuenta las celdas con contenido." },
  { nombre: "SUMIF", firma: "SUMIF(rango, criterio, suma)", ayuda: "Suma las celdas que cumplen el criterio." },
];

export function fragmentoFormula(texto: string, cursor: number) {
  if (!texto.startsWith("=")) return null;
  const hasta = texto.slice(0, Math.max(0, cursor));
  if (/\d$/.test(hasta)) return null;
  const coincidencia = /([A-Za-z]*)$/.exec(hasta);
  if (!coincidencia) return null;
  const fragmento = coincidencia[1].toUpperCase();
  const inicio = hasta.length - coincidencia[1].length;
  const previo = hasta[inicio - 1] ?? "";
  if (fragmento === "" && previo !== "" && !"=(,+-*/".includes(previo)) return null;
  return { inicio, fragmento };
}

export function sugerirFunciones(texto: string, cursor: number) {
  const token = fragmentoFormula(texto, cursor);
  if (!token) return [];
  return FUNCIONES_FORMULA.filter((funcion) => funcion.nombre.startsWith(token.fragmento));
}

export function insertarFuncion(texto: string, cursor: number, nombre: string) {
  const token = fragmentoFormula(texto, cursor);
  const base = texto.startsWith("=") ? texto : `=${texto}`;
  const posicion = token ? token.inicio : base.length;
  const fin = token ? cursor : base.length;
  const siguiente = `${base.slice(0, posicion)}${nombre}(${base.slice(fin)}`;
  return { texto: siguiente, cursor: posicion + nombre.length + 1 };
}
