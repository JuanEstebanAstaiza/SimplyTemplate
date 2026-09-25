import Link from "next/link";

export type NodoArbol = {
  id: string;
  plantillaId: string;
  numero: number;
  resumen: string;
  autor: string;
  cedula: string;
  cuando: string;
  hashCorto: string;
  esCabeza: boolean;
  ramas: { titulo: string; cambios: { etiqueta: string; antes: string; despues: string }[] }[];
};

const TINTAS = ["#2B4A7A", "#B38B4D", "#2F6B4F", "#A23B3B", "#6B7482"];

export function ArbolGit({ nombre, nodos }: { nombre: string; nodos: NodoArbol[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl">{nombre}</h2>
      <div className="mt-4 overflow-x-auto">
        <ol className="min-w-[760px]">
          {nodos.map((nodo, indice) => (
            <li key={nodo.id} className="grid grid-cols-[32px_280px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span
                  className="z-10 mt-4 h-4 w-4 rounded-full border-2 border-ink"
                  style={{ background: nodo.esCabeza ? "#B38B4D" : "#F7F6F2" }}
                />
                {indice < nodos.length - 1 ? <span className="w-0.5 flex-1 bg-ink" /> : null}
              </div>
              <article className="mb-5 border border-rule border-l-4 border-l-brass bg-card p-3">
                <Link href={`/plantillas/${nodo.plantillaId}/folios/${nodo.numero}`} className="font-display text-xl text-ink no-underline">
                  Folio {nodo.numero}
                  {nodo.esCabeza ? " · cabeza" : ""}
                </Link>
                <p className="mt-1 text-sm">{nodo.resumen}</p>
                <p className="text-sm text-graphite">
                  {nodo.autor} · {nodo.cedula}
                </p>
                <p className="font-mono text-[11px] text-ink-soft">
                  {nodo.cuando} · {nodo.hashCorto}
                </p>
              </article>
              <div className="mb-5 flex flex-col justify-center gap-2 py-2">
                {nodo.ramas.length === 0 ? <p className="text-sm text-ink-soft">Sin cambios de casilla</p> : null}
                {nodo.ramas.map((rama, ramaIndice) => (
                  <div key={rama.titulo} className="flex items-stretch">
                    <span className="mt-4 h-px w-6" style={{ background: TINTAS[ramaIndice % TINTAS.length] }} />
                    <div
                      className="min-w-0 flex-1 border bg-paper px-3 py-2"
                      style={{ borderColor: TINTAS[ramaIndice % TINTAS.length] }}
                    >
                      <p className="font-display text-lg" style={{ color: TINTAS[ramaIndice % TINTAS.length] }}>
                        {rama.titulo}
                      </p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {rama.cambios.map((cambio) => (
                          <li key={`${cambio.etiqueta}-${cambio.despues}`}>
                            <span className="text-graphite">{cambio.etiqueta}: </span>
                            <span className="text-ink-soft line-through">{cambio.antes || "vacío"}</span>
                            <span> → {cambio.despues || "vacío"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
