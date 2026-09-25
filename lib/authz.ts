export type Rol = "ADMINISTRADOR" | "EDITOR" | "REVISOR" | "AUDITOR";

export type Accion =
  | "editar"
  | "contrafirmar"
  | "devolver"
  | "vigencia"
  | "usuarios"
  | "presencia"
  | "leer";

const matriz: Record<Accion, Rol[]> = {
  editar: ["ADMINISTRADOR", "EDITOR", "REVISOR"],
  contrafirmar: ["ADMINISTRADOR", "REVISOR"],
  devolver: ["ADMINISTRADOR", "REVISOR"],
  vigencia: ["ADMINISTRADOR"],
  usuarios: ["ADMINISTRADOR"],
  presencia: ["ADMINISTRADOR"],
  leer: ["ADMINISTRADOR", "EDITOR", "REVISOR", "AUDITOR"],
};

export function puede(rol: Rol, accion: Accion) {
  return matriz[accion].includes(rol);
}

export const etiquetaRol: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  EDITOR: "Editor",
  REVISOR: "Revisor",
  AUDITOR: "Auditor",
};
