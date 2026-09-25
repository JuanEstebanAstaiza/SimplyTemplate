export const ACCIONES_ATAJO = [
  { id: "negrita", nombre: "Negrita", grupo: "Formato" },
  { id: "texto", nombre: "Texto", grupo: "Formato" },
  { id: "numero", nombre: "Número", grupo: "Formato" },
  { id: "porcentaje", nombre: "Porcentaje", grupo: "Formato" },
  { id: "moneda", nombre: "Moneda", grupo: "Formato" },
  { id: "fecha", nombre: "Fecha", grupo: "Formato" },
  { id: "combinar", nombre: "Combinar celdas", grupo: "Hoja" },
  { id: "separar", nombre: "Separar celdas", grupo: "Hoja" },
  { id: "insertar-fila", nombre: "Insertar fila", grupo: "Hoja" },
  { id: "insertar-columna", nombre: "Insertar columna", grupo: "Hoja" },
  { id: "quitar-color", nombre: "Quitar color", grupo: "Hoja" },
  { id: "bordes-todos", nombre: "Todos los bordes", grupo: "Bordes" },
  { id: "quitar-bordes", nombre: "Quitar bordes", grupo: "Bordes" },
  { id: "por-titulos", nombre: "Vista por títulos", grupo: "Hoja" },
] as const;

export type IdAtajo = (typeof ACCIONES_ATAJO)[number]["id"];

export const ATAJOS_DEFECTO: Record<IdAtajo, string> = {
  negrita: "Ctrl+B",
  texto: "Alt+T",
  numero: "Alt+N",
  porcentaje: "Alt+P",
  moneda: "Alt+M",
  fecha: "Alt+F",
  combinar: "Alt+J",
  separar: "Alt+K",
  "insertar-fila": "Alt+R",
  "insertar-columna": "Alt+C",
  "quitar-color": "Alt+0",
  "bordes-todos": "Alt+E",
  "quitar-bordes": "Alt+Q",
  "por-titulos": "Alt+G",
};

export function mapaEfectivo(guardado: unknown): Record<IdAtajo, string> {
  const mapa = { ...ATAJOS_DEFECTO };
  if (!guardado || typeof guardado !== "object" || Array.isArray(guardado)) return mapa;
  for (const accion of ACCIONES_ATAJO) {
    const valor = (guardado as Record<string, unknown>)[accion.id];
    if (typeof valor === "string" && valor.trim()) mapa[accion.id] = valor.trim();
  }
  return mapa;
}

export function eventoAAtajo(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }) {
  if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return "";
  const partes: string[] = [];
  if (event.ctrlKey || event.metaKey) partes.push("Ctrl");
  if (event.altKey) partes.push("Alt");
  if (event.shiftKey) partes.push("Shift");
  const tecla = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  partes.push(tecla);
  return partes.join("+");
}

export function duplicados(mapa: Record<IdAtajo, string>) {
  const vistos = new Map<string, IdAtajo>();
  const repetidos: IdAtajo[] = [];
  for (const accion of ACCIONES_ATAJO) {
    const tecla = mapa[accion.id];
    const previo = vistos.get(tecla);
    if (previo) repetidos.push(accion.id, previo);
    vistos.set(tecla, accion.id);
  }
  return [...new Set(repetidos)];
}
