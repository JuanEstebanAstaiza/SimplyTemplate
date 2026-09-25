export function Simbolo({ invert = false, celda = 8 }: { invert?: boolean; celda?: number }) {
  const laton = "#B38B4D";
  const tallo = invert ? "#F7F6F2" : "#152238";
  const vacio = invert ? "transparent" : "transparent";
  const borde = invert ? "#33425E" : "#DCE0E6";
  const celdas = [
    laton, laton, laton,
    vacio, tallo, vacio,
    vacio, tallo, vacio,
  ];
  const gap = Math.max(1, Math.round(celda / 6));
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0"
      style={{ gridTemplateColumns: `repeat(3, ${celda}px)`, gap }}
    >
      {celdas.map((color, indice) => (
        <span
          key={indice}
          style={{
            width: celda,
            height: celda,
            background: color,
            border: color === "transparent" ? `1px solid ${borde}` : undefined,
          }}
        />
      ))}
    </span>
  );
}

export function Marca({
  invert = false,
  compacta = false,
}: {
  invert?: boolean;
  compacta?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${invert ? "text-paper" : "text-ink"}`}>
      <Simbolo invert={invert} celda={compacta ? 6 : 8} />
      {compacta ? null : (
        <span className="font-display text-[22px] leading-none font-medium">
          Simply<span className="font-normal italic">Template</span>
        </span>
      )}
    </span>
  );
}
