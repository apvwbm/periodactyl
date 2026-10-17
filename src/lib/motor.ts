// TODA la lógica del ciclo. Funciones puras, sin Expo: las cubre `scripts/verifica.ts`.
//
// El único dato son los días apuntados. Las reglas, los ciclos, la previsión, la
// ventana fértil, las notas de salud y las estadísticas se derivan cada vez y no se
// guardan nunca.

import {
  CICLO_CORTO,
  CICLO_LARGO,
  CICLO_MAX,
  CICLO_MIN,
  CICLOS_AJUSTE,
  CICLOS_FUTUROS,
  CICLOS_MINIMOS,
  CICLOS_PERDIDOS,
  CICLOS_PREDICCION,
  DIAS_ABUNDANTE,
  FASE_LUTEA,
  HUECO_REGLA,
  MARGEN_ESTIMADO,
  MARGEN_MAX,
  MARGEN_MIN,
  MARGEN_SOSPECHOSO,
  REGLA_LARGA,
  REGLAS_DOLOR,
  SIN_REGLA,
  VARIACION_MAX,
  VENTANA_FERTIL,
} from './catalogo';
import { addDias, diasEntre } from './fechas';
import type { Ajustes, Dia, Flujo, Sintoma } from '@/types';

export type Regla = { inicio: string; fin: string };

const LIGERO = 2;
const MEDIO: Flujo = 3;

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
};
const ordenar = (dias: Dia[]) => [...dias].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
export const duracion = (r: Regla) => diasEntre(r.inicio, r.fin) + 1;
const dentro = (f: string, desde: string, hasta: string) => f >= desde && f <= hasta;

// ── Reglas ───────────────────────────────────────────────────────────────────

/**
 * Episodios de sangrado: días con flujo ≥ ligero, unidos si entre uno y el siguiente
 * hay como mucho 2 días sin flujo (o solo con manchado). El manchado solo nunca empieza
 * un episodio.
 */
function episodios(dias: Dia[]): Regla[] {
  const res: Regla[] = [];
  for (const d of ordenar(dias)) {
    if (d.flujo < LIGERO) continue;
    const ultimo = res[res.length - 1];
    if (ultimo && diasEntre(ultimo.fin, d.fecha) - 1 <= HUECO_REGLA) ultimo.fin = d.fecha;
    else res.push({ inicio: d.fecha, fin: d.fecha });
  }
  return res;
}

/**
 * Las reglas y los sangrados entre reglas. Un episodio que empieza a menos de 10 días
 * del inicio de la regla anterior no abre ciclo (sería un ciclo imposible): es un
 * sangrado entre reglas.
 */
// ponytail: un sangrado a mitad de ciclo (día 14) cuenta como regla y parte el ciclo en
// dos. Para eso está "excluir este ciclo"; si molesta, marcar episodios a mano como drip.
export function separar(dias: Dia[]): { reglas: Regla[]; entre: Regla[] } {
  const reglas: Regla[] = [];
  const entre: Regla[] = [];
  for (const e of episodios(dias)) {
    const ultima = reglas[reglas.length - 1];
    if (ultima && diasEntre(ultima.inicio, e.inicio) < CICLO_MIN) entre.push(e);
    else reglas.push(e);
  }
  return { reglas, entre };
}

export const reglas = (dias: Dia[]): Regla[] => separar(dias).reglas;

// ── Ciclos ───────────────────────────────────────────────────────────────────

export type Ciclo = {
  inicio: string;
  regla: Regla;
  /** null = el ciclo en curso. */
  dias: number | null;
  excluido: boolean;
  valido: boolean;
};

export const cicloValido = (dias: number) => dias >= CICLO_MIN && dias <= CICLO_MAX;

export function ciclos(rs: Regla[], excluidos: string[]): Ciclo[] {
  return rs.map((r, i) => {
    const dias = i + 1 < rs.length ? diasEntre(r.inicio, rs[i + 1].inicio) : null;
    const excluido = excluidos.includes(r.inicio);
    return { inicio: r.inicio, regla: r, dias, excluido, valido: dias !== null && !excluido && cicloValido(dias) };
  });
}

/** Los últimos 6 ciclos válidos, los que usan la previsión y las estadísticas. */
const recientes = (cs: Ciclo[]) => cs.filter((c) => c.valido).slice(-CICLOS_PREDICCION);

// ── Previsión ────────────────────────────────────────────────────────────────

export type Prevision = {
  /** Menos de 3 ciclos: usa lo que dijo el usuario. */
  estimada: boolean;
  ciclo: number;
  regla: number;
  margen: number;
  /** Inicio de la última regla. */
  base: string;
  /** Inicio previsto de la siguiente y su rango. */
  inicio: string;
  desde: string;
  hasta: string;
};

export function prever(rs: Regla[], cs: Ciclo[], a: Pick<Ajustes, 'cicloDicho' | 'reglaDicha'>): Prevision | null {
  if (!rs.length) return null;
  const validos = recientes(cs);
  const estimada = validos.length < CICLOS_MINIMOS;
  const largos = validos.map((c) => c.dias!);
  const ciclo = estimada ? a.cicloDicho : mediana(largos);
  const margen = estimada
    ? MARGEN_ESTIMADO
    : Math.min(MARGEN_MAX, Math.max(MARGEN_MIN, Math.round((Math.max(...largos) - Math.min(...largos)) / 2)));
  const base = rs[rs.length - 1].inicio;
  const inicio = addDias(base, ciclo);
  return {
    estimada,
    ciclo,
    regla: estimada ? a.reglaDicha : mediana(validos.map((c) => duracion(c.regla))),
    margen,
    base,
    inicio,
    desde: addDias(inicio, -margen),
    hasta: addDias(inicio, margen),
  };
}

/** Días pasado el final del rango; 0 si no hay retraso. */
export const diasRetraso = (p: Prevision, hoy: string) => Math.max(0, diasEntre(p.hasta, hoy));

/**
 * Ciclo de más de la mediana + 10 días: probablemente falta una regla por apuntar (en
 * Clue, el 42 % tiene alguno, y un olvido convierte 27 + 35 días en uno de 62).
 */
export const sospechoso = (c: Ciclo, p: Prevision) => c.dias !== null && !c.excluido && c.dias > p.ciclo + MARGEN_SOSPECHOSO;

// ── Hoy ──────────────────────────────────────────────────────────────────────

export type EstadoHoy =
  | { tipo: 'sinDatos' }
  | { tipo: 'regla'; dia: number }
  | { tipo: 'antes'; dias: number }
  | { tipo: 'pronto' }
  | { tipo: 'retraso'; dias: number };

export function estadoHoy(rs: Regla[], p: Prevision | null, abierta: string | null, hoy: string): EstadoHoy {
  const ultima = rs.filter((r) => r.inicio <= hoy).pop();
  if (!ultima || !p) return { tipo: 'sinDatos' };
  if (abierta || hoy <= ultima.fin) return { tipo: 'regla', dia: diasEntre(ultima.inicio, hoy) + 1 };
  if (hoy < p.desde) return { tipo: 'antes', dias: diasEntre(hoy, p.inicio) };
  if (hoy <= p.hasta) return { tipo: 'pronto' };
  return { tipo: 'retraso', dias: diasRetraso(p, hoy) };
}

/**
 * La regla abierta con "Hoy me ha bajado" se rellena día a día con flujo medio hasta su
 * duración típica, salvo que antes se marque "Se me ha ido". Solo hacia delante desde el
 * último día con flujo, para no pisar lo que el usuario haya corregido. Si el primer día
 * ya no tiene flujo (lo ha borrado), se cierra.
 */
export function rellenoAbierta(dias: Dia[], abierta: string, hoy: string, duracionRegla: number): { rellenar: string[]; cerrar: boolean } {
  const conFlujo = dias.filter((d) => d.flujo >= LIGERO && dentro(d.fecha, abierta, hoy)).map((d) => d.fecha).sort();
  if (conFlujo[0] !== abierta) return { rellenar: [], cerrar: true };
  const limite = addDias(abierta, duracionRegla - 1);
  const hasta = hoy < limite ? hoy : limite;
  const rellenar: string[] = [];
  for (let f = addDias(conFlujo[conFlujo.length - 1], 1); f <= hasta; f = addDias(f, 1)) rellenar.push(f);
  return { rellenar, cerrar: hoy >= limite };
}

export const FLUJO_RELLENO: Flujo = MEDIO;

// ── Fertilidad y ciclos futuros ──────────────────────────────────────────────

export type Fertil = { ovulacion: string; desde: string; hasta: string };

/** Ovulación = regla − 13; ventana fértil = los 6 días que acaban en ella. Solo orientativo. */
export function fertil(inicioRegla: string): Fertil {
  const ovulacion = addDias(inicioRegla, -FASE_LUTEA);
  return { ovulacion, desde: addDias(ovulacion, -(VENTANA_FERTIL - 1)), hasta: ovulacion };
}

/** Fertilidad solo si el usuario la pidió y sin anticoncepción hormonal. */
export const verFertilidad = (a: Pick<Ajustes, 'fertilidad' | 'hormonal'>) => a.fertilidad && !a.hormonal;

export type Futura = { inicio: string; fin: string; fertil: Fertil | null };

/**
 * Los próximos 3 ciclos. Con retraso, la siguiente regla puede llegar cualquier día: se
 * cuenta desde hoy.
 */
export function futuras(p: Prevision, hoy: string, conFertilidad: boolean): Futura[] {
  const base = hoy > p.hasta ? hoy : p.inicio;
  return Array.from({ length: CICLOS_FUTUROS }, (_, k) => {
    const inicio = addDias(base, k * p.ciclo);
    return { inicio, fin: addDias(inicio, p.regla - 1), fertil: conFertilidad ? fertil(inicio) : null };
  });
}

/** La siguiente ventana fértil que no ha terminado, para la línea de Hoy. */
export const proximaVentana = (fs: Futura[], hoy: string): Fertil | null =>
  fs.find((f) => f.fertil && f.fertil.hasta >= hoy)?.fertil ?? null;

// ── Calendario ───────────────────────────────────────────────────────────────

export type Marca = {
  regla?: boolean;
  /** Ciclo previsto 0, 1 o 2: cada uno más difuminado. */
  prevista?: number;
  fertil?: boolean;
  ovulacion?: boolean;
  /** Síntomas, nota, dolor, manchado o sangrado fuera de regla. */
  datos?: boolean;
};

export function marcas(dias: Dia[], rs: Regla[], fs: Futura[], hoy: string): Map<string, Marca> {
  const m = new Map<string, Marca>();
  const marcar = (f: string, x: Marca) => m.set(f, { ...m.get(f), ...x });
  const rango = (desde: string, hasta: string, x: Marca) => {
    for (let f = desde; f <= hasta; f = addDias(f, 1)) marcar(f, x);
  };
  fs.forEach((f, k) => {
    if (f.fertil) {
      rango(f.fertil.desde, f.fertil.hasta, { fertil: true });
      marcar(f.fertil.ovulacion, { ovulacion: true });
    }
    // Lo previsto solo desde hoy: una previsión pasada no dice nada.
    rango(f.inicio > hoy ? f.inicio : hoy, f.fin, { prevista: k });
  });
  for (const r of rs) rango(r.inicio, r.fin, { regla: true });
  for (const d of dias) {
    const dentroDeRegla = m.get(d.fecha)?.regla;
    if (d.sintomas.length || d.nota || d.dolor || d.sexo || (d.flujo && !dentroDeRegla)) marcar(d.fecha, { datos: true });
  }
  // Un día de regla real no es previsión, ni ventana fértil del ciclo que acaba de empezar.
  for (const [f, x] of m) if (x.regla) m.set(f, { regla: true, datos: x.datos });
  return m;
}

// ── Notas de salud ───────────────────────────────────────────────────────────

export type NotaSalud =
  | 'cortos'
  | 'largos'
  | 'variables'
  | 'sinRegla'
  | 'reglaLarga'
  | 'abundante'
  | 'entreReglas'
  | 'dolor'
  | 'retraso';

/**
 * "Worth mentioning to a doctor", nunca diagnóstico. Con anticoncepción hormonal solo
 * las de sangrado y dolor (★). Las de ciclo miran los últimos 6 ciclos, sin los 3 de
 * ajuste tras dejar la anticoncepción hormonal. Las de sangrado y dolor miran la regla
 * actual y la anterior, para que un aviso no se quede para siempre.
 */
export function notasSalud(
  dias: Dia[],
  cs: Ciclo[],
  entre: Regla[],
  p: Prevision | null,
  a: Pick<Ajustes, 'hormonal' | 'finHormonal'>,
  hoy: string,
): NotaSalud[] {
  const notas: NotaSalud[] = [];
  const rs = cs.map((c) => c.regla);

  if (!a.hormonal) {
    const tras = a.finHormonal ? cs.filter((c) => c.inicio >= a.finHormonal!).slice(CICLOS_AJUSTE) : cs;
    const largos = recientes(tras).map((c) => c.dias!);
    if (largos.length >= CICLOS_MINIMOS) {
      const m = mediana(largos);
      if (m < CICLO_CORTO) notas.push('cortos');
      if (m > CICLO_LARGO) notas.push('largos');
      if (Math.max(...largos) - Math.min(...largos) > VARIACION_MAX) notas.push('variables');
    }
    if (p) {
      const desde = diasEntre(p.base, hoy);
      if (desde >= SIN_REGLA || desde > CICLOS_PERDIDOS * p.ciclo + p.margen) notas.push('sinRegla');
    }
  }

  const ultimas = rs.slice(-REGLAS_DOLOR);
  const desde = ultimas[0]?.inicio ?? hoy;
  const diasDe = (r: Regla) => dias.filter((d) => dentro(d.fecha, r.inicio, r.fin));
  if (ultimas.some((r) => duracion(r) > REGLA_LARGA)) notas.push('reglaLarga');
  if (ultimas.some((r) => diasDe(r).filter((d) => d.abundante).length >= DIAS_ABUNDANTE)) notas.push('abundante');
  if (entre.some((e) => e.inicio >= desde) || dias.some((d) => d.fecha >= desde && d.sintomas.includes('sangradoSexo')))
    notas.push('entreReglas');
  if (ultimas.length === REGLAS_DOLOR && ultimas.every((r) => diasDe(r).some((d) => d.dolor === 3))) notas.push('dolor');

  if (!a.hormonal && p && diasRetraso(p, hoy) > 0) notas.push('retraso');
  return notas;
}

// ── Historial ────────────────────────────────────────────────────────────────

export type Estadisticas = {
  ciclos: number;
  tipico: number;
  corto: number;
  largo: number;
  variacion: number;
  /** null con menos de 3 ciclos. */
  regular: boolean | null;
  regla: number;
};

export function estadisticas(cs: Ciclo[]): Estadisticas | null {
  const validos = recientes(cs);
  if (!validos.length) return null;
  const largos = validos.map((c) => c.dias!);
  const [corto, largo] = [Math.min(...largos), Math.max(...largos)];
  return {
    ciclos: validos.length,
    tipico: mediana(largos),
    corto,
    largo,
    variacion: largo - corto,
    regular: validos.length >= CICLOS_MINIMOS ? largo - corto <= VARIACION_MAX : null,
    regla: mediana(validos.map((c) => duracion(c.regla))),
  };
}

/** Día del ciclo de una fecha (1 = primer día de regla); null antes de la primera regla. */
export function diaDelCiclo(fecha: string, rs: Regla[]): number | null {
  const r = rs.filter((x) => x.inicio <= fecha).pop();
  return r ? diasEntre(r.inicio, fecha) + 1 : null;
}

export type Frecuencia = { sintoma: Sintoma; veces: number; diaTipico: number | null };

/** Cuántas veces sale cada síntoma y en qué día del ciclo suele salir. Conteo simple. */
export function sintomasFrecuentes(dias: Dia[], rs: Regla[]): Frecuencia[] {
  const por = new Map<Sintoma, number[]>();
  const veces = new Map<Sintoma, number>();
  for (const d of dias) {
    const dia = diaDelCiclo(d.fecha, rs);
    for (const s of d.sintomas) {
      veces.set(s, (veces.get(s) ?? 0) + 1);
      if (dia !== null) por.set(s, [...(por.get(s) ?? []), dia]);
    }
  }
  return [...veces]
    .map(([sintoma, n]) => ({ sintoma, veces: n, diaTipico: por.has(sintoma) ? mediana(por.get(sintoma)!) : null }))
    .sort((a, b) => b.veces - a.veces);
}

/** Un día sin nada no se guarda. */
export const vacio = (d: Dia) => !d.flujo && !d.abundante && !d.dolor && !d.sintomas.length && !d.sexo && !d.nota.trim();

export const diaVacio = (fecha: string): Dia => ({ fecha, flujo: 0, abundante: false, dolor: 0, sintomas: [], sexo: null, nota: '' });

/** La "última regla" de la bienvenida: flujo medio desde esa fecha durante `reglaDicha` días. */
export const diasBienvenida = (inicio: string, regla: number, hoy: string): Dia[] =>
  Array.from({ length: regla }, (_, i) => addDias(inicio, i))
    .filter((f) => f <= hoy)
    .map((f) => ({ ...diaVacio(f), flujo: MEDIO }));
