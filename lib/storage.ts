import { GridFSBucket, ObjectId } from "mongodb";
import { mongoDb } from "./mongo";
import { sha256 } from "./folios/hash";

const BUCKET = "archivos";

async function bucket() {
  const db = await mongoDb();
  return new GridFSBucket(db, { bucketName: BUCKET });
}

export async function guardarBinario(nombre: string, mime: string, buffer: Buffer) {
  const archivos = await bucket();
  const id = new ObjectId();
  await new Promise<void>((resolve, reject) => {
    const stream = archivos.openUploadStreamWithId(id, nombre, {
      contentType: mime,
      metadata: { sha256: sha256(buffer) },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(buffer);
  });
  return { id: id.toHexString(), sha256: sha256(buffer) };
}

export async function leerBinario(id: string): Promise<{ nombre: string; mime: string; buffer: Buffer } | null> {
  if (!ObjectId.isValid(id)) return null;
  const archivos = await bucket();
  const oid = new ObjectId(id);
  const files = await archivos.find({ _id: oid }).toArray();
  const file = files[0];
  if (!file) return null;
  const chunks: Buffer[] = [];
  const stream = archivos.openDownloadStream(oid);
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return {
    nombre: file.filename,
    mime: file.contentType || "application/octet-stream",
    buffer: Buffer.concat(chunks),
  };
}

export async function guardarEstado(folioId: string, estado: unknown, hash: string) {
  const db = await mongoDb();
  const resultado = await db.collection("estados").insertOne({
    folioId,
    hashEstado: hash,
    estado,
    guardadoEn: new Date().toISOString(),
  });
  return resultado.insertedId.toHexString();
}

export async function leerEstado<T>(mongoEstadoId: string): Promise<T | null> {
  if (!ObjectId.isValid(mongoEstadoId)) return null;
  const db = await mongoDb();
  const doc = await db.collection("estados").findOne({ _id: new ObjectId(mongoEstadoId) });
  if (!doc) return null;
  return doc.estado as T;
}

export type DossierFirma = {
  folioId: string;
  plantillaId: string;
  numero: number;
  firmante: {
    usuarioId: string;
    cedula: string;
    nombre: string;
    cargo: string;
    dependencia: string;
    rolFirma: "AUTOR" | "CONTRAFIRMA";
  };
  metodo: "CLAVE";
  hashFolio: string;
  hashEstado: string;
  hashAnterior: string;
  firmadoEn: string;
  sellada: boolean;
};

export async function guardarFirma(firma: DossierFirma) {
  const db = await mongoDb();
  const resultado = await db.collection("firmas").insertOne(firma);
  return resultado.insertedId.toHexString();
}

export async function sellarFirma(mongoId: string) {
  if (!ObjectId.isValid(mongoId)) return;
  const db = await mongoDb();
  await db.collection("firmas").updateOne({ _id: new ObjectId(mongoId) }, { $set: { sellada: true } });
}
