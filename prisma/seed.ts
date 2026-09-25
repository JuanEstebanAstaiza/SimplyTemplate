import { hashPassword } from "../lib/auth/password";
import { prisma } from "../lib/db";
import { cerrarMongo } from "../lib/mongo";
import { crearPlantilla } from "../lib/folios/servicio";
import { aplicarTodas } from "../lib/libro/aplicar";
import type { Operacion } from "../lib/libro/tipos";
import { libroVacio } from "../lib/libro/vacio";
import { finDiaBogota, inicioDiaBogota } from "../lib/vigencia";

const clave = "Demo1234";

async function main() {
  if (await prisma.entidad.count()) {
    console.log("Ya hay una entidad. No se cargó la demostración.");
    return;
  }
  await prisma.entidad.create({
    data: {
      nombre: "Alcaldía de Ejemplo",
      nit: "900000000",
      nivel: "ALCALDIA",
      municipio: "Ejemplo",
      departamento: "Ejemplo",
    },
  });
  const personas = [
    ["1000000001", "Ana Administradora", "ana@ejemplo.gov.co", "Secretaria de planeación", "Planeación", "ADMINISTRADOR"],
    ["1000000002", "Luis Editor", "luis@ejemplo.gov.co", "Profesional", "Planeación", "EDITOR"],
    ["1000000003", "María Revisor", "maria@ejemplo.gov.co", "Jefe de oficina", "Planeación", "REVISOR"],
    ["1000000004", "Pedro Auditor", "pedro@ejemplo.gov.co", "Control interno", "Control interno", "AUDITOR"],
  ] as const;
  const passwordHash = await hashPassword(clave);
  const usuarios = [];
  for (const [cedula, nombre, correo, cargo, dependencia, rol] of personas) {
    usuarios.push(
      await prisma.usuario.create({
        data: { cedula, nombre, correo, cargo, dependencia, rol, passwordHash },
      }),
    );
  }
  const base = libroVacio();
  const hoja = base.hojas[0];
  hoja.nombre = "Metas";
  const filas = [
    ["Línea", "Meta", "Ejecución"],
    ["Salud", "Ampliar cobertura", "0.42"],
    ["Educación", "Mejorar permanencia", "0.18"],
  ];
  const ops: Operacion[] = filas.flatMap((fila, f) =>
    fila.map((valor, c) => ({
      tipo: "SET_CELL" as const,
      hojaId: hoja.id,
      filaId: hoja.filaIds[f],
      colId: hoja.colIds[c],
      valor,
      formula: "",
      formato: c === 2 && f > 0 ? ("porcentaje" as const) : undefined,
      negrita: f === 0,
      justificacion: "Cargue inicial de la plantilla de demostración.",
    })),
  );
  const estado = aplicarTodas(base, [
    ...ops,
    {
      tipo: "SET_ZONE",
      justificacion: "La ejecución presupuestal exige soporte.",
      zona: {
        id: "zona-ejecucion",
        hojaId: hoja.id,
        filaIdInicio: hoja.filaIds[1],
        filaIdFin: hoja.filaIds[2],
        colIdInicio: hoja.colIds[2],
        colIdFin: hoja.colIds[2],
        minSoportes: 1,
        descripcion: "Porcentaje de ejecución",
      },
    },
  ]);
  await crearPlantilla({
    autor: usuarios[0],
    password: clave,
    nombre: "Plan de desarrollo",
    descripcion: "Metas de resultado de la demostración.",
    vigenciaInicio: inicioDiaBogota("2024-01-01"),
    vigenciaFin: finDiaBogota("2027-12-31"),
    exigeContrafirma: false,
    estado,
    tipo: "CREACION",
    resumen: "Cargue inicial de la plantilla",
  });
  console.log("Demostración lista. Cédulas 1000000001 a 1000000004, contraseña Demo1234.");
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
