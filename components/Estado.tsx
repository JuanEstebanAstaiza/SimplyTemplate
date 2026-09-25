const colores: Record<string, string> = {
  BORRADOR: "#6B7482",
  ACTIVA: "#2F6B4F",
  CERRADA: "transparent",
  PENDIENTE_FIRMA: "#2B6CB0",
  VIGENTE: "#2F6B4F",
  RECHAZADO: "#A23B3B",
};

const etiquetas: Record<string, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  CERRADA: "Archivada",
  PENDIENTE_FIRMA: "En validación",
  VIGENTE: "Vigente",
  RECHAZADO: "Con observaciones",
};

export function Estado({ valor }: { valor: string }) {
  const color = colores[valor] ?? "#6B7482";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-graphite">
      <span
        className="inline-block h-2 w-2"
        style={{
          background: color,
          border: color === "transparent" ? "1px solid #6B7482" : undefined,
        }}
      />
      {etiquetas[valor] ?? valor}
    </span>
  );
}
