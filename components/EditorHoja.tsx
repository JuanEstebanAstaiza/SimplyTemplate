"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CampoFormula } from "@/components/CampoFormula";
import { aplicar, celdaCubierta, extensionAncla } from "@/lib/libro/aplicar";
import { bordeParaCelda, estiloBorde, type ModoBorde } from "@/lib/libro/bordes";
import type { GrosorBorde } from "@/lib/libro/tipos";
import { mostrar } from "@/lib/libro/mostrar";
import { indiceAColumna, desplazarFormula } from "@/lib/libro/refs";
import { resumir, type Agregacion } from "@/lib/libro/resumen";
import { claveCelda, type EstadoLibro, type Formato, type HojaEstado, type Operacion } from "@/lib/libro/tipos";
import { hojaVacia } from "@/lib/libro/vacio";
import { minSoportes } from "@/lib/libro/zonas";

export type OpVista = {
  id: string;
  op: Operacion;
  soportes: { id: string; nombre: string }[];
};

const COLORES_TABLA = ["#F3E6C8", "#D6E2F0", "#D7E8DF", "#F6D6D3", "#E4E7EB", "#B38B4D", "#2B4A7A"];

async function postJson(url: string, body: unknown) {
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await respuesta.json()) as { error?: string; id?: string };
  if (!respuesta.ok) throw new Error(data.error || "No se pudo completar la acción.");
  return data;
}

export function EditorHoja({
  plantillaId,
  estadoInicial,
  operacionesIniciales,
  lectura,
  desfasado,
  tieneMacros,
  tieneTablaDinamica,
  fueraDeVigencia,
  mostrarRadicar = true,
  esAdmin = false,
  limitado = false,
  funcionarios = [],
  asignaciones = [],
}: {
  plantillaId: string;
  estadoInicial: EstadoLibro;
  operacionesIniciales: OpVista[];
  lectura: boolean;
  desfasado: boolean;
  tieneMacros: boolean;
  tieneTablaDinamica: boolean;
  fueraDeVigencia: boolean;
  mostrarRadicar?: boolean;
  esAdmin?: boolean;
  limitado?: boolean;
  funcionarios?: { id: string; nombre: string }[];
  asignaciones?: { hojaId: string; eje: string; refId: string; usuario: string; propia: boolean }[];
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoInicial);
  const [ops, setOps] = useState(operacionesIniciales);
  const vistaRef = useRef(estadoInicial);
  useEffect(() => {
    vistaRef.current = estadoInicial;
    setEstado(estadoInicial);
    setOps(operacionesIniciales);
  }, [estadoInicial, operacionesIniciales]);
  const [hojaIndex, setHojaIndex] = useState(0);
  const [modoVista, setModoVista] = useState<"hoja" | "titulos">("hoja");
  useEffect(() => {
    const soltar = () => {
      arrastre.current = false;
    };
    window.addEventListener("mouseup", soltar);
    return () => window.removeEventListener("mouseup", soltar);
  }, []);
  const [fila, setFila] = useState(0);
  const [col, setCol] = useState(0);
  const [anclaFila, setAnclaFila] = useState(0);
  const [anclaCol, setAnclaCol] = useState(0);
  const arrastre = useRef(false);
  const [propuesta, setPropuesta] = useState<null | { eje: "COLUMNA" | "FILA"; refs: { id: string; etiqueta: string }[] }>(null);
  const [tituloAsignacion, setTituloAsignacion] = useState("");
  const [usuariosAsignados, setUsuariosAsignados] = useState<string[]>([]);
  const [casilla, setCasilla] = useState<null | { fila: number; col: number }>(null);
  const [valorForm, setValorForm] = useState("");
  const [justForm, setJustForm] = useState("");
  const [archivoForm, setArchivoForm] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dialogo, setDialogo] = useState<null | { titulo: string; confirmar: (justificacion: string) => void }>(null);
  const [motivo, setMotivo] = useState("");
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [colorBorde, setColorBorde] = useState("#152238");
  const [grosorBorde, setGrosorBorde] = useState<GrosorBorde>("fino");
  const [cedulaRevisor, setCedulaRevisor] = useState("");
  const [passwordRevisor, setPasswordRevisor] = useState("");
  const [resumenFolio, setResumenFolio] = useState("");
  const hoja = estado.hojas[hojaIndex] ?? estado.hojas[0];

  const seleccion = useMemo(() => {
    if (!hoja) return null;
    const filaId = hoja.filaIds[fila];
    const colId = hoja.colIds[col];
    if (!filaId || !colId) return null;
    return { filaId, colId, celda: hoja.celdas[claveCelda(filaId, colId)] };
  }, [hoja, fila, col]);

  function pedir(titulo: string, confirmar: (justificacion: string) => void) {
    setMotivo("");
    setDialogo({ titulo, confirmar });
  }

  async function guardar(op: Operacion) {
    const previa = vistaRef.current;
    const siguiente = aplicar(previa, op);
    vistaRef.current = siguiente;
    setEstado(siguiente);
    try {
      const data = await postJson(`/api/plantillas/${plantillaId}/borrador`, { op });
      setOps((lista) => {
        if (op.tipo === "SET_CELL") {
          const index = lista.findIndex(
            (item) =>
              item.op.tipo === "SET_CELL" &&
              item.op.hojaId === op.hojaId &&
              item.op.filaId === op.filaId &&
              item.op.colId === op.colId,
          );
          if (index >= 0) {
            const copia = [...lista];
            copia[index] = { ...copia[index], op: { ...op, justificacion: op.justificacion || copia[index].op.justificacion } };
            return copia;
          }
        }
        return [...lista, { id: data.id || "", op, soportes: [] }];
      });
      setError("");
      return data.id || "";
    } catch (causa) {
      vistaRef.current = previa;
      setEstado(previa);
      setError(causa instanceof Error ? causa.message : "No se pudo guardar el cambio.");
      return undefined;
    }
  }

  function abrirCasilla(f: number, c: number) {
    if (!hoja || lectura) return;
    const filaId = hoja.filaIds[f];
    const colId = hoja.colIds[c];
    if (!filaId || !colId) return;
    const celda = hoja.celdas[claveCelda(filaId, colId)];
    const existente = ops.find(
      (item) => item.op.tipo === "SET_CELL" && item.op.hojaId === hoja.id && item.op.filaId === filaId && item.op.colId === colId,
    );
    setFila(f);
    setCol(c);
    setValorForm(f === 0 ? celda?.valor || "" : celda?.formula || celda?.valor || "");
    setJustForm(existente && existente.op.tipo === "SET_CELL" ? existente.op.justificacion : "");
    setArchivoForm(null);
    if (limitado && !puedeCasilla(filaId, colId)) {
      setError("Esta casilla no está entre las columnas o filas asignadas a su usuario.");
      return;
    }
    setCasilla({ fila: f, col: c });
  }

  function puedeCasilla(filaId: string, colId: string) {
    if (!hoja || !limitado) return true;
    return asignaciones.some(
      (item) =>
        item.hojaId === hoja.id &&
        item.propia &&
        ((item.eje === "COLUMNA" && item.refId === colId) || (item.eje === "FILA" && item.refId === filaId)),
    );
  }

  function rango() {
    return {
      f1: Math.min(anclaFila, fila),
      c1: Math.min(anclaCol, col),
      f2: Math.max(anclaFila, fila),
      c2: Math.max(anclaCol, col),
    };
  }

  function combinar() {
    if (!hoja || lectura) return;
    const { f1, c1, f2, c2 } = rango();
    if (f2 === f1 && c2 === c1) {
      setError("Seleccione varias celdas: arrastre o mantenga Mayús y haga clic en la última.");
      return;
    }
    void guardar({
      tipo: "MERGE",
      hojaId: hoja.id,
      filaId: hoja.filaIds[f1],
      colId: hoja.colIds[c1],
      filas: f2 - f1 + 1,
      columnas: c2 - c1 + 1,
      justificacion: "Se combinan las celdas seleccionadas de la plantilla.",
    });
  }

  async function insertar(eje: "COLUMNA" | "FILA") {
    if (!hoja || lectura) return;
    if (eje === "COLUMNA") {
      const colId = crypto.randomUUID();
      const id = await guardar({
        tipo: "INSERT_COL",
        hojaId: hoja.id,
        index: col,
        colId,
        justificacion: "Se inserta una columna en la plantilla.",
      });
      if (!id || !esAdmin) return;
      setTituloAsignacion("");
      setUsuariosAsignados([]);
      setPropuesta({ eje, refs: [{ id: colId, etiqueta: "Columna nueva" }] });
      return;
    }
    const filaId = crypto.randomUUID();
    const id = await guardar({
      tipo: "INSERT_ROW",
      hojaId: hoja.id,
      index: fila,
      filaId,
      justificacion: "Se inserta una fila en la plantilla.",
    });
    if (!id || !esAdmin) return;
    setTituloAsignacion("");
    setUsuariosAsignados([]);
    setPropuesta({ eje, refs: [{ id: filaId, etiqueta: "Fila nueva" }] });
  }

  function prepararAsignacion(eje: "COLUMNA" | "FILA") {
    if (!hoja) return;
    const { f1, c1, f2, c2 } = rango();
    const refs = [];
    if (eje === "COLUMNA") {
      for (let indice = c1; indice <= c2; indice++) {
        const id = hoja.colIds[indice];
        const titulo = hoja.celdas[claveCelda(hoja.filaIds[0], id)]?.valor || indiceAColumna(indice);
        refs.push({ id, etiqueta: titulo });
      }
    } else {
      for (let indice = f1; indice <= f2; indice++) {
        const id = hoja.filaIds[indice];
        const titulo = hoja.celdas[claveCelda(id, hoja.colIds[0])]?.valor || String(indice + 1);
        refs.push({ id, etiqueta: titulo });
      }
    }
    setTituloAsignacion(refs.length === 1 ? refs[0].etiqueta : "");
    setUsuariosAsignados([]);
    setPropuesta({ eje, refs });
  }

  async function confirmarAsignacion() {
    if (!propuesta || !hoja) return;
    if (tituloAsignacion.trim()) {
      for (const ref of propuesta.refs) {
        await guardar(
          propuesta.eje === "COLUMNA"
            ? {
                tipo: "SET_CELL",
                hojaId: hoja.id,
                filaId: hoja.filaIds[0],
                colId: ref.id,
                valor: tituloAsignacion.trim(),
                formula: "",
                negrita: true,
                justificacion: "Se escribe el título de la columna asignada.",
              }
            : {
                tipo: "SET_CELL",
                hojaId: hoja.id,
                filaId: ref.id,
                colId: hoja.colIds[0],
                valor: tituloAsignacion.trim(),
                formula: "",
                negrita: true,
                justificacion: "Se escribe el título de la fila asignada.",
              },
        );
      }
    }
    try {
      await postJson(`/api/plantillas/${plantillaId}/asignaciones`, {
        hojaId: hoja.id,
        eje: propuesta.eje,
        refs: propuesta.refs.map((ref) => ref.id),
        titulo: tituloAsignacion.trim(),
        usuarioIds: usuariosAsignados,
      });
      setPropuesta(null);
      router.refresh();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar la asignación.");
    }
  }

  function cambiarFormato(formato: Formato, negrita?: boolean) {
    if (!hoja || !seleccion || lectura) return;
    if (!puedeCasilla(seleccion.filaId, seleccion.colId)) {
      setError("Esta casilla no está entre las columnas o filas asignadas a su usuario.");
      return;
    }
    const op: Operacion = {
      tipo: "SET_CELL",
      hojaId: hoja.id,
      filaId: seleccion.filaId,
      colId: seleccion.colId,
      valor: seleccion.celda?.valor ?? "",
      formula: seleccion.celda?.formula ?? "",
      formato,
      negrita: negrita ?? seleccion.celda?.negrita,
      relleno: seleccion.celda?.relleno,
      justificacion: "",
    };
    void guardar(op);
  }

  async function pintar(relleno?: string) {
    if (!hoja || lectura) return;
    const { f1, c1, f2, c2 } = rango();
    let aplicadas = 0;
    for (let f = f1; f <= f2; f++) {
      for (let c = c1; c <= c2; c++) {
        const filaId = hoja.filaIds[f];
        const colId = hoja.colIds[c];
        if (!filaId || !colId || celdaCubierta(hoja, filaId, colId) || !puedeCasilla(filaId, colId)) continue;
        const celda = hoja.celdas[claveCelda(filaId, colId)];
        await guardar({
          tipo: "SET_CELL",
          hojaId: hoja.id,
          filaId,
          colId,
          valor: celda?.valor ?? "",
          formula: celda?.formula ?? "",
          formato: celda?.formato,
          negrita: celda?.negrita,
          relleno,
          justificacion: "Se aplica un color de relleno a la casilla.",
        });
        aplicadas += 1;
      }
    }
    if (!aplicadas) setError("No hay celdas de la selección que pueda colorear.");
  }

  async function trazar(modo: ModoBorde) {
    if (!hoja || lectura) return;
    const { f1, c1, f2, c2 } = rango();
    let aplicadas = 0;
    for (let f = f1; f <= f2; f++) {
      for (let c = c1; c <= c2; c++) {
        const filaId = hoja.filaIds[f];
        const colId = hoja.colIds[c];
        if (!filaId || !colId || celdaCubierta(hoja, filaId, colId) || !puedeCasilla(filaId, colId)) continue;
        const celda = hoja.celdas[claveCelda(filaId, colId)];
        const borde = bordeParaCelda(celda?.borde, modo, { fila: f, col: c, f1, c1, f2, c2 }, colorBorde, grosorBorde);
        await guardar({
          tipo: "SET_CELL",
          hojaId: hoja.id,
          filaId,
          colId,
          valor: celda?.valor ?? "",
          formula: celda?.formula ?? "",
          formato: celda?.formato,
          negrita: celda?.negrita,
          relleno: celda?.relleno,
          borde: borde ?? null,
          justificacion: "Se aplica un borde a la casilla.",
        });
        aplicadas += 1;
      }
    }
    if (!aplicadas) setError("No hay celdas de la selección a las que pueda poner borde.");
  }

  async function subirSoporte(id: string, archivo: File) {
    const form = new FormData();
    form.set("opId", id);
    form.set("archivo", archivo);
    const respuesta = await fetch(`/api/plantillas/${plantillaId}/soportes`, { method: "POST", body: form });
    const data = (await respuesta.json()) as { error?: string; soporte?: { id: string; nombre: string } };
    if (!respuesta.ok || !data.soporte) {
      setError(data.error || "No se pudo anexar el soporte.");
      return false;
    }
    setOps((lista) =>
      lista.map((item) => (item.id === id ? { ...item, soportes: [...item.soportes, data.soporte!] } : item)),
    );
    return true;
  }

  async function radicar() {
    try {
      await postJson(`/api/plantillas/${plantillaId}/radicar`, {
        cedulaRevisor,
        passwordRevisor,
        resumen: resumenFolio,
      });
      router.refresh();
      setCedulaRevisor("");
      setPasswordRevisor("");
      setOps([]);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo radicar.");
    }
  }

  if (!hoja) return null;
  const formulaBarra = seleccion?.celda?.formula || seleccion?.celda?.valor || "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <div className="min-w-0 flex-1">
        {tieneMacros ? (
          <p className="mb-2 text-sm text-ink-soft">Este libro conserva sus macros. Se vuelven a incluir al exportar el xlsm.</p>
        ) : null}
        {tieneTablaDinamica ? (
          <p className="mb-2 text-sm text-tab">Este libro trae una tabla dinámica. Al abrirlo en Excel, actualícela.</p>
        ) : null}
        {fueraDeVigencia ? <p className="mb-2 text-sm text-seal">La vigencia terminó. La hoja está en consulta.</p> : null}
        {desfasado ? (
          <p className="mb-2 text-sm">
            Alguien radicó otro folio.{" "}
            <button
              className="underline"
              type="button"
              onClick={() =>
                void fetch(`/api/plantillas/${plantillaId}/borrador`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tomarVigente: true }),
                }).then(() => router.refresh())
              }
            >
              Tomar el folio vigente
            </button>
          </p>
        ) : null}
        {error ? <p className="mb-2 text-sm text-seal">{error}</p> : null}
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" className={`border px-2 py-1 text-sm ${modoVista === "hoja" ? "border-indigo bg-indigo text-white" : "border-rule bg-card"}`} onClick={() => setModoVista("hoja")}>
            Hoja
          </button>
          <button type="button" className={`border px-2 py-1 text-sm ${modoVista === "titulos" ? "border-indigo bg-indigo text-white" : "border-rule bg-card"}`} onClick={() => setModoVista("titulos")}>
            Por títulos
          </button>
          {estado.hojas.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`border px-2 py-1 text-sm ${index === hojaIndex ? "border-indigo bg-indigo text-white" : "border-rule bg-card text-ink"}`}
              onClick={() => setHojaIndex(index)}
            >
              {item.nombre}
            </button>
          ))}
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="w-14 text-sm text-ink-soft">{indiceAColumna(col)}{fila + 1}</span>
          <div aria-label="Valor de la casilla" className="min-w-0 flex-1 border border-rule bg-card px-2 py-1 font-mono text-[13px]">
            {formulaBarra || "Doble clic en una casilla para editarla. Arrastre o use Mayús para seleccionar varias."}
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-2 text-sm">
          <button type="button" className="border border-rule bg-card px-2 py-1" disabled={lectura} onClick={() => cambiarFormato(seleccion?.celda?.formato || "texto", !seleccion?.celda?.negrita)}>Negrita</button>
          {(["texto", "numero", "porcentaje", "moneda", "fecha"] as Formato[]).map((formato) => (
            <button key={formato} type="button" className="border border-rule bg-card px-2 py-1 capitalize" disabled={lectura} onClick={() => cambiarFormato(formato)}>{formato}</button>
          ))}
          <span className="inline-flex items-center gap-1">
            {COLORES_TABLA.map((color) => (
              <button
                key={color}
                type="button"
                className="muestra-color"
                style={{ background: color }}
                aria-label={`Aplicar color ${color}`}
                disabled={lectura}
                onClick={() => void pintar(color)}
              />
            ))}
            <label className="muestra-color relative overflow-hidden" style={{ background: "conic-gradient(#b38b4d, #2b4a7a, #2f6b4f, #a23b3b, #b38b4d)" }} title="Otro color">
              <span className="sr-only">Otro color</span>
              <input
                type="color"
                aria-label="Elegir otro color"
                disabled={lectura}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => void pintar(event.target.value)}
              />
            </label>
            <button type="button" className="border border-rule bg-card px-2 py-1" disabled={lectura} onClick={() => void pintar(undefined)}>
              Quitar color
            </button>
          </span>
          <span className="inline-flex flex-wrap items-center gap-1">
            <select
              aria-label="Grosor del borde"
              className="border border-rule bg-card px-1 py-1"
              value={grosorBorde}
              disabled={lectura}
              onChange={(event) => setGrosorBorde(event.target.value as GrosorBorde)}
            >
              <option value="fino">Fino</option>
              <option value="medio">Medio</option>
              <option value="grueso">Grueso</option>
            </select>
            <label className="muestra-color relative overflow-hidden" style={{ background: colorBorde }} title="Color del borde">
              <span className="sr-only">Color del borde</span>
              <input
                type="color"
                aria-label="Color del borde"
                value={colorBorde}
                disabled={lectura}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => setColorBorde(event.target.value)}
              />
            </label>
            {(
              [
                ["todos", "Todos"],
                ["contorno", "Contorno"],
                ["interior", "Interior"],
                ["arriba", "Superior"],
                ["abajo", "Inferior"],
                ["izquierda", "Izquierdo"],
                ["derecha", "Derecho"],
                ["quitar", "Quitar bordes"],
              ] as [ModoBorde, string][]
            ).map(([modo, etiqueta]) => (
              <button key={modo} type="button" className="border border-rule bg-card px-2 py-1" disabled={lectura} onClick={() => void trazar(modo)}>
                {etiqueta}
              </button>
            ))}
          </span>
          <button type="button" className="border border-rule bg-card px-2 py-1" disabled={lectura} onClick={combinar}>
            Combinar celdas
          </button>
          <button
            type="button"
            className="border border-rule bg-card px-2 py-1"
            disabled={lectura}
            onClick={() => {
              const { f1, c1 } = rango();
              void guardar({
                tipo: "UNMERGE",
                hojaId: hoja.id,
                filaId: hoja.filaIds[f1],
                colId: hoja.colIds[c1],
                justificacion: "Se separan las celdas combinadas de la plantilla.",
              });
            }}
          >
            Separar
          </button>
          <button type="button" className="border border-rule bg-card px-2 py-1" disabled={lectura} onClick={() => void insertar("FILA")}>
            Insertar fila
          </button>
          <button type="button" className="border border-rule bg-card px-2 py-1" disabled={lectura} onClick={() => void insertar("COLUMNA")}>
            Insertar columna
          </button>
          {esAdmin ? (
            <>
              <button type="button" className="border border-rule bg-card px-2 py-1" onClick={() => prepararAsignacion("COLUMNA")}>
                Asignar columnas
              </button>
              <button type="button" className="border border-rule bg-card px-2 py-1" onClick={() => prepararAsignacion("FILA")}>
                Asignar filas
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="border border-rule bg-card px-2 py-1"
            disabled={lectura || !seleccion?.celda?.formula}
            onClick={() => {
              const formula = seleccion?.celda?.formula;
              if (!formula) return;
              pedir("Por qué copia esta fórmula", (justificacion) => {
                for (let i = 1; i <= 5; i++) {
                  const filaId = hoja.filaIds[fila + i];
                  if (!filaId) break;
                  void guardar({
                    tipo: "SET_CELL",
                    hojaId: hoja.id,
                    filaId,
                    colId: hoja.colIds[col],
                    valor: "",
                    formula: desplazarFormula(formula, i, 0),
                    formato: seleccion?.celda?.formato,
                    justificacion,
                  });
                }
              });
            }}
          >
            Copiar fórmula
          </button>
          <button type="button" className="border border-seal px-2 py-1 text-seal" disabled={lectura} onClick={() => setResumenAbierto(true)}>
            Exigir soporte en esta zona
          </button>
          <button type="button" className="border border-rule bg-card px-2 py-1" onClick={() => setResumenAbierto(true)}>
            Tabla resumen
          </button>
        </div>
        {modoVista === "titulos" ? (
          <VistaPorTitulos
            hoja={hoja}
            lectura={lectura}
            onCelda={(f, c, valor) => {
              const filaId = hoja.filaIds[f];
              const colId = hoja.colIds[c];
              if (!filaId || !colId || !puedeCasilla(filaId, colId)) {
                setError("Esta casilla no está entre las columnas o filas asignadas a su usuario.");
                return;
              }
              const celda = hoja.celdas[claveCelda(filaId, colId)];
              void guardar({
                tipo: "SET_CELL",
                hojaId: hoja.id,
                filaId,
                colId,
                valor: f === 0 ? valor.replace(/^=/, "") : valor.startsWith("=") ? "" : valor,
                formula: f === 0 ? "" : valor.startsWith("=") ? valor : "",
                formato: celda?.formato,
                negrita: f === 0 ? true : celda?.negrita,
                relleno: celda?.relleno,
                justificacion: "",
              });
            }}
          />
        ) : null}
        {modoVista === "hoja" ? <div className="max-h-[68vh] overflow-auto border border-rule bg-card">
          <table className="grid-sheet">
            <thead>
              <tr>
                <th className="rowhead" />
                {hoja.colIds.map((colId, index) => (
                  <th
                    key={colId}
                    style={{ minWidth: hoja.anchos[index] || 120 }}
                    title={asignaciones
                      .filter((item) => item.hojaId === hoja.id && item.eje === "COLUMNA" && item.refId === colId)
                      .map((item) => item.usuario)
                      .join(", ")}
                    onClick={() => {
                      setAnclaFila(0);
                      setAnclaCol(index);
                      setFila(hoja.filaIds.length - 1);
                      setCol(index);
                    }}
                  >
                    {indiceAColumna(index)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hoja.filaIds.map((filaId, f) => (
                <tr key={filaId} className={f === 0 ? "fila-titulo" : undefined}>
                  <td
                    className="rowhead"
                    onClick={() => {
                      setAnclaFila(f);
                      setAnclaCol(0);
                      setFila(f);
                      setCol(hoja.colIds.length - 1);
                    }}
                  >
                    {f + 1}
                  </td>
                  {hoja.colIds.map((colId, c) => {
                    if (celdaCubierta(hoja, filaId, colId)) return null;
                    const extension = extensionAncla(hoja, filaId, colId);
                    const celda = hoja.celdas[claveCelda(filaId, colId)];
                    const marcada = ops.some(
                      (item) => item.op.tipo === "SET_CELL" && item.op.filaId === filaId && item.op.colId === colId,
                    );
                    const zona = minSoportes(estado, hoja, filaId, colId) > 0;
                    const dentro =
                      f >= Math.min(anclaFila, fila) &&
                      f <= Math.max(anclaFila, fila) &&
                      c >= Math.min(anclaCol, col) &&
                      c <= Math.max(anclaCol, col);
                    const ajena = limitado && !puedeCasilla(filaId, colId);
                    return (
                      <td
                        key={colId}
                        rowSpan={extension?.filas}
                        colSpan={extension?.columnas}
                        className={`${dentro ? "selected" : ""} ${marcada ? "draft" : ""} ${zona ? "zone" : ""} ${ajena ? "ajena" : ""}`}
                        style={{ fontWeight: celda?.negrita ? 700 : 400, background: celda?.relleno, ...estiloBorde(celda?.borde) }}
                        title={celda?.formula && celda.formula.startsWith("=") ? celda.formula : undefined}
                        onMouseDown={(event) => {
                          if (event.button !== 0) return;
                          if (event.shiftKey) {
                            setFila(f);
                            setCol(c);
                            return;
                          }
                          arrastre.current = true;
                          setAnclaFila(f);
                          setAnclaCol(c);
                          setFila(f);
                          setCol(c);
                        }}
                        onMouseEnter={() => {
                          if (!arrastre.current) return;
                          setFila(f);
                          setCol(c);
                        }}
                        onDoubleClick={() => abrirCasilla(f, c)}
                      >
                        {mostrar(celda)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div> : null}
        <p className="mt-2 text-xs text-ink-soft">La primera casilla de cada columna es solo el título. Esas ramas aparecen en Auditoría.</p>
      </div>
      {mostrarRadicar ? <aside className="w-full shrink-0 border border-rule bg-card p-4 lg:w-96">
        <h2 className="font-display text-2xl">Radicar cambios</h2>
        <p className="mt-1 text-sm text-ink-soft">{ops.length ? `${ops.length} cambios sin radicar` : "La hoja no tiene cambios pendientes."}</p>
        <ul className="mt-3 max-h-80 space-y-3 overflow-auto">
          {ops.map((item) => {
            const donde =
              item.op.tipo === "SET_CELL"
                ? `${indiceAColumna(hoja.colIds.indexOf(item.op.colId))}${hoja.filaIds.indexOf(item.op.filaId) + 1}`
                : item.op.tipo;
            const minimo =
              item.op.tipo === "SET_CELL" ? minSoportes(estado, hoja, item.op.filaId, item.op.colId) : 0;
            return (
              <li key={item.id || donde} className="border border-rule p-2 text-sm">
                <p className="font-semibold">{donde}</p>
                <p className="text-ink-soft">{item.op.justificacion || "Sin justificación"}</p>
                {item.soportes.map((soporte) => (
                  <a key={soporte.id} className="block underline" href={`/api/soportes/${soporte.id}`}>
                    {soporte.nombre}
                  </a>
                ))}
                {minimo && item.soportes.length < minimo ? (
                  <p className="text-xs text-seal">Esta zona exige {minimo} soporte(s). Ábrala con doble clic.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <label className="mt-3 block text-sm">
          Resumen del folio
          <input className="mt-1 w-full border border-rule px-2 py-1" value={resumenFolio} onChange={(event) => setResumenFolio(event.target.value)} />
        </label>
        <p className="mt-4 text-sm text-graphite">El revisor autoriza la subida de esta tabla. Las casillas se editan sin esa aprobación.</p>
        <label className="mt-2 block text-sm">
          Cédula del revisor
          <input className="mt-1 w-full border border-rule px-2 py-1" value={cedulaRevisor} onChange={(event) => setCedulaRevisor(event.target.value)} />
        </label>
        <label className="mt-3 block text-sm">
          Contraseña del revisor
          <input className="mt-1 w-full border border-rule px-2 py-1" type="password" value={passwordRevisor} onChange={(event) => setPasswordRevisor(event.target.value)} />
        </label>
        <button type="button" className="mt-3 w-full bg-indigo px-3 py-2 text-white" disabled={lectura || ops.length === 0} onClick={() => void radicar()}>
          Radicar cambios
        </button>
      </aside> : null}
      {propuesta ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form
            className="w-full max-w-md bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void confirmarAsignacion();
            }}
          >
            <h3 className="font-display text-2xl">
              {propuesta.eje === "COLUMNA" ? "Columna" : "Fila"}: {propuesta.refs.map((ref) => ref.etiqueta).join(", ")}
            </h3>
            <p className="mt-1 text-sm text-graphite">
              El título es opcional. Si no marca funcionarios, esa columna o fila sigue disponible para quien pueda editar la plantilla.
            </p>
            <label className="mt-3 block text-sm">
              Título
              <input
                className="mt-1 w-full border border-rule px-2 py-1"
                value={tituloAsignacion}
                onChange={(event) => setTituloAsignacion(event.target.value)}
              />
            </label>
            <fieldset className="mt-3 space-y-1 text-sm">
              <legend>Quién puede editarla</legend>
              {funcionarios.map((persona) => (
                <label key={persona.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={usuariosAsignados.includes(persona.id)}
                    onChange={(event) =>
                      setUsuariosAsignados((actual) =>
                        event.target.checked ? [...actual, persona.id] : actual.filter((id) => id !== persona.id),
                      )
                    }
                  />
                  {persona.nombre}
                </label>
              ))}
            </fieldset>
            <div className="mt-3 flex gap-2">
              <button type="submit" className="bg-indigo px-3 py-2 text-white">
                Guardar asignación
              </button>
              <button type="button" className="border border-rule px-3 py-2" onClick={() => setPropuesta(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {casilla ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form
            className="w-full max-w-md bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const filaId = hoja.filaIds[casilla.fila];
              const colId = hoja.colIds[casilla.col];
              if (!filaId || !colId) return;
              const celdaActual = hoja.celdas[claveCelda(filaId, colId)];
              const formula = valorForm.startsWith("=") ? valorForm : "";
              void (async () => {
                const id = await guardar({
                  tipo: "SET_CELL",
                  hojaId: hoja.id,
                  filaId,
                  colId,
                  valor: casilla.fila === 0 ? valorForm.replace(/^=/, "") : formula ? "" : valorForm,
                  formula: casilla.fila === 0 ? "" : formula,
                  formato: celdaActual?.formato,
                  negrita: celdaActual?.negrita,
                  relleno: celdaActual?.relleno,
                  justificacion: justForm.trim(),
                });
                if (!id) return;
                if (archivoForm) {
                  const anexo = await subirSoporte(id, archivoForm);
                  if (!anexo) return;
                }
                setCasilla(null);
              })();
            }}
          >
            <h3 className="font-display text-2xl">
              {casilla.fila === 0 ? "Título de la columna" : `Editar ${indiceAColumna(casilla.col)}${casilla.fila + 1}`}
            </h3>
            <label className="mt-3 block text-sm">
              {casilla.fila === 0 ? "Título" : "Valor o fórmula"}
              {casilla.fila === 0 ? (
                <input className="mt-1 w-full border border-rule px-2 py-1" value={valorForm} onChange={(event) => setValorForm(event.target.value)} autoFocus />
              ) : (
                <CampoFormula value={valorForm} onChange={setValorForm} />
              )}
            </label>
            <label className="mt-3 block text-sm">
              Nota, si quiere dejarla
              <textarea
                className="mt-1 w-full border border-rule p-2"
                rows={2}
                value={justForm}
                onChange={(event) => setJustForm(event.target.value)}
              />
            </label>
            <label className="mt-3 block text-sm">
              Soporte
              <input
                className="mt-1 block"
                type="file"
                onChange={(event) => setArchivoForm(event.target.files?.[0] ?? null)}
              />
            </label>
            {minSoportes(estado, hoja, hoja.filaIds[casilla.fila], hoja.colIds[casilla.col]) > 0 ? (
              <p className="mt-2 text-xs text-seal">Esta zona exige soporte para radicar el cambio.</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button type="submit" className="bg-indigo px-3 py-2 text-white">
                Guardar casilla
              </button>
              <button type="button" className="border border-rule px-3 py-2" onClick={() => setCasilla(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {dialogo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form
            className="w-full max-w-md bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (motivo.trim().length < 20) {
                setError("La justificación debe tener al menos 20 caracteres.");
                return;
              }
              dialogo.confirmar(motivo.trim());
              setDialogo(null);
            }}
          >
            <h3 className="font-display text-2xl">{dialogo.titulo}</h3>
            <textarea className="mt-3 w-full border border-rule p-2" rows={4} value={motivo} onChange={(event) => setMotivo(event.target.value)} />
            <div className="mt-3 flex gap-2">
              <button type="submit" className="bg-indigo px-3 py-2 text-white">Guardar</button>
              <button type="button" className="border border-rule px-3 py-2" onClick={() => setDialogo(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : null}
      {resumenAbierto ? (
        <Resumen
          hojaNombre={hoja.nombre}
          columnas={hoja.colIds.length}
          onCerrar={() => setResumenAbierto(false)}
          onZona={(filas, columnas, descripcion) => {
            const filaFin = hoja.filaIds[Math.min(hoja.filaIds.length - 1, fila + filas - 1)];
            const colFin = hoja.colIds[Math.min(hoja.colIds.length - 1, col + columnas - 1)];
            pedir("Por qué esta zona exige soporte", (justificacion) =>
              void guardar({
                tipo: "SET_ZONE",
                justificacion,
                zona: {
                  id: crypto.randomUUID(),
                  hojaId: hoja.id,
                  filaIdInicio: hoja.filaIds[fila],
                  filaIdFin: filaFin,
                  colIdInicio: hoja.colIds[col],
                  colIdFin: colFin,
                  minSoportes: 1,
                  descripcion,
                },
              }),
            );
            setResumenAbierto(false);
          }}
          onVolcar={(filaCampo, valorCampo, agregacion) => {
            const nueva = hojaVacia(`Resumen ${hoja.nombre}`.slice(0, 28), estado.hojas.length, 30, 4);
            const filas = resumir(hoja, filaCampo, valorCampo, agregacion);
            pedir("Por qué vuelca esta tabla resumen", (justificacion) => {
              void guardar({ tipo: "ADD_SHEET", hoja: nueva, justificacion });
              void guardar({
                tipo: "SET_CELL",
                hojaId: nueva.id,
                filaId: nueva.filaIds[0],
                colId: nueva.colIds[0],
                valor: "Grupo",
                formula: "",
                negrita: true,
                justificacion,
              });
              void guardar({
                tipo: "SET_CELL",
                hojaId: nueva.id,
                filaId: nueva.filaIds[0],
                colId: nueva.colIds[1],
                valor: agregacion,
                formula: "",
                negrita: true,
                justificacion,
              });
              filas.forEach((filaResumen, index) => {
                void guardar({
                  tipo: "SET_CELL",
                  hojaId: nueva.id,
                  filaId: nueva.filaIds[index + 1],
                  colId: nueva.colIds[0],
                  valor: filaResumen.etiqueta,
                  formula: "",
                  justificacion,
                });
                void guardar({
                  tipo: "SET_CELL",
                  hojaId: nueva.id,
                  filaId: nueva.filaIds[index + 1],
                  colId: nueva.colIds[1],
                  valor: String(filaResumen.valor),
                  formula: "",
                  formato: "numero",
                  justificacion,
                });
              });
            });
            setResumenAbierto(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Resumen({
  hojaNombre,
  columnas,
  onCerrar,
  onZona,
  onVolcar,
}: {
  hojaNombre: string;
  columnas: number;
  onCerrar: () => void;
  onZona: (filas: number, columnas: number, descripcion: string) => void;
  onVolcar: (filaCampo: number, valorCampo: number, agregacion: Agregacion) => void;
}) {
  const [filas, setFilas] = useState(1);
  const [cols, setCols] = useState(1);
  const [descripcion, setDescripcion] = useState("Zona con soporte");
  const [filaCampo, setFilaCampo] = useState(0);
  const [valorCampo, setValorCampo] = useState(Math.min(1, columnas - 1));
  const [agregacion, setAgregacion] = useState<Agregacion>("suma");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-lg bg-card p-4">
        <h3 className="font-display text-2xl">Zona y tabla resumen</h3>
        <p className="mt-1 text-sm text-ink-soft">Hoja {hojaNombre}. La zona parte de la casilla seleccionada.</p>
        <div className="mt-3 grid gap-2 text-sm">
          <label>Filas de la zona <input className="ml-2 w-20 border border-rule px-2" type="number" min={1} value={filas} onChange={(e) => setFilas(Number(e.target.value))} /></label>
          <label>Columnas de la zona <input className="ml-2 w-20 border border-rule px-2" type="number" min={1} value={cols} onChange={(e) => setCols(Number(e.target.value))} /></label>
          <input className="border border-rule px-2 py-1" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <button type="button" className="border border-brass px-3 py-2 text-ink" onClick={() => onZona(filas, cols, descripcion)}>Exigir soporte en esta zona</button>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <label>Columna de grupo <input className="ml-2 w-20 border border-rule px-2" type="number" min={1} value={filaCampo + 1} onChange={(e) => setFilaCampo(Number(e.target.value) - 1)} /></label>
          <label>Columna de valor <input className="ml-2 w-20 border border-rule px-2" type="number" min={1} value={valorCampo + 1} onChange={(e) => setValorCampo(Number(e.target.value) - 1)} /></label>
          <select className="border border-rule px-2 py-1" value={agregacion} onChange={(e) => setAgregacion(e.target.value as Agregacion)}>
            <option value="suma">Suma</option>
            <option value="conteo">Conteo</option>
            <option value="promedio">Promedio</option>
            <option value="porcentaje">Porcentaje</option>
          </select>
          <button type="button" className="bg-indigo px-3 py-2 text-white" onClick={() => onVolcar(filaCampo, valorCampo, agregacion)}>Volcar tabla resumen</button>
          <button type="button" className="border border-rule px-3 py-2" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function VistaPorTitulos({
  hoja,
  lectura,
  onCelda,
}: {
  hoja: HojaEstado;
  lectura: boolean;
  onCelda: (fila: number, col: number, valor: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {hoja.colIds.map((colId, c) => {
        const titulo = hoja.celdas[claveCelda(hoja.filaIds[0], colId)]?.valor || "";
        return (
          <article key={colId} className="border border-rule border-t-[3px] border-t-brass bg-card p-4">
            <label className="block text-sm">
              Título de la columna
              <input
                className="mt-1 w-full border border-rule bg-paper px-2 py-1 font-display text-lg"
                defaultValue={titulo}
                placeholder="Sin título"
                disabled={lectura}
                onBlur={(event) => {
                  if (event.target.value !== titulo) onCelda(0, c, event.target.value);
                }}
              />
            </label>
            <ul className="mt-3 space-y-2">
              {hoja.filaIds.slice(1).map((filaId, indice) => {
                const f = indice + 1;
                const nombreFila =
                  c > 0 ? hoja.celdas[claveCelda(filaId, hoja.colIds[0])]?.valor?.trim() : "";
                const celda = hoja.celdas[claveCelda(filaId, colId)];
                const valor = celda?.formula || celda?.valor || "";
                return (
                  <li key={filaId}>
                    <label className="block text-sm">
                      {nombreFila || `Fila ${f + 1}`}
                      <input
                        className="mt-1 w-full border border-rule px-2 py-1 font-mono"
                        defaultValue={valor}
                        disabled={lectura}
                        onBlur={(event) => {
                          if (event.target.value !== valor) onCelda(f, c, event.target.value);
                        }}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
