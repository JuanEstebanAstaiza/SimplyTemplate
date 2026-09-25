import { NextResponse } from "next/server";
import { conUsuario } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AccionError } from "@/lib/errores";
import { crearPlantilla } from "@/lib/folios/servicio";
import { calcularLibro } from "@/lib/libro/aplicar";
import { libroVacio } from "@/lib/libro/vacio";
import { leerCsv, leerExcel } from "@/lib/libros/leer";
import { conError } from "@/lib/rutas";
import { guardarBinario } from "@/lib/storage";
import { finDiaBogota, inicioDiaBogota } from "@/lib/vigencia";
import { passwordSchema } from "@/lib/validacion";

export async function POST(request: Request) {
  return conError(async () => {
    const autor = await conUsuario();
    const form = await request.formData();
    const nombre = String(form.get("nombre") || "").trim();
    if (nombre.length < 3) throw new AccionError("Escriba el nombre de la plantilla.");
    const inicio = String(form.get("vigenciaInicio") || "");
    const fin = String(form.get("vigenciaFin") || "");
    if (!inicio || !fin) throw new AccionError("Indique la vigencia.");
    let estado = libroVacio();
    let tipo: "CREACION" | "IMPORTACION" = "CREACION";
    let libroOriginalId: string | undefined;
    let libroOriginalNombre = "";
    let tieneMacros = false;
    let tieneTablaDinamica = false;
    const archivo = form.get("archivo");
    if (archivo instanceof File && archivo.size) {
      if (archivo.size > Number(process.env.MAX_UPLOAD_BYTES || 15_728_640)) {
        throw new AccionError("El archivo supera el tamaño permitido.");
      }
      const buffer = Buffer.from(await archivo.arrayBuffer());
      const minuscula = archivo.name.toLowerCase();
      if (minuscula.endsWith(".csv")) {
        estado = leerCsv(buffer.toString("utf8"), String(form.get("separador") || ""));
      } else if (minuscula.endsWith(".xlsx") || minuscula.endsWith(".xlsm")) {
        const leido = await leerExcel(buffer);
        estado = leido.estado;
        tieneMacros = leido.tieneMacros;
        tieneTablaDinamica = leido.tieneTablaDinamica;
        const guardado = await guardarBinario(archivo.name, archivo.type || "application/octet-stream", buffer);
        libroOriginalId = guardado.id;
        libroOriginalNombre = archivo.name;
      } else {
        throw new AccionError("Cargue un archivo xlsx, xlsm o csv.");
      }
      estado = calcularLibro(estado);
      tipo = "IMPORTACION";
    }
    let periodoId: string | undefined;
    const nombrePeriodo = String(form.get("periodoNombre") || "").trim();
    if (nombrePeriodo) {
      const periodo = await prisma.periodo.create({
        data: {
          nombre: nombrePeriodo,
          nivel: String(form.get("periodoNivel") || "OTRA"),
          fechaInicio: inicioDiaBogota(String(form.get("periodoInicio") || inicio)),
          fechaFin: finDiaBogota(String(form.get("periodoFin") || fin)),
          mandatario: String(form.get("mandatario") || ""),
        },
      });
      periodoId = periodo.id;
    }
    const id = await crearPlantilla({
      autor,
      password: passwordSchema.parse(form.get("password")),
      nombre,
      descripcion: String(form.get("descripcion") || ""),
      vigenciaInicio: inicioDiaBogota(inicio),
      vigenciaFin: finDiaBogota(fin),
      periodoId,
      exigeContrafirma: form.get("exigeContrafirma") === "on" || form.get("exigeContrafirma") === "true",
      estado,
      tipo,
      resumen: tipo === "IMPORTACION" ? "Cargue inicial de la plantilla" : "Creación de la plantilla",
      libroOriginalId,
      libroOriginalNombre,
      tieneMacros,
      tieneTablaDinamica,
    });
    return NextResponse.json({ id });
  });
}
