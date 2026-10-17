// Fechas como 'YYYY-MM-DD' en hora LOCAL, siempre.
//
// Nunca `toISOString()` ni `new Date('2026-01-05')`: los dos pasan por UTC y en España
// desplazan un día cerca de la medianoche. Se construye con `padStart` y se parsea con
// `new Date(y, m - 1, d)`. Sin dependencias y sin `Intl`, para que el resultado sea el
// mismo en cualquier móvil y se pueda verificar en Node.

import type { Idioma } from '@/types';

const dos = (n: number) => String(n).padStart(2, '0');

export const aISO = (d: Date): string =>
  `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

export const desdeISO = (iso: string): Date => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

export const hoyISO = (): string => aISO(new Date());

export const fecha = (anio: number, mes0: number, dia: number): string =>
  aISO(new Date(anio, mes0, dia));

/** `new Date(2026, 0, 32)` es el 1 de febrero: el propio Date resuelve los meses. */
export function addDias(iso: string, delta: number): string {
  const d = desdeISO(iso);
  return fecha(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

/**
 * Días de `a` a `b`, con signo. Va por `Date.UTC` a propósito: en local, el día del
 * cambio de hora mide 23 o 25 horas y la división no da un entero.
 */
export function diasEntre(a: string, b: string): number {
  const [aa, am, ad] = a.split('-').map(Number);
  const [ba, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(ba, bm - 1, bd) - Date.UTC(aa, am - 1, ad)) / 86400000);
}

export const diasDelMes = (anio: number, mes0: number): number =>
  new Date(anio, mes0 + 1, 0).getDate();

/** 1 = lunes … 7 = domingo. */
export const diaSemana = (iso: string): number => ((desdeISO(iso).getDay() + 6) % 7) + 1;

/** Milisegundos del instante `minutos` después de la medianoche local de `iso`. */
export const instante = (iso: string, minutos: number): number => {
  const d = desdeISO(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(minutos / 60), minutos % 60).getTime();
};

// ── Rótulos ──────────────────────────────────────────────────────────────────

const MESES: Record<Idioma, string[]> = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const nombreMes = (mes0: number, idioma: Idioma): string => MESES[idioma][mes0];

/** Lunes primero, como `diaSemana`. */
export const DIAS: Record<Idioma, string[]> = {
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

/** '5 ene' / 'Jan 5'. */
export function fechaCorta(iso: string, idioma: Idioma): string {
  const d = desdeISO(iso);
  const mes = MESES[idioma][d.getMonth()].slice(0, 3);
  return idioma === 'es' ? `${d.getDate()} ${mes}` : `${mes} ${d.getDate()}`;
}

/** 'lunes, 5 de enero' / 'Monday, January 5'. */
export function fechaLarga(iso: string, idioma: Idioma): string {
  const d = desdeISO(iso);
  const dia = DIAS[idioma][diaSemana(iso) - 1];
  const mes = MESES[idioma][d.getMonth()];
  return idioma === 'es' ? `${dia}, ${d.getDate()} de ${mes}` : `${dia}, ${mes} ${d.getDate()}`;
}

/** '5 ene – 4 feb'; si es el mismo mes, 'Oct 21 – 23' / '21 – 23 oct'. */
export function rango(inicio: string, fin: string, idioma: Idioma): string {
  if (inicio === fin) return fechaCorta(inicio, idioma);
  if (inicio.slice(0, 7) !== fin.slice(0, 7)) return `${fechaCorta(inicio, idioma)} – ${fechaCorta(fin, idioma)}`;
  const [di, df] = [Number(inicio.slice(8)), Number(fin.slice(8))];
  const mes = MESES[idioma][Number(inicio.slice(5, 7)) - 1].slice(0, 3);
  return idioma === 'es' ? `${di} – ${df} ${mes}` : `${mes} ${di} – ${df}`;
}

/** Minutos desde medianoche → '9:00' / '9:00 AM'. */
export function hora(minutos: number, idioma: Idioma): string {
  const h = Math.floor(minutos / 60);
  const m = dos(minutos % 60);
  return idioma === 'es' ? `${h}:${m}` : `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}
