import { randomUUID } from "node:crypto";
import { Prisma, type Usuario } from "@prisma/client";
import { contarCasillas, textoContrafirma, textoContrafirmaPendiente, textoDevolucion, textoRadicacion } from "../avisos/texto";
import { puede, type Rol } from "../authz";
import { prisma } from "../db";
import { AccionError } from "../errores";
import { verificarPassword } from "../auth/password";
import { GENESIS, hashEstado, hashFolio } from "./hash";
import { aplicar } from "../libro/aplicar";
import { plano } from "../libro/canonica";
import type { EstadoLibro, Operacion } from "../libro/tipos";
import { libroVacio } from "../libro/vacio";
import { minSoportes } from "../libro/zonas";
import { guardarEstado, guardarFirma, leerEstado, sellarFirma } from "../storage";
import { justificacionSchema } from "../validacion";
import { dentroDeVigencia } from "../vigencia";

const TIPOS = new Set([
  "SET_CELL",
  "MERGE",
  "UNMERGE",
  "INSERT_ROW",
  "INSERT_COL",
  "ARCHIVE_ROW",
  "ARCHIVE_COL",
  "ADD_SHEET",
  "SET_ZONE",
  "REMOVE_ZONE",
]);

export function comoOperacion(payload: Prisma.JsonValue, justificacion: string): Operacion {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AccionError("La operación del borrador está incompleta.");
  }
  const op = payload as Operacion;
  if (!TIPOS.has(op.tipo)) throw new AccionError("La operación no es válida.");
  return { ...op, justificacion };
}

async function claveValida(usuario: Usuario, password: string) {
  const ok = await verificarPassword(password, usuario.passwordHash);
  if (!ok) throw new AccionError("La contraseña no coincide.");
}

function asegurarEdicion(plantilla: { estado: string; vigenciaInicio: Date; vigenciaFin: Date }, rol: Rol) {
  if (!puede(rol, "editar")) throw new AccionError("No tiene permiso para editar esta plantilla.", 403);
  if (plantilla.estado === "CERRADA") throw new AccionError("La plantilla está cerrada.");
  if (plantilla.estado === "ACTIVA" && !dentroDeVigencia(plantilla.vigenciaInicio, plantilla.vigenciaFin)) {
    throw new AccionError("La vigencia terminó. Un administrador puede prorrogarla.");
  }
}

export async function repararFirmas() {
  const abiertas = await prisma.folio.findMany({ where: { firmaSellada: false }, take: 20 });
  for (const folio of abiertas) {
    await sellarFirma(folio.mongoFirmaId);
    await prisma.folio.update({ where: { id: folio.id }, data: { firmaSellada: true } });
    await prisma.firmaRef.updateMany({ where: { folioId: folio.id }, data: { sellada: true } });
  }
}

export async function estadoVigente(headFolioId: string | null) {
  if (!headFolioId) return libroVacio();
  const folio = await prisma.folio.findUnique({ where: { id: headFolioId } });
  if (!folio) return libroVacio();
  const estado = await leerEstado<EstadoLibro>(folio.mongoEstadoId);
  if (!estado) throw new AccionError("No se encontró el estado del folio vigente.");
  return estado;
}

async function presenciaDe(usuarioId: string) {
  const actual = await prisma.presenciaActual.findUnique({ where: { usuarioId } });
  return actual?.estado ?? "";
}

async function publicar(
  db: Prisma.TransactionClient,
  input: {
    tipo: "RADICACION" | "DEVOLUCION" | "CONTRAFIRMA_PENDIENTE" | "CONTRAFIRMA" | "RECHAZO";
    actorId: string;
    plantillaId: string;
    folioId: string;
    texto: string;
    cambios?: number;
    casillas?: number;
  },
) {
  const destinatarios = await db.usuario.findMany({
    where: { activo: true, NOT: { id: input.actorId } },
    select: { id: true },
  });
  await db.aviso.create({
    data: {
      tipo: input.tipo,
      actorId: input.actorId,
      plantillaId: input.plantillaId,
      folioId: input.folioId,
      texto: input.texto,
      cambios: input.cambios ?? 0,
      casillas: input.casillas ?? 0,
      destinos: { create: destinatarios.map((usuario) => ({ usuarioId: usuario.id })) },
    },
  });
}

async function dejarFolio(input: {
  plantillaId: string;
  autor: Usuario;
  tipo: "CREACION" | "IMPORTACION" | "EDICION" | "REVERSION" | "EXTENSION_VIGENCIA" | "ACTIVACION" | "CIERRE";
  resumen: string;
  estado: EstadoLibro;
  ops: Operacion[];
  soportesPorOrden: { sha256: string; soporteId?: string }[][];
  revierteFolioId?: string;
  padreId: string | null;
  numero: number;
  hashAnterior: string;
  pendiente?: boolean;
}) {
  const creadoEn = new Date();
  const estado = plano(input.estado);
  const huellaEstado = hashEstado(estado);
  const justificaciones = input.ops.map((op) => op.justificacion);
  const soporteHashes = input.soportesPorOrden.flat().map((item) => item.sha256);
  const huella = hashFolio({
    hashAnterior: input.hashAnterior,
    hashEstado: huellaEstado,
    cedula: input.autor.cedula,
    creadoEn,
    numero: input.numero,
    tipo: input.tipo,
    resumen: input.resumen,
    justificaciones,
    soporteHashes,
  });
  const folioId = randomUUID();
  const mongoEstadoId = await guardarEstado(folioId, estado, huellaEstado);
  const mongoFirmaId = await guardarFirma({
    folioId,
    plantillaId: input.plantillaId,
    numero: input.numero,
    firmante: {
      usuarioId: input.autor.id,
      cedula: input.autor.cedula,
      nombre: input.autor.nombre,
      cargo: input.autor.cargo,
      dependencia: input.autor.dependencia,
      rolFirma: "AUTOR",
    },
    metodo: "CLAVE",
    hashFolio: huella,
    hashEstado: huellaEstado,
    hashAnterior: input.hashAnterior,
    firmadoEn: creadoEn.toISOString(),
    sellada: false,
  });
  const presencia = await presenciaDe(input.autor.id);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.folio.create({
        data: {
          id: folioId,
          plantillaId: input.plantillaId,
          numero: input.numero,
          padreId: input.padreId,
          autorId: input.autor.id,
          cedula: input.autor.cedula,
          nombreAutor: input.autor.nombre,
          cargoAutor: input.autor.cargo,
          dependenciaAutor: input.autor.dependencia,
          creadoEn,
          tipo: input.tipo,
          resumen: input.resumen,
          justificacion: justificaciones.join("\n"),
          revierteFolioId: input.revierteFolioId,
          hashEstado: huellaEstado,
          hashFolio: huella,
          hashAnterior: input.hashAnterior,
          estado: input.pendiente ? "PENDIENTE_FIRMA" : "VIGENTE",
          mongoEstadoId,
          mongoFirmaId,
          presenciaEstado: presencia,
        },
      });
      for (let i = 0; i < input.ops.length; i++) {
        const op = input.ops[i];
        const creada = await tx.folioOperacion.create({
          data: {
            folioId,
            orden: i,
            tipo: op.tipo,
            hojaId: "hojaId" in op ? op.hojaId : op.tipo === "ADD_SHEET" ? op.hoja.id : "",
            filaId: "filaId" in op ? op.filaId : "",
            colId: "colId" in op ? op.colId : "",
            valorNuevo: op.tipo === "SET_CELL" ? op.valor : "",
            formulaNueva: op.tipo === "SET_CELL" ? op.formula : "",
            justificacion: op.justificacion,
            payload: op as unknown as Prisma.InputJsonValue,
          },
        });
        for (const soporte of input.soportesPorOrden[i] ?? []) {
          if (!soporte.soporteId) continue;
          await tx.soporteMeta.update({
            where: { id: soporte.soporteId },
            data: { borradorOpId: null, folioOpId: creada.id, folioId },
          });
        }
      }
      await tx.firmaRef.create({
        data: {
          folioId,
          usuarioId: input.autor.id,
          rolFirma: "AUTOR",
          mongoId: mongoFirmaId,
          hashFirmado: huella,
          firmadoEn: creadoEn,
        },
      });
      if (!input.pendiente) {
        await tx.plantilla.update({ where: { id: input.plantillaId }, data: { headFolioId: folioId } });
      }
    });
  } catch (error) {
    throw error;
  }
  await sellarFirma(mongoFirmaId);
  await prisma.folio.update({ where: { id: folioId }, data: { firmaSellada: true } });
  await prisma.firmaRef.updateMany({ where: { folioId }, data: { sellada: true } });
  return { folioId, numero: input.numero, pendiente: Boolean(input.pendiente) };
}

export async function crearPlantilla(input: {
  autor: Usuario;
  password: string;
  nombre: string;
  descripcion: string;
  vigenciaInicio: Date;
  vigenciaFin: Date;
  periodoId?: string;
  exigeContrafirma: boolean;
  estado: EstadoLibro;
  tipo: "CREACION" | "IMPORTACION";
  resumen: string;
  libroOriginalId?: string;
  libroOriginalNombre?: string;
  tieneMacros?: boolean;
  tieneTablaDinamica?: boolean;
}) {
  await repararFirmas();
  await claveValida(input.autor, input.password);
  if (!puede(input.autor.rol, "editar")) throw new AccionError("No tiene permiso para crear plantillas.", 403);
  const plantilla = await prisma.plantilla.create({
    data: {
      nombre: input.nombre,
      descripcion: input.descripcion,
      vigenciaInicio: input.vigenciaInicio,
      vigenciaFin: input.vigenciaFin,
      periodoId: input.periodoId,
      exigeContrafirma: input.exigeContrafirma,
      creadoPorId: input.autor.id,
      libroOriginalId: input.libroOriginalId,
      libroOriginalNombre: input.libroOriginalNombre ?? "",
      tieneMacros: Boolean(input.tieneMacros),
      tieneTablaDinamica: Boolean(input.tieneTablaDinamica),
    },
  });
  const resultado = await dejarFolio({
    plantillaId: plantilla.id,
    autor: input.autor,
    tipo: input.tipo,
    resumen: input.resumen,
    estado: input.estado,
    ops: [],
    soportesPorOrden: [],
    padreId: null,
    numero: 1,
    hashAnterior: GENESIS,
  });
  await prisma.$transaction((tx) =>
    publicar(tx, {
      tipo: "RADICACION",
      actorId: input.autor.id,
      plantillaId: plantilla.id,
      folioId: resultado.folioId,
      texto: `${input.autor.nombre} creó la plantilla ${plantilla.nombre}.`,
      cambios: 1,
      casillas: 0,
    }),
  );
  
  await prisma.bitacora.create({
    data: { usuarioId: input.autor.id, accion: "crear-plantilla", detalle: plantilla.nombre },
  });
  return plantilla.id;
}

async function assertAsignacion(autor: Usuario, plantillaId: string, op: Operacion) {
  if (autor.rol === "ADMINISTRADOR") return;
  const asignadas = await prisma.asignacion.findMany({ where: { plantillaId, usuarioId: autor.id } });
  if (asignadas.length === 0) return;
  if (op.tipo !== "SET_CELL") {
    throw new AccionError("Su trabajo está limitado a las columnas o filas que le asignaron.");
  }
  const permitida = asignadas.some(
    (item) =>
      item.hojaId === op.hojaId &&
      ((item.eje === "COLUMNA" && item.refId === op.colId) || (item.eje === "FILA" && item.refId === op.filaId)),
  );
  if (!permitida) throw new AccionError("Esta casilla no está en las columnas o filas asignadas a su usuario.");
}

export async function anotarOperacion(plantillaId: string, autor: Usuario, op: Operacion) {
  const plantilla = await prisma.plantilla.findUnique({ where: { id: plantillaId } });
  if (!plantilla) throw new AccionError("La plantilla no existe.", 404);
  asegurarEdicion(plantilla, autor.rol);
  await assertAsignacion(autor, plantillaId, op);
  if (op.justificacion) justificacionSchema.parse(op.justificacion);
  let borrador = await prisma.borrador.findUnique({
    where: { plantillaId_autorId: { plantillaId, autorId: autor.id } },
  });
  if (!borrador) {
    borrador = await prisma.borrador.create({
      data: { plantillaId, autorId: autor.id, baseFolioId: plantilla.headFolioId },
    });
  }
  if (op.tipo === "SET_CELL") {
    const previa = await prisma.borradorOperacion.findFirst({
      where: { borradorId: borrador.id, tipo: "SET_CELL", hojaId: op.hojaId, filaId: op.filaId, colId: op.colId },
    });
    const justificacion = op.justificacion || previa?.justificacion || "";
    const payload = { ...op, justificacion } as unknown as Prisma.InputJsonValue;
    if (previa) {
      await prisma.borradorOperacion.update({
        where: { id: previa.id },
        data: { valorNuevo: op.valor, formulaNueva: op.formula, justificacion, payload },
      });
      return previa.id;
    }
  }
  const orden = await prisma.borradorOperacion.count({ where: { borradorId: borrador.id } });
  const creada = await prisma.borradorOperacion.create({
    data: {
      borradorId: borrador.id,
      orden,
      tipo: op.tipo,
      hojaId: "hojaId" in op ? op.hojaId : op.tipo === "ADD_SHEET" ? op.hoja.id : "",
      filaId: "filaId" in op ? op.filaId : "",
      colId: "colId" in op ? op.colId : "",
      valorNuevo: op.tipo === "SET_CELL" ? op.valor : "",
      formulaNueva: op.tipo === "SET_CELL" ? op.formula : "",
      justificacion: op.justificacion,
      payload: op as unknown as Prisma.InputJsonValue,
    },
  });
  return creada.id;
}

export async function justificarOperacion(plantillaId: string, autorId: string, opId: string, justificacion: string) {
  justificacionSchema.parse(justificacion);
  const op = await prisma.borradorOperacion.findFirst({
    where: { id: opId, borrador: { plantillaId, autorId } },
  });
  if (!op) throw new AccionError("El cambio no está en su borrador.");
  const actual = comoOperacion(op.payload, justificacion);
  await prisma.borradorOperacion.update({
    where: { id: opId },
    data: { justificacion, payload: actual as unknown as Prisma.InputJsonValue },
  });
}

export async function tomarFolioVigente(plantillaId: string, autorId: string) {
  const plantilla = await prisma.plantilla.findUnique({ where: { id: plantillaId } });
  if (!plantilla) throw new AccionError("La plantilla no existe.", 404);
  await prisma.borrador.update({
    where: { plantillaId_autorId: { plantillaId, autorId } },
    data: { baseFolioId: plantilla.headFolioId },
  });
}

export async function descartarBorrador(plantillaId: string, autorId: string) {
  await prisma.borrador.deleteMany({ where: { plantillaId, autorId } });
}

export async function radicar(plantillaId: string, autor: Usuario, password: string, resumen: string) {
  await repararFirmas();
  await claveValida(autor, password);
  const plantilla = await prisma.plantilla.findUnique({ where: { id: plantillaId } });
  if (!plantilla) throw new AccionError("La plantilla no existe.", 404);
  asegurarEdicion(plantilla, autor.rol);
  const borrador = await prisma.borrador.findUnique({
    where: { plantillaId_autorId: { plantillaId, autorId: autor.id } },
    include: { operaciones: { orderBy: { orden: "asc" }, include: { soportes: true } } },
  });
  if (!borrador || borrador.operaciones.length === 0) throw new AccionError("No hay cambios para radicar.");
  if ((borrador.baseFolioId ?? null) !== (plantilla.headFolioId ?? null)) {
    throw new AccionError("Alguien radicó otro folio. Tome el folio vigente y revise sus cambios.");
  }
  const base = await estadoVigente(plantilla.headFolioId);
  const ops = borrador.operaciones.map((row) => comoOperacion(row.payload, row.justificacion));
  let cursor = base;
  for (const op of ops) {
    await assertAsignacion(autor, plantillaId, op);
    justificacionSchema.parse(op.justificacion);
    cursor = aplicar(cursor, op);
  }
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.tipo !== "SET_CELL") continue;
    const hoja = cursor.hojas.find((item) => item.id === op.hojaId);
    if (!hoja) continue;
    const minimo = minSoportes(cursor, hoja, op.filaId, op.colId);
    if (borrador.operaciones[i].soportes.length < minimo) {
      throw new AccionError(`La casilla exige al menos ${minimo} soporte(s).`);
    }
  }
  const padre = plantilla.headFolioId
    ? await prisma.folio.findUnique({ where: { id: plantilla.headFolioId } })
    : null;
  const numero = (padre?.numero ?? 0) + 1;
  const resultado = await dejarFolio({
    plantillaId,
    autor,
    tipo: "EDICION",
    resumen: resumen.trim() || "Cambios en la hoja",
    estado: cursor,
    ops,
    soportesPorOrden: borrador.operaciones.map((row) => row.soportes.map((item) => ({ sha256: item.sha256, soporteId: item.id }))),
    padreId: padre?.id ?? null,
    numero,
    hashAnterior: padre?.hashFolio ?? GENESIS,
    pendiente: plantilla.exigeContrafirma,
  });
  await prisma.borrador.delete({ where: { id: borrador.id } });
  const cuenta = contarCasillas(ops);
  await prisma.$transaction((tx) =>
    publicar(tx, {
      tipo: plantilla.exigeContrafirma ? "CONTRAFIRMA_PENDIENTE" : "RADICACION",
      actorId: autor.id,
      plantillaId,
      folioId: resultado.folioId,
      texto: plantilla.exigeContrafirma
        ? textoContrafirmaPendiente(autor.nombre, plantilla.nombre)
        : textoRadicacion(autor.nombre, cuenta.cambios, cuenta.casillas, plantilla.nombre),
      cambios: cuenta.cambios,
      casillas: cuenta.casillas,
    }),
  );
  return resultado;
}

export async function devolver(plantillaId: string, autor: Usuario, numero: number, password: string, justificacion: string) {
  await repararFirmas();
  if (!puede(autor.rol, "devolver")) throw new AccionError("No tiene permiso para devolver folios.", 403);
  await claveValida(autor, password);
  justificacionSchema.parse(justificacion);
  const plantilla = await prisma.plantilla.findUnique({ where: { id: plantillaId } });
  if (!plantilla) throw new AccionError("La plantilla no existe.", 404);
  if (plantilla.estado === "CERRADA") throw new AccionError("La plantilla está cerrada.");
  const destino = await prisma.folio.findUnique({ where: { plantillaId_numero: { plantillaId, numero } } });
  if (!destino) throw new AccionError("Ese folio no existe.");
  const estado = await leerEstado<EstadoLibro>(destino.mongoEstadoId);
  if (!estado) throw new AccionError("No se encontró el estado de ese folio.");
  const padre = plantilla.headFolioId
    ? await prisma.folio.findUnique({ where: { id: plantilla.headFolioId } })
    : null;
  const op: Operacion = {
    tipo: "SET_CELL",
    hojaId: "",
    filaId: "",
    colId: "",
    valor: "",
    formula: "",
    justificacion,
  };
  const resultado = await dejarFolio({
    plantillaId,
    autor,
    tipo: "REVERSION",
    resumen: `Devolución al folio ${numero}`,
    estado,
    ops: [op],
    soportesPorOrden: [[]],
    revierteFolioId: destino.id,
    padreId: padre?.id ?? null,
    numero: (padre?.numero ?? 0) + 1,
    hashAnterior: padre?.hashFolio ?? GENESIS,
  });
  await prisma.$transaction((tx) =>
    publicar(tx, {
      tipo: "DEVOLUCION",
      actorId: autor.id,
      plantillaId,
      folioId: resultado.folioId,
      texto: textoDevolucion(autor.nombre, plantilla.nombre, numero),
      cambios: 1,
      casillas: 0,
    }),
  );
  return resultado;
}

export async function responderFirma(
  plantillaId: string,
  autor: Usuario,
  folioId: string,
  password: string,
  rechazo: boolean,
  justificacion: string,
) {
  if (!puede(autor.rol, "contrafirmar")) throw new AccionError("No tiene permiso para contrafirmar.", 403);
  await claveValida(autor, password);
  if (rechazo) justificacionSchema.parse(justificacion);
  const folio = await prisma.folio.findFirst({ where: { id: folioId, plantillaId } });
  const plantilla = await prisma.plantilla.findUnique({ where: { id: plantillaId } });
  if (!folio || !plantilla) throw new AccionError("El folio no existe.");
  if (folio.estado !== "PENDIENTE_FIRMA") throw new AccionError("Este folio no está pendiente de contrafirma.");
  const mongoId = await guardarFirma({
    folioId: folio.id,
    plantillaId,
    numero: folio.numero,
    firmante: {
      usuarioId: autor.id,
      cedula: autor.cedula,
      nombre: autor.nombre,
      cargo: autor.cargo,
      dependencia: autor.dependencia,
      rolFirma: "CONTRAFIRMA",
    },
    metodo: "CLAVE",
    hashFolio: folio.hashFolio,
    hashEstado: folio.hashEstado,
    hashAnterior: folio.hashAnterior,
    firmadoEn: new Date().toISOString(),
    sellada: true,
  });
  await prisma.$transaction(async (tx) => {
    await tx.firmaRef.create({
      data: {
        folioId: folio.id,
        usuarioId: autor.id,
        rolFirma: "CONTRAFIRMA",
        mongoId,
        hashFirmado: folio.hashFolio,
        sellada: true,
      },
    });
    await tx.folio.update({
      where: { id: folio.id },
      data: { estado: rechazo ? "RECHAZADO" : "VIGENTE" },
    });
    if (!rechazo) await tx.plantilla.update({ where: { id: plantillaId }, data: { headFolioId: folio.id } });
    await publicar(tx, {
      tipo: rechazo ? "RECHAZO" : "CONTRAFIRMA",
      actorId: autor.id,
      plantillaId,
      folioId: folio.id,
      texto: textoContrafirma(autor.nombre, plantilla.nombre, folio.numero, rechazo),
      cambios: 1,
    });
  });
}

export async function moverPlantilla(input: {
  plantillaId: string;
  autor: Usuario;
  password: string;
  justificacion: string;
  accion: "activar" | "cerrar" | "prorrogar";
  vigenciaFin?: Date;
}) {
  if (!puede(input.autor.rol, "vigencia")) throw new AccionError("No tiene permiso para cambiar la vigencia.", 403);
  await claveValida(input.autor, input.password);
  justificacionSchema.parse(input.justificacion);
  const plantilla = await prisma.plantilla.findUnique({ where: { id: input.plantillaId } });
  if (!plantilla?.headFolioId) throw new AccionError("La plantilla no tiene un folio inicial.");
  const padre = await prisma.folio.findUnique({ where: { id: plantilla.headFolioId } });
  if (!padre) throw new AccionError("No se encontró el folio vigente.");
  const estado = await leerEstado<EstadoLibro>(padre.mongoEstadoId);
  if (!estado) throw new AccionError("No se encontró el estado del folio.");
  const tipo = input.accion === "activar" ? "ACTIVACION" : input.accion === "cerrar" ? "CIERRE" : "EXTENSION_VIGENCIA";
  const resumen =
    input.accion === "activar"
      ? "Activación de la plantilla"
      : input.accion === "cerrar"
        ? "Cierre de la plantilla"
        : "Prórroga de la vigencia";
  await dejarFolio({
    plantillaId: plantilla.id,
    autor: input.autor,
    tipo,
    resumen,
    estado,
    ops: [
      {
        tipo: "SET_CELL",
        hojaId: "",
        filaId: "",
        colId: "",
        valor: "",
        formula: "",
        justificacion: input.justificacion,
      },
    ],
    soportesPorOrden: [[]],
    padreId: padre.id,
    numero: padre.numero + 1,
    hashAnterior: padre.hashFolio,
  });
  await prisma.plantilla.update({
    where: { id: plantilla.id },
    data: {
      estado: input.accion === "activar" ? "ACTIVA" : input.accion === "cerrar" ? "CERRADA" : plantilla.estado,
      vigenciaFin: input.vigenciaFin ?? plantilla.vigenciaFin,
    },
  });
  await prisma.bitacora.create({
    data: { usuarioId: input.autor.id, accion: input.accion, detalle: plantilla.nombre },
  });
}

export type ResultadoCadena =
  | { ok: true; folios: number }
  | { ok: false; numero: number; motivo: string };

export async function verificarCadena(plantillaId: string): Promise<ResultadoCadena> {
  const folios = await prisma.folio.findMany({
    where: { plantillaId },
    orderBy: { numero: "asc" },
    include: { operaciones: { orderBy: { orden: "asc" } }, soportes: true },
  });
  let anterior = GENESIS;
  for (const folio of folios) {
    const estado = await leerEstado<EstadoLibro>(folio.mongoEstadoId);
    if (!estado) return { ok: false, numero: folio.numero, motivo: "Falta el estado archivado." };
    if (hashEstado(plano(estado)) !== folio.hashEstado) {
      return { ok: false, numero: folio.numero, motivo: "El estado no coincide con su huella." };
    }
    const recalculada = hashFolio({
      hashAnterior: folio.hashAnterior,
      hashEstado: folio.hashEstado,
      cedula: folio.cedula,
      creadoEn: folio.creadoEn,
      numero: folio.numero,
      tipo: folio.tipo,
      resumen: folio.resumen,
      justificaciones: folio.operaciones.map((op) => op.justificacion),
      soporteHashes: folio.soportes.map((soporte) => soporte.sha256),
    });
    if (recalculada !== folio.hashFolio) {
      return { ok: false, numero: folio.numero, motivo: "La huella del folio no cierra." };
    }
    if (folio.hashAnterior !== anterior) {
      return { ok: false, numero: folio.numero, motivo: "La cadena está partida." };
    }
    anterior = folio.hashFolio;
  }
  return { ok: true, folios: folios.length };
}
