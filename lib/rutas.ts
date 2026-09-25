import { responderError } from "./api";

export async function conError(accion: () => Promise<Response>) {
  try {
    return await accion();
  } catch (error) {
    return responderError(error);
  }
}
