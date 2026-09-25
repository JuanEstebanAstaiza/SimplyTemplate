export class AccionError extends Error {
  status: number;

  constructor(mensaje: string, status = 400) {
    super(mensaje);
    this.status = status;
  }
}
