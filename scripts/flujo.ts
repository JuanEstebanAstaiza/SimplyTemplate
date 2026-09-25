import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { cerrarMongo } from "../lib/mongo";
import {
  anotarOperacion,
  devolver,
  estadoVigente,
  radicar,
  verificarCadena,
} from "../lib/folios/servicio";
import { escribirCsv, escribirExcel, inyectarOriginal } from "../lib/libros/escribir";
import { leerCsv, leerExcel } from "../lib/libros/leer";
import { claveCelda } from "../lib/libro/tipos";
import { guardarBinario } from "../lib/storage";
import JSZip from "jszip";

const clave = "Demo1234";

async function main() {
  const editor = await prisma.usuario.findUniqueOrThrow({ where: { cedula: "1000000002" } });
  const revisor = await prisma.usuario.findUniqueOrThrow({ where: { cedula: "1000000003" } });
  const plantilla = await prisma.plantilla.findFirstOrThrow({ where: { nombre: "Plan de desarrollo" } });
  const antes = await estadoVigente(plantilla.headFolioId);
  const hoja = antes.hojas[0];
  const filaId = hoja.filaIds[1];
  const colId = hoja.colIds[2];
  const justificacion = "Se actualiza el porcentaje de ejecución con el corte del trimestre.";
  await anotarOperacion(plantilla.id, editor, {
    tipo: "SET_CELL",
    hojaId: hoja.id,
    filaId,
    colId,
    valor: "0.55",
    formula: "",
    formato: "porcentaje",
    justificacion,
  });
  const accesoRevisor = { cedula: "1000000003", password: clave };
  await assert.rejects(() => radicar(plantilla.id, editor, "Corte del trimestre", accesoRevisor), /soporte/i);

  const op = await prisma.borradorOperacion.findFirstOrThrow({
    where: { borrador: { plantillaId: plantilla.id, autorId: editor.id }, tipo: "SET_CELL" },
  });
  const archivo = await guardarBinario("corte.pdf", "application/pdf", Buffer.from("%PDF-1.4 corte"));
  await prisma.soporteMeta.create({
    data: {
      borradorOpId: op.id,
      nombreOriginal: "corte.pdf",
      mime: "application/pdf",
      bytes: 16,
      sha256: archivo.sha256,
      gridfsId: archivo.id,
      subidoPorId: editor.id,
    },
  });
  await radicar(plantilla.id, editor, "Corte del trimestre", accesoRevisor);

  const aviso = await prisma.aviso.findFirstOrThrow({
    where: { actorId: editor.id, texto: { contains: "1 casilla" } },
    include: { destinos: true },
  });
  assert.equal(aviso.destinos.some((destino) => destino.usuarioId === editor.id), false);
  assert.equal(aviso.casillas, 1);
  assert.match(aviso.texto, /Luis Editor radicó 1 cambio en 1 casilla/);

  await assert.rejects(
    () => devolver(plantilla.id, editor, 1, clave, "Un editor no puede devolver el libro a un folio anterior."),
    /permiso/i,
  );

  const vigente = await prisma.plantilla.findUniqueOrThrow({ where: { id: plantilla.id } });
  const folioNuevo = await prisma.folio.findUniqueOrThrow({ where: { id: vigente.headFolioId! } });
  const devuelto = await devolver(
    plantilla.id,
    revisor,
    1,
    clave,
    "Se devuelve el libro al cargue inicial porque el corte no correspondía.",
  );
  assert.ok(devuelto.numero > folioNuevo.numero);
  const cadena = await verificarCadena(plantilla.id);
  assert.equal(cadena.ok, true);
  const restaurado = await estadoVigente((await prisma.plantilla.findUniqueOrThrow({ where: { id: plantilla.id } })).headFolioId);
  assert.equal(restaurado.hojas[0].celdas[claveCelda(filaId, colId)]?.valor, "0.42");

  const csv = leerCsv("Linea,Valor\nSalud,10\nEducacion,7\n");
  assert.match(escribirCsv(csv), /Salud,10/);
  const xlsx = await escribirExcel(antes);
  const leido = await leerExcel(xlsx);
  assert.equal(leido.estado.hojas[0].combinadas.length, antes.hojas[0].combinadas.length);

  const zip = new JSZip();
  zip.file("xl/vbaProject.bin", Buffer.from("macro"));
  zip.file("[Content_Types].xml", "<Types></Types>");
  zip.file("xl/_rels/workbook.xml.rels", "<Relationships></Relationships>");
  const original = await zip.generateAsync({ type: "nodebuffer" });
  const conMacro = await inyectarOriginal(xlsx, Buffer.from(original));
  const resultado = await JSZip.loadAsync(conMacro);
  assert.ok(resultado.file("xl/vbaProject.bin"));

  console.log("Flujo de folio, aviso, devolución, cadena y Excel en orden.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await cerrarMongo();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await cerrarMongo();
    process.exit(1);
  });
