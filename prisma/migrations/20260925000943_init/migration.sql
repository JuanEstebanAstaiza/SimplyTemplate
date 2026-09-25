-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'EDITOR', 'REVISOR', 'AUDITOR');

-- CreateEnum
CREATE TYPE "EstadoPlantilla" AS ENUM ('BORRADOR', 'ACTIVA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoFolio" AS ENUM ('PENDIENTE_FIRMA', 'VIGENTE', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoFolio" AS ENUM ('CREACION', 'IMPORTACION', 'EDICION', 'REVERSION', 'EXTENSION_VIGENCIA', 'ACTIVACION', 'CIERRE');

-- CreateEnum
CREATE TYPE "TipoAviso" AS ENUM ('RADICACION', 'DEVOLUCION', 'CONTRAFIRMA_PENDIENTE', 'CONTRAFIRMA', 'RECHAZO');

-- CreateEnum
CREATE TYPE "EstadoPresencia" AS ENUM ('EN_LINEA', 'INACTIVO', 'AUSENTE', 'DESCONECTADO');

-- CreateTable
CREATE TABLE "Entidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "municipio" TEXT NOT NULL DEFAULT '',
    "departamento" TEXT NOT NULL DEFAULT '',
    "minutosEnLinea" INTEGER NOT NULL DEFAULT 2,
    "minutosAusente" INTEGER NOT NULL DEFAULT 15,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fotoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "mandatario" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plantilla" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPlantilla" NOT NULL DEFAULT 'BORRADOR',
    "exigeContrafirma" BOOLEAN NOT NULL DEFAULT false,
    "headFolioId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "libroOriginalId" TEXT,
    "libroOriginalNombre" TEXT NOT NULL DEFAULT '',
    "tieneMacros" BOOLEAN NOT NULL DEFAULT false,
    "tieneTablaDinamica" BOOLEAN NOT NULL DEFAULT false,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folio" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "padreId" TEXT,
    "autorId" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombreAutor" TEXT NOT NULL,
    "cargoAutor" TEXT NOT NULL,
    "dependenciaAutor" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoFolio" NOT NULL,
    "resumen" TEXT NOT NULL,
    "justificacion" TEXT NOT NULL DEFAULT '',
    "revierteFolioId" TEXT,
    "hashEstado" TEXT NOT NULL,
    "hashFolio" TEXT NOT NULL,
    "hashAnterior" TEXT NOT NULL,
    "estado" "EstadoFolio" NOT NULL,
    "mongoEstadoId" TEXT NOT NULL,
    "mongoFirmaId" TEXT NOT NULL,
    "firmaSellada" BOOLEAN NOT NULL DEFAULT false,
    "presenciaEstado" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Folio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioOperacion" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "hojaId" TEXT NOT NULL DEFAULT '',
    "filaId" TEXT NOT NULL DEFAULT '',
    "colId" TEXT NOT NULL DEFAULT '',
    "valorAnterior" TEXT NOT NULL DEFAULT '',
    "valorNuevo" TEXT NOT NULL DEFAULT '',
    "formulaAnterior" TEXT NOT NULL DEFAULT '',
    "formulaNueva" TEXT NOT NULL DEFAULT '',
    "justificacion" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,

    CONSTRAINT "FolioOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrador" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "baseFolioId" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Borrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorradorOperacion" (
    "id" TEXT NOT NULL,
    "borradorId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "hojaId" TEXT NOT NULL DEFAULT '',
    "filaId" TEXT NOT NULL DEFAULT '',
    "colId" TEXT NOT NULL DEFAULT '',
    "valorNuevo" TEXT NOT NULL DEFAULT '',
    "formulaNueva" TEXT NOT NULL DEFAULT '',
    "justificacion" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,

    CONSTRAINT "BorradorOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoporteMeta" (
    "id" TEXT NOT NULL,
    "borradorOpId" TEXT,
    "folioOpId" TEXT,
    "folioId" TEXT,
    "nombreOriginal" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "gridfsId" TEXT NOT NULL,
    "subidoPorId" TEXT NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoporteMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmaRef" (
    "id" TEXT NOT NULL,
    "folioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "rolFirma" TEXT NOT NULL,
    "mongoId" TEXT NOT NULL,
    "hashFirmado" TEXT NOT NULL,
    "firmadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sellada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FirmaRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAviso" NOT NULL,
    "actorId" TEXT NOT NULL,
    "plantillaId" TEXT,
    "folioId" TEXT,
    "texto" TEXT NOT NULL,
    "cambios" INTEGER NOT NULL DEFAULT 0,
    "casillas" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvisoDestino" (
    "id" TEXT NOT NULL,
    "avisoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "leidoEn" TIMESTAMP(3),

    CONSTRAINT "AvisoDestino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenciaActual" (
    "usuarioId" TEXT NOT NULL,
    "estado" "EstadoPresencia" NOT NULL,
    "plantillaId" TEXT NOT NULL DEFAULT '',
    "ultimoLatido" TIMESTAMP(3) NOT NULL,
    "desdeEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresenciaActual_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "PresenciaTramo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" "EstadoPresencia" NOT NULL,
    "plantillaId" TEXT NOT NULL DEFAULT '',
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),

    CONSTRAINT "PresenciaTramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bitacora" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL DEFAULT '',
    "accion" TEXT NOT NULL,
    "detalle" TEXT NOT NULL DEFAULT '',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cedula_key" ON "Usuario"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Folio_plantillaId_creadoEn_idx" ON "Folio"("plantillaId", "creadoEn");

-- CreateIndex
CREATE INDEX "Folio_cedula_idx" ON "Folio"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Folio_plantillaId_numero_key" ON "Folio"("plantillaId", "numero");

-- CreateIndex
CREATE INDEX "FolioOperacion_folioId_idx" ON "FolioOperacion"("folioId");

-- CreateIndex
CREATE UNIQUE INDEX "Borrador_plantillaId_autorId_key" ON "Borrador"("plantillaId", "autorId");

-- CreateIndex
CREATE INDEX "BorradorOperacion_borradorId_idx" ON "BorradorOperacion"("borradorId");

-- CreateIndex
CREATE INDEX "FirmaRef_folioId_idx" ON "FirmaRef"("folioId");

-- CreateIndex
CREATE INDEX "Aviso_creadoEn_idx" ON "Aviso"("creadoEn");

-- CreateIndex
CREATE INDEX "AvisoDestino_usuarioId_leidoEn_idx" ON "AvisoDestino"("usuarioId", "leidoEn");

-- CreateIndex
CREATE UNIQUE INDEX "AvisoDestino_avisoId_usuarioId_key" ON "AvisoDestino"("avisoId", "usuarioId");

-- CreateIndex
CREATE INDEX "PresenciaTramo_usuarioId_inicio_idx" ON "PresenciaTramo"("usuarioId", "inicio");

-- CreateIndex
CREATE INDEX "Bitacora_creadoEn_idx" ON "Bitacora"("creadoEn");

-- AddForeignKey
ALTER TABLE "Plantilla" ADD CONSTRAINT "Plantilla_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folio" ADD CONSTRAINT "Folio_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioOperacion" ADD CONSTRAINT "FolioOperacion_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Borrador" ADD CONSTRAINT "Borrador_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorradorOperacion" ADD CONSTRAINT "BorradorOperacion_borradorId_fkey" FOREIGN KEY ("borradorId") REFERENCES "Borrador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoporteMeta" ADD CONSTRAINT "SoporteMeta_borradorOpId_fkey" FOREIGN KEY ("borradorOpId") REFERENCES "BorradorOperacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoporteMeta" ADD CONSTRAINT "SoporteMeta_folioOpId_fkey" FOREIGN KEY ("folioOpId") REFERENCES "FolioOperacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoporteMeta" ADD CONSTRAINT "SoporteMeta_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmaRef" ADD CONSTRAINT "FirmaRef_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoDestino" ADD CONSTRAINT "AvisoDestino_avisoId_fkey" FOREIGN KEY ("avisoId") REFERENCES "Aviso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
