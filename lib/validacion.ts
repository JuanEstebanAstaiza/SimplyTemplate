import { z } from "zod";

export const cedulaSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => /^\d{6,10}$/.test(v), "La cédula debe tener entre 6 y 10 dígitos.");

export const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.");

export const justificacionSchema = z
  .string()
  .trim()
  .min(20, "La justificación debe tener al menos 20 caracteres.");

export const fichaSchema = z.object({
  nombre: z.string().trim().min(3, "Escriba el nombre completo."),
  cedula: cedulaSchema,
  correo: z.string().trim().email("Escriba un correo válido."),
  cargo: z.string().trim().min(2, "Escriba el cargo."),
  dependencia: z.string().trim().min(2, "Escriba la dependencia."),
  rol: z.enum(["ADMINISTRADOR", "EDITOR", "REVISOR", "AUDITOR"]),
  password: passwordSchema,
});

export const entidadSchema = z.object({
  nombre: z.string().trim().min(3),
  nit: z.string().trim().min(5),
  nivel: z.enum(["ALCALDIA", "GOBERNACION", "PRESIDENCIA", "OTRA"]),
  municipio: z.string().trim().default(""),
  departamento: z.string().trim().default(""),
});
