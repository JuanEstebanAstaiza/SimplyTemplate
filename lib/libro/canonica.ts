function valorCanonico(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(valorCanonico).join(",")}]`;
  const entradas = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${valorCanonico(v)}`).join(",")}}`;
}

export function canonico(value: unknown): string {
  return valorCanonico(value);
}

export function plano<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}
