import { createHash } from "node:crypto";
import { canonico } from "../libro/canonica";

export function sha256(texto: string | Buffer) {
  return createHash("sha256").update(texto).digest("hex");
}

export function hashEstado(estado: unknown) {
  return sha256(canonico(estado));
}

export function hashFolio(input: {
  hashAnterior: string;
  hashEstado: string;
  cedula: string;
  creadoEn: Date;
  numero: number;
  tipo: string;
  resumen: string;
  justificaciones: string[];
  soporteHashes: string[];
}) {
  const material = [
    input.hashAnterior,
    input.hashEstado,
    input.cedula,
    input.creadoEn.toISOString(),
    String(input.numero),
    input.tipo,
    input.resumen,
    input.justificaciones.join("\n"),
    [...input.soporteHashes].sort().join(","),
  ].join("|");
  return sha256(material);
}

export const GENESIS = "GENESIS";
