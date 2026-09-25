-- CreateTable
CREATE TABLE "Asignacion" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "hojaId" TEXT NOT NULL,
    "eje" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Asignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asignacion_plantillaId_hojaId_eje_refId_idx" ON "Asignacion"("plantillaId", "hojaId", "eje", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "Asignacion_plantillaId_usuarioId_hojaId_eje_refId_key" ON "Asignacion"("plantillaId", "usuarioId", "hojaId", "eje", "refId");

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;
