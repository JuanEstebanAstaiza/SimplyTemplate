export function Avatar({
  nombre,
  fotoId,
  size = 36,
}: {
  nombre: string;
  fotoId?: string | null;
  size?: number;
}) {
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
  if (fotoId) {
    return (
      <img
        src={`/api/fotos/${fotoId}`}
        alt=""
        width={size}
        height={size}
        className="rounded-[3px] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-[3px] bg-ink text-xs font-semibold text-paper"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {iniciales || "?"}
    </span>
  );
}
