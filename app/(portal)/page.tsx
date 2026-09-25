import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Estado } from "@/components/Estado";
import { usuarioActual } from "@/lib/auth/session";
import { puede } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { fechaCortaBogota, formatoBogota } from "@/lib/vigencia";

export default async function InicioPage() {
  const usuario = await usuarioActual();
  const plantillas = await prisma.plantilla.findMany({ orderBy: { creadaEn: "desc" } });
  const folios = await prisma.folio.findMany({ orderBy: { creadoEn: "desc" }, take: 8, include: { plantilla: true } });
  const presentes = puede(usuario!.rol, "presencia")
    ? await prisma.presenciaActual.findMany({ where: { estado: "EN_LINEA" } })
    : [];
  const gente = presentes.length
    ? await prisma.usuario.findMany({ where: { id: { in: presentes.map((item) => item.usuarioId) } } })
    : [];
  return (
    <main>
      <h1 className="font-display text-4xl">Plantillas</h1>
      <p className="mt-2 max-w-2xl text-graphite">
        Varias plantillas pueden estar activas al tiempo. Cada una conserva su vigencia y su cadena de folios.
      </p>
      {gente.length ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {gente.map((persona) => (
            <span key={persona.id} className="inline-flex items-center gap-2 border border-rule bg-card px-2 py-1 text-sm">
              <Avatar nombre={persona.nombre} fotoId={persona.fotoId} size={28} />
              {persona.nombre} está en línea
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {plantillas.map((plantilla) => (
          <Link key={plantilla.id} href={`/plantillas/${plantilla.id}`} className="border border-rule border-t-[3px] border-t-brass bg-card p-4 no-underline">
            <Estado valor={plantilla.estado} />
            <h2 className="mt-2 font-display text-2xl text-ink">{plantilla.nombre}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {fechaCortaBogota(plantilla.vigenciaInicio)} – {fechaCortaBogota(plantilla.vigenciaFin)}
            </p>
          </Link>
        ))}
        {plantillas.length === 0 ? <p>Todavía no hay plantillas. Cree la primera desde Nueva plantilla.</p> : null}
      </div>
      <h2 className="mt-10 font-display text-2xl">Folios recientes</h2>
      <ul className="mt-3 space-y-2">
        {folios.map((folio) => (
          <li key={folio.id} className="text-sm">
            <Link href={`/plantillas/${folio.plantillaId}/folios/${folio.numero}`} className="underline">
              Folio {folio.numero} de {folio.plantilla.nombre}
            </Link>
            <span className="text-ink-soft">
              {" "}
              · {folio.nombreAutor} · {folio.cedula} · {formatoBogota(folio.creadoEn)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
