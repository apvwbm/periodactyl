// Informe para el médico: un CSV por día de ciclo. Puro y sin Expo, para poder
// verificarlo en Node. En consulta lo que más ayuda es flujo, duración, sangrados entre
// reglas, dolor y ánimo por día de ciclo; el sexo no va (no aporta y es privado).

import { diaDelCiclo, type Regla } from './motor';
import type { Dia, Dolor, Flujo, Sintoma } from '@/types';

const celda = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export type Etiquetas = {
  cabecera: string[];
  flujo: (f: Flujo) => string;
  dolor: (d: Dolor) => string;
  sintoma: (s: Sintoma) => string;
  si: string;
};

export function informe(dias: Dia[], rs: Regla[], e: Etiquetas): string {
  const filas = [...dias]
    .filter((d) => d.flujo || d.abundante || d.dolor || d.sintomas.length || d.nota.trim())
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .map((d) =>
      [
        d.fecha,
        diaDelCiclo(d.fecha, rs) ?? '',
        d.flujo ? e.flujo(d.flujo) : '',
        d.abundante ? e.si : '',
        d.dolor ? e.dolor(d.dolor) : '',
        d.sintomas.map(e.sintoma).join('; '),
        d.nota.trim(),
      ]
        .map(celda)
        .join(','),
    );
  return [e.cabecera.map(celda).join(','), ...filas].join('\n');
}
