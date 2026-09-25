async function main() {
const base = "http://127.0.0.1:3000";

async function entrar(cedula: string) {
  const respuesta = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula, password: "Demo1234" }),
  });
  if (!respuesta.ok) throw new Error(await respuesta.text());
  const cookie = respuesta.headers.getSetCookie?.() ?? [];
  const crudo = cookie.length ? cookie : [respuesta.headers.get("set-cookie") || ""];
  const sesion = crudo.map((item) => item.split(";")[0]).find((item) => item.startsWith("st_session="));
  if (!sesion) throw new Error("Sin cookie");
  return sesion;
}

async function pagina(ruta: string, cookie?: string) {
  const respuesta = await fetch(`${base}${ruta}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, texto, location: respuesta.headers.get("location") };
}

const login = await pagina("/login");
if (login.status !== 200 || !login.texto.includes("Simply") || !login.texto.includes("Template")) {
  throw new Error(`Login ${login.status}`);
}
const editor = await entrar("1000000002");
const inicio = await pagina("/", editor);
if (!inicio.texto.includes("Plan de desarrollo") || !inicio.texto.includes("border-t-brass")) {
  throw new Error("El inicio no muestra la plantilla con la marca");
}
const id = inicio.texto.match(/\/plantillas\/(?!nueva\b)([a-z0-9]+)/)?.[1];
if (!id) throw new Error("No encontré el id de la plantilla");
const hoja = await pagina(`/plantillas/${id}`, editor);
if (!hoja.texto.includes("Salud") || !hoja.texto.includes("42")) {
  throw new Error("La hoja no renderizó la meta ni el porcentaje");
}
const auditoria = await pagina("/auditoria", editor);
if (!auditoria.texto.includes("Auditoría")) throw new Error("Auditoría no cargó");
const usuarios = await pagina("/usuarios", editor);
if (usuarios.status !== 307 && usuarios.status !== 302) {
  throw new Error(`El editor no fue desviado de funcionarios: ${usuarios.status}`);
}
const admin = await entrar("1000000001");
const ficha = await pagina("/usuarios", admin);
if (!ficha.texto.includes("Ana Administradora") || !ficha.texto.includes("Crear funcionario")) {
  throw new Error("La ficha de funcionarios no cargó");
}
const presencia = await pagina("/api/presencia", admin);
if (presencia.status !== 200) throw new Error(`Presencia ${presencia.status} ${presencia.texto}`);
const historial = await pagina(`/plantillas/${id}/historial`, editor);
if (!historial.texto.includes("La cadena cierra")) throw new Error(historial.texto.slice(0, 400));
const folio = await pagina(`/plantillas/${id}/folios/1`, editor);
if (!folio.texto.includes("Folio") || !folio.texto.includes("Ana Administradora")) throw new Error("El folio 1 no abrió");
const nueva = await pagina("/plantillas/nueva", editor);
if (!nueva.texto.includes("Nueva plantilla")) throw new Error("El cargue no abrió");
console.log("Páginas de entrada, hoja, auditoría, funcionarios, presencia, historial y folio responden.");
}

main();
