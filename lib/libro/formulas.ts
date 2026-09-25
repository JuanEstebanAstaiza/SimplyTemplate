import { columnaAIndice, indiceAColumna, parsearReferencia } from "./refs";

export type LeerCelda = (fila: number, columna: number) => string;

type Nodo =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; fila: number; columna: number }
  | { t: "rango"; f1: number; c1: number; f2: number; c2: number }
  | { t: "fn"; nombre: string; args: Nodo[] }
  | { t: "bin"; op: string; l: Nodo; r: Nodo }
  | { t: "neg"; v: Nodo };

class Parser {
  private i = 0;
  constructor(private s: string) {}

  parse(): Nodo {
    const nodo = this.comparacion();
    this.saltar();
    if (this.i < this.s.length) throw new Error("sobra");
    return nodo;
  }

  private saltar() {
    while (this.s[this.i] === " ") this.i++;
  }

  private comparacion(): Nodo {
    let l = this.aditiva();
    this.saltar();
    const ops = [">=", "<=", "<>", ">", "<", "="];
    for (const op of ops) {
      if (this.s.slice(this.i, this.i + op.length) === op) {
        this.i += op.length;
        const r = this.aditiva();
        l = { t: "bin", op, l, r };
        break;
      }
    }
    return l;
  }

  private aditiva(): Nodo {
    let l = this.multiplicativa();
    for (;;) {
      this.saltar();
      const op = this.s[this.i];
      if (op !== "+" && op !== "-") break;
      this.i++;
      const r = this.multiplicativa();
      l = { t: "bin", op, l, r };
    }
    return l;
  }

  private multiplicativa(): Nodo {
    let l = this.unaria();
    for (;;) {
      this.saltar();
      const op = this.s[this.i];
      if (op !== "*" && op !== "/") break;
      this.i++;
      const r = this.unaria();
      l = { t: "bin", op, l, r };
    }
    return l;
  }

  private unaria(): Nodo {
    this.saltar();
    if (this.s[this.i] === "-") {
      this.i++;
      return { t: "neg", v: this.unaria() };
    }
    return this.primaria();
  }

  private primaria(): Nodo {
    this.saltar();
    const c = this.s[this.i];
    if (c === "(") {
      this.i++;
      const n = this.comparacion();
      this.saltar();
      if (this.s[this.i] !== ")") throw new Error("parentesis");
      this.i++;
      return n;
    }
    if (c === '"') {
      this.i++;
      let texto = "";
      while (this.i < this.s.length && this.s[this.i] !== '"') {
        texto += this.s[this.i++];
      }
      if (this.s[this.i] !== '"') throw new Error("comilla");
      this.i++;
      return { t: "str", v: texto };
    }
    if ((c >= "0" && c <= "9") || c === ".") {
      const inicio = this.i;
      while (this.i < this.s.length && /[0-9.]/.test(this.s[this.i])) this.i++;
      return { t: "num", v: Number(this.s.slice(inicio, this.i)) };
    }
    const inicio = this.i;
    while (this.i < this.s.length && /[A-Za-z0-9$]/.test(this.s[this.i])) this.i++;
    const token = this.s.slice(inicio, this.i);
    if (!token) throw new Error("token");
    this.saltar();
    if (this.s[this.i] === "(") {
      this.i++;
      const args: Nodo[] = [];
      this.saltar();
      if (this.s[this.i] !== ")") {
        for (;;) {
          args.push(this.argumento());
          this.saltar();
          if (this.s[this.i] === ",") {
            this.i++;
            continue;
          }
          break;
        }
      }
      if (this.s[this.i] !== ")") throw new Error("cierre");
      this.i++;
      return { t: "fn", nombre: token.toUpperCase(), args };
    }
    const ref = parsearReferencia(token);
    if (!ref) throw new Error("ref");
    this.saltar();
    if (this.s[this.i] === ":") {
      this.i++;
      this.saltar();
      const i2 = this.i;
      while (this.i < this.s.length && /[A-Za-z0-9$]/.test(this.s[this.i])) this.i++;
      const ref2 = parsearReferencia(this.s.slice(i2, this.i));
      if (!ref2) throw new Error("rango");
      return {
        t: "rango",
        f1: Math.min(ref.fila, ref2.fila),
        c1: Math.min(ref.columna, ref2.columna),
        f2: Math.max(ref.fila, ref2.fila),
        c2: Math.max(ref.columna, ref2.columna),
      };
    }
    return { t: "ref", fila: ref.fila, columna: ref.columna };
  }

  private argumento(): Nodo {
    this.saltar();
    const guardado = this.i;
    const posible = this.s.slice(this.i);
    const m = /^(\$?[A-Z]+\$?\d+)\s*:\s*(\$?[A-Z]+\$?\d+)/i.exec(posible);
    if (m) {
      const a = parsearReferencia(m[1]);
      const b = parsearReferencia(m[2]);
      if (a && b) {
        this.i = guardado + m[0].length;
        return {
          t: "rango",
          f1: Math.min(a.fila, b.fila),
          c1: Math.min(a.columna, b.columna),
          f2: Math.max(a.fila, b.fila),
          c2: Math.max(a.columna, b.columna),
        };
      }
    }
    return this.comparacion();
  }
}

function aNumero(v: string): number {
  if (v === "" || v === "TRUE" || v === "FALSE") {
    if (v === "TRUE") return 1;
    if (v === "FALSE") return 0;
    return 0;
  }
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error("num");
  return n;
}

function formatoNumero(n: number): string {
  if (!Number.isFinite(n)) return "#DIV/0";
  const redondo = Math.round(n * 1e10) / 1e10;
  return String(redondo);
}

function valoresDe(nodo: Nodo, leer: LeerCelda, pila: Set<string>): string[] {
  if (nodo.t === "rango") {
    const salida: string[] = [];
    for (let f = nodo.f1; f <= nodo.f2; f++) {
      for (let c = nodo.c1; c <= nodo.c2; c++) salida.push(leerEn(leer, f, c, pila));
    }
    return salida;
  }
  return [evaluarNodo(nodo, leer, pila)];
}

function leerEn(leer: LeerCelda, fila: number, columna: number, pila: Set<string>): string {
  const clave = `${fila}:${columna}`;
  if (pila.has(clave)) return "#CIRCULAR";
  return leer(fila, columna);
}

function cumpleCriterio(valor: string, criterio: string): boolean {
  const m = /^(>=|<=|<>|>|<|=)(.*)$/.exec(criterio);
  if (!m) return valor.toLowerCase() === criterio.toLowerCase();
  const op = m[1];
  const esperado = m[2];
  const vn = Number(valor);
  const en = Number(esperado);
  if (!Number.isNaN(vn) && esperado !== "" && !Number.isNaN(en)) {
    if (op === ">") return vn > en;
    if (op === "<") return vn < en;
    if (op === ">=") return vn >= en;
    if (op === "<=") return vn <= en;
    if (op === "=") return vn === en;
    return vn !== en;
  }
  if (op === "=") return valor.toLowerCase() === esperado.toLowerCase();
  if (op === "<>") return valor.toLowerCase() !== esperado.toLowerCase();
  return false;
}

const FUNCIONES = new Set(["SUM", "AVERAGE", "MIN", "MAX", "ROUND", "IF", "AND", "OR", "COUNT", "COUNTA", "SUMIF"]);

export function formulaSoportada(formula: string): boolean {
  if (!formula.startsWith("=")) return true;
  try {
    const nodo = new Parser(formula.slice(1)).parse();
    return nodosSoportados(nodo);
  } catch {
    return false;
  }
}

function nodosSoportados(nodo: Nodo): boolean {
  if (nodo.t === "fn") {
    if (!FUNCIONES.has(nodo.nombre)) return false;
    return nodo.args.every(nodosSoportados);
  }
  if (nodo.t === "bin") return nodosSoportados(nodo.l) && nodosSoportados(nodo.r);
  if (nodo.t === "neg") return nodosSoportados(nodo.v);
  return true;
}

function evaluarNodo(nodo: Nodo, leer: LeerCelda, pila: Set<string>): string {
  if (nodo.t === "num") return formatoNumero(nodo.v);
  if (nodo.t === "str") return nodo.v;
  if (nodo.t === "ref") return leerEn(leer, nodo.fila, nodo.columna, pila);
  if (nodo.t === "neg") return formatoNumero(-aNumero(evaluarNodo(nodo.v, leer, pila)));
  if (nodo.t === "bin") {
    const l = evaluarNodo(nodo.l, leer, pila);
    const r = evaluarNodo(nodo.r, leer, pila);
    if (l.startsWith("#") || r.startsWith("#")) return l.startsWith("#") ? l : r;
    if (nodo.op === "+") return formatoNumero(aNumero(l) + aNumero(r));
    if (nodo.op === "-") return formatoNumero(aNumero(l) - aNumero(r));
    if (nodo.op === "*") return formatoNumero(aNumero(l) * aNumero(r));
    if (nodo.op === "/") {
      const d = aNumero(r);
      if (d === 0) return "#DIV/0";
      return formatoNumero(aNumero(l) / d);
    }
    const ln = Number(l);
    const rn = Number(r);
    const ambosNum = l !== "" && r !== "" && !Number.isNaN(ln) && !Number.isNaN(rn);
    let ok = false;
    if (ambosNum) {
      if (nodo.op === ">") ok = ln > rn;
      else if (nodo.op === "<") ok = ln < rn;
      else if (nodo.op === ">=") ok = ln >= rn;
      else if (nodo.op === "<=") ok = ln <= rn;
      else if (nodo.op === "=") ok = ln === rn;
      else ok = ln !== rn;
    } else if (nodo.op === "=") ok = l.toLowerCase() === r.toLowerCase();
    else if (nodo.op === "<>") ok = l.toLowerCase() !== r.toLowerCase();
    else ok = false;
    return ok ? "TRUE" : "FALSE";
  }
  if (nodo.t === "rango") return valoresDe(nodo, leer, pila).join(",");
  const nombre = nodo.nombre;
  if (nombre === "IF") {
    const cond = evaluarNodo(nodo.args[0], leer, pila);
    const verdad = cond !== "FALSE" && cond !== "0" && cond !== "";
    return evaluarNodo(nodo.args[verdad ? 1 : 2], leer, pila);
  }
  if (nombre === "AND" || nombre === "OR") {
    const vals = nodo.args.map((a) => evaluarNodo(a, leer, pila));
    const ok = (v: string) => v !== "FALSE" && v !== "0" && v !== "";
    return (nombre === "AND" ? vals.every(ok) : vals.some(ok)) ? "TRUE" : "FALSE";
  }
  if (nombre === "ROUND") {
    const n = aNumero(evaluarNodo(nodo.args[0], leer, pila));
    const d = nodo.args[1] ? aNumero(evaluarNodo(nodo.args[1], leer, pila)) : 0;
    const f = 10 ** d;
    return formatoNumero(Math.round(n * f) / f);
  }
  if (nombre === "SUMIF") {
    const rango = valoresDe(nodo.args[0], leer, pila);
    const criterio = evaluarNodo(nodo.args[1], leer, pila);
    const suma = nodo.args[2] ? valoresDe(nodo.args[2], leer, pila) : rango;
    let total = 0;
    rango.forEach((v, i) => {
      if (cumpleCriterio(v, criterio)) total += Number(suma[i] || 0) || 0;
    });
    return formatoNumero(total);
  }
  const planos = nodo.args.flatMap((a) => valoresDe(a, leer, pila));
  const numeros = planos.filter((v) => v !== "" && !Number.isNaN(Number(v))).map(Number);
  if (nombre === "SUM") return formatoNumero(numeros.reduce((a, b) => a + b, 0));
  if (nombre === "AVERAGE") {
    if (!numeros.length) return "#DIV/0";
    return formatoNumero(numeros.reduce((a, b) => a + b, 0) / numeros.length);
  }
  if (nombre === "MIN") return formatoNumero(numeros.length ? Math.min(...numeros) : 0);
  if (nombre === "MAX") return formatoNumero(numeros.length ? Math.max(...numeros) : 0);
  if (nombre === "COUNT") return String(numeros.length);
  if (nombre === "COUNTA") return String(planos.filter((v) => v !== "").length);
  return "#ERROR";
}

export function evaluarFormula(formula: string, leer: LeerCelda, origen?: { fila: number; columna: number }): string {
  try {
    const nodo = new Parser(formula.startsWith("=") ? formula.slice(1) : formula).parse();
    const pila = new Set<string>();
    if (origen) pila.add(`${origen.fila}:${origen.columna}`);
    const valor = evaluarNodo(nodo, (fila, columna) => {
      const clave = `${fila}:${columna}`;
      if (pila.has(clave)) return "#CIRCULAR";
      return leer(fila, columna);
    }, pila);
    return valor;
  } catch {
    return "#ERROR";
  }
}

export function referenciaVisible(fila: number, columna: number) {
  return `${indiceAColumna(columna)}${fila + 1}`;
}

export function parsearRangoA1(texto: string): { f1: number; c1: number; f2: number; c2: number } | null {
  const [a, b] = texto.split(":");
  const ra = parsearReferencia(a || "");
  const rb = parsearReferencia(b || a || "");
  if (!ra || !rb) return null;
  return {
    f1: Math.min(ra.fila, rb.fila),
    c1: Math.min(ra.columna, rb.columna),
    f2: Math.max(ra.fila, rb.fila),
    c2: Math.max(ra.columna, rb.columna),
  };
}

export { columnaAIndice };
