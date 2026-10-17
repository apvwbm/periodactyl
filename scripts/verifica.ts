// Verificación de la lógica pura: `npm run verifica`.
//
// Asserts a mano, agrupados por bloques, sin framework: todo lo que se verifica son
// funciones puras y el script entero tarda un segundo. Las migraciones se prueban con
// el `node:sqlite` de Node. Lo único que NO se puede probar aquí es lo nativo
// (SQLCipher, recordatorio, pantalla segura): eso se prueba en el móvil.

// El cambio de hora de España, pase lo que pase en la máquina que lo ejecute.
process.env.TZ = 'Europe/Madrid';

import { DatabaseSync } from 'node:sqlite';

import { informe } from '../src/lib/csv';
import { AJUSTES_DEFECTO, mezclarAjustes, migrar, TABLAS, VERSION_ESQUEMA } from '../src/lib/esquema';
import { addDias, diasEntre, fechaCorta, hora, instante, rango } from '../src/lib/fechas';
import { traducir, variante } from '../src/lib/i18n';
import {
  ciclos,
  cicloValido,
  diaDelCiclo,
  diasBienvenida,
  diasRetraso,
  estadisticas,
  estadoHoy,
  fertil,
  futuras,
  marcas,
  notasSalud,
  prever,
  proximaVentana,
  reglas,
  rellenoAbierta,
  separar,
  sintomasFrecuentes,
  sospechoso,
  vacio,
  verFertilidad,
  type Regla,
} from '../src/lib/motor';
import type { Ajustes, Dia, Flujo } from '../src/types';

let fallos = 0;
let total = 0;
const igual = (nombre: string, real: unknown, esperado: unknown) => {
  total++;
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    fallos++;
    console.log(`  ✗ ${nombre}\n      esperado ${b}\n      real     ${a}`);
  }
};
const ok = (nombre: string, cond: boolean) => igual(nombre, cond, true);
const bloque = (nombre: string) => console.log(`── ${nombre} ──`);

// ── Fábricas ─────────────────────────────────────────────────────────────────

const dia = (fecha: string, flujo: Flujo = 0, extra: Partial<Dia> = {}): Dia => ({
  fecha,
  flujo,
  abundante: false,
  dolor: 0,
  sintomas: [],
  sexo: null,
  nota: '',
  ...extra,
});
/** `n` días de regla con flujo medio desde `inicio`. */
const regla = (inicio: string, n = 5, extra: Partial<Dia> = {}): Dia[] =>
  Array.from({ length: n }, (_, i) => dia(addDias(inicio, i), 3, extra));
/** Reglas de 5 días separadas por los ciclos dados, desde `inicio`. */
function historial(inicio: string, largos: number[]): Dia[] {
  const dias: Dia[] = [];
  let f = inicio;
  for (const l of largos) {
    dias.push(...regla(f));
    f = addDias(f, l);
  }
  return [...dias, ...regla(f)];
}
const A: Ajustes = AJUSTES_DEFECTO;
/** Todo lo derivado, como lo hace `hooks.ts`. */
function derivar(dias: Dia[], a: Partial<Ajustes> = {}, excluidos: string[] = []) {
  const aj = { ...A, ...a };
  const { reglas: rs, entre } = separar(dias);
  const cs = ciclos(rs, excluidos);
  const p = prever(rs, cs, aj);
  return { rs, entre, cs, p, aj };
}
const notas = (dias: Dia[], hoy: string, a: Partial<Ajustes> = {}) => {
  const d = derivar(dias, a);
  return notasSalud(dias, d.cs, d.entre, d.p, d.aj, hoy);
};

// ── fechas ───────────────────────────────────────────────────────────────────
bloque('fechas');
igual('addDias cruza meses', addDias('2026-01-30', 3), '2026-02-02');
igual('addDias cruza el cambio de hora', addDias('2026-10-24', 2), '2026-10-26');
igual('diasEntre con el cambio de hora de octubre', diasEntre('2026-10-10', '2026-11-07'), 28);
igual('diasEntre con el cambio de hora de marzo', diasEntre('2026-03-20', '2026-04-17'), 28);
igual('fechaCorta en', fechaCorta('2026-10-21', 'en'), 'Oct 21');
igual('rango mismo mes en', rango('2026-10-21', '2026-10-23', 'en'), 'Oct 21 – 23');
igual('rango mismo mes es', rango('2026-10-21', '2026-10-23', 'es'), '21 – 23 oct');
igual('rango entre meses', rango('2026-10-30', '2026-11-02', 'es'), '30 oct – 2 nov');
igual('hora es', hora(540, 'es'), '9:00');
igual('hora en', hora(13 * 60 + 30, 'en'), '1:30 PM');
igual('hora en medianoche', hora(0, 'en'), '12:00 AM');
igual('instante es la hora local', new Date(instante('2026-10-25', 540)).getHours(), 9);

// ── reglas ───────────────────────────────────────────────────────────────────
bloque('reglas');
igual('un hueco de 2 días une', reglas([dia('2026-10-01', 3), dia('2026-10-04', 2)]), [{ inicio: '2026-10-01', fin: '2026-10-04' }]);
igual('un hueco de 3 días separa', reglas([dia('2026-10-01', 3), dia('2026-10-05', 2), dia('2026-10-20', 3)]).length, 2);
igual('solo manchado no crea regla', reglas([dia('2026-10-01', 1), dia('2026-10-02', 1)]), []);
igual('el manchado en el hueco no rompe la regla', reglas([dia('2026-10-01', 3), dia('2026-10-02', 1), dia('2026-10-03', 1), dia('2026-10-04', 2)]), [
  { inicio: '2026-10-01', fin: '2026-10-04' },
]);
igual('el manchado antes no adelanta el inicio', reglas([dia('2026-09-30', 1), ...regla('2026-10-01', 3)])[0].inicio, '2026-10-01');
igual('desordenado da lo mismo', reglas([dia('2026-10-04', 2), dia('2026-10-01', 3)]), [{ inicio: '2026-10-01', fin: '2026-10-04' }]);
{
  const s = separar([...regla('2026-10-01'), dia('2026-10-09', 2)]);
  igual('un sangrado a menos de 10 días del inicio no es regla', s.reglas.length, 1);
  igual('…es un sangrado entre reglas', s.entre, [{ inicio: '2026-10-09', fin: '2026-10-09' }]);
}

// ── ciclos y previsión ───────────────────────────────────────────────────────
bloque('previsión');
{
  const { cs, p } = derivar(historial('2026-01-01', [28, 30, 29, 27, 31, 29]));
  igual('ciclos 28, 30, 29, 27, 31, 29 → mediana 29', p?.ciclo, 29);
  igual('…rango ±2', p?.margen, 2);
  igual('…no es estimación', p?.estimada, false);
  igual('…ciclo en curso sin duración', cs[cs.length - 1].dias, null);
  igual('…regla típica 5', p?.regla, 5);
  igual('…próxima = último inicio + 29', p?.inicio, addDias(p!.base, 29));
  igual('…rango de fechas', [p?.desde, p?.hasta], [addDias(p!.inicio, -2), addDias(p!.inicio, 2)]);
}
{
  const { p } = derivar(historial('2026-01-01', [40, 25, 30, 29, 28, 30, 27, 31, 29]));
  igual('solo cuentan los últimos 6', p?.ciclo, 29);
}
{
  const { p } = derivar(historial('2026-01-01', [30, 31]), { cicloDicho: 26, reglaDicha: 4 });
  igual('con 2 ciclos usa el valor dicho', p?.ciclo, 26);
  igual('…y la regla dicha', p?.regla, 4);
  ok('…y marca "estimate"', p?.estimada === true);
}
igual('sin reglas no hay previsión', derivar([]).p, null);
{
  const rs: Regla[] = ['2026-01-01', '2026-01-10', '2026-04-11', '2026-05-09', '2026-06-06', '2026-07-04'].map((f) => ({ inicio: f, fin: f }));
  const cs = ciclos(rs, []);
  igual('9 días se descarta', cs[0].valido, false);
  igual('91 días se descarta', cs[1].valido, false);
  ok('10 y 90 son válidos', cicloValido(10) && cicloValido(90));
  igual('…y no cuentan para la previsión', [prever(rs, cs, A)?.ciclo, prever(rs, cs, A)?.margen], [28, 1]);
}
{
  const dias = historial('2026-01-01', [29, 28, 62, 30, 29]);
  const { cs, p } = derivar(dias);
  igual('un ciclo de 62 entre ciclos de ~29 se marca sospechoso', cs.map((c) => sospechoso(c, p!)), [false, false, true, false, false, false]);
  const ex = derivar(dias, {}, [cs[2].inicio]);
  igual('excluido no cuenta', ex.cs[2].valido, false);
  igual('…ni se vuelve a marcar sospechoso', sospechoso(ex.cs[2], ex.p!), false);
  igual('…y la previsión usa los otros 4', ex.p?.ciclo, 29);
  igual('…con su rango', ex.p?.margen, 1);
}

// ── hoy y retraso ────────────────────────────────────────────────────────────
bloque('hoy y retraso');
{
  const dias = historial('2026-01-01', [28, 28, 28]);
  const { rs, p } = derivar(dias);
  const fin = p!.hasta;
  igual('antes del rango, cuenta atrás', estadoHoy(rs, p, null, addDias(p!.inicio, -5)), { tipo: 'antes', dias: 5 });
  igual('dentro del rango, cualquier día', estadoHoy(rs, p, null, p!.inicio), { tipo: 'pronto' });
  igual('el día después del rango → 1 día de retraso', estadoHoy(rs, p, null, addDias(fin, 1)), { tipo: 'retraso', dias: 1 });
  igual('diasRetraso el último día del rango', diasRetraso(p!, fin), 0);
  igual('con regla, el día de la regla', estadoHoy(rs, p, null, addDias(p!.base, 2)), { tipo: 'regla', dia: 3 });
  igual('regla abierta: sigue aunque no haya flujo hoy', estadoHoy(rs, p, p!.base, addDias(p!.base, 6)), { tipo: 'regla', dia: 7 });
  igual('sin datos', estadoHoy([], null, null, '2026-10-17'), { tipo: 'sinDatos' });
}
{
  // Regla abierta con "Hoy me ha bajado".
  const hoy = '2026-10-17';
  igual('rellena hasta hoy', rellenoAbierta([dia('2026-10-15', 3)], '2026-10-15', hoy, 5), { rellenar: ['2026-10-16', '2026-10-17'], cerrar: false });
  igual('no pasa de la duración y se cierra', rellenoAbierta([dia('2026-10-10', 3)], '2026-10-10', hoy, 5), {
    rellenar: ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14'],
    cerrar: true,
  });
  igual('no pisa un día corregido a mano', rellenoAbierta([dia('2026-10-15', 3), dia('2026-10-16', 0), dia('2026-10-17', 2)], '2026-10-15', hoy, 5), {
    rellenar: [],
    cerrar: false,
  });
  igual('si se borra el primer día, se cierra', rellenoAbierta([], '2026-10-15', hoy, 5), { rellenar: [], cerrar: true });
  igual('bienvenida: la regla dicha hasta hoy', diasBienvenida('2026-10-15', 5, hoy).map((d) => [d.fecha, d.flujo]), [
    ['2026-10-15', 3],
    ['2026-10-16', 3],
    ['2026-10-17', 3],
  ]);
}

// ── fertilidad ───────────────────────────────────────────────────────────────
bloque('fertilidad');
igual('próxima regla 15-11 → ovulación 02-11 y ventana 28-10 – 02-11', fertil('2026-11-15'), {
  ovulacion: '2026-11-02',
  desde: '2026-10-28',
  hasta: '2026-11-02',
});
ok('apagada por defecto', !verFertilidad(A));
ok('encendida si se pide', verFertilidad({ fertilidad: true, hormonal: false }));
ok('con anticoncepción hormonal, nada', !verFertilidad({ fertilidad: true, hormonal: true }));
{
  const { p } = derivar(historial('2026-01-01', [28, 28, 28]));
  const fs = futuras(p!, p!.base, true);
  igual('3 ciclos futuros', fs.length, 3);
  igual('…cada uno un ciclo después', diasEntre(fs[0].inicio, fs[1].inicio), 28);
  igual('…sin fertilidad si no se pide', futuras(p!, p!.base, false)[0].fertil, null);
  igual('la próxima ventana que no ha terminado', proximaVentana(fs, addDias(fs[0].inicio, -5)), fs[1].fertil);
  const tarde = futuras(p!, addDias(p!.hasta, 3), false);
  igual('con retraso, la siguiente se cuenta desde hoy', tarde[0].inicio, addDias(p!.hasta, 3));
}

// ── calendario ───────────────────────────────────────────────────────────────
bloque('calendario');
{
  const dias = [...historial('2026-01-01', [28, 28, 28]), dia('2026-01-15', 0, { nota: 'x' }), dia('2026-01-16', 1)];
  const { rs, p } = derivar(dias);
  const hoy = addDias(p!.base, 10);
  const m = marcas(dias, rs, futuras(p!, hoy, true), hoy);
  ok('día de regla', m.get('2026-01-03')?.regla === true);
  ok('nota → puntito', m.get('2026-01-15')?.datos === true);
  ok('manchado → puntito', m.get('2026-01-16')?.datos === true);
  igual('regla prevista con su ciclo', m.get(p!.inicio)?.prevista, 0);
  igual('la tercera, más difuminada', m.get(addDias(p!.inicio, 56))?.prevista, 2);
  ok('ovulación estimada', m.get(addDias(p!.inicio, -13))?.ovulacion === true);
  ok('ventana fértil', m.get(addDias(p!.inicio, -18))?.fertil === true);
  ok('nada previsto antes de hoy', ![...m].some(([f, x]) => x.prevista !== undefined && f < hoy));
}

// ── notas de salud ───────────────────────────────────────────────────────────
bloque('notas de salud');
{
  const corto = historial('2026-01-01', [20, 20, 20, 20]);
  const hoyCorto = addDias(corto[corto.length - 1].fecha, 5);
  ok('ciclos cortos: sí', notas(corto, hoyCorto).includes('cortos'));
  const normal = historial('2026-01-01', [28, 30, 29, 27, 31, 29]);
  const hoyNormal = addDias(normal[normal.length - 1].fecha, 5);
  igual('ciclos normales: ninguna nota', notas(normal, hoyNormal), []);
  const largo = historial('2026-01-01', [37, 38, 36]);
  ok('ciclos largos: sí', notas(largo, addDias(largo[largo.length - 1].fecha, 5)).includes('largos'));
  ok('ciclos largos con 2 ciclos: no', !notas(historial('2026-01-01', [37, 38]), '2026-03-20').includes('largos'));
  const variable = historial('2026-01-01', [25, 35, 28, 30]);
  ok('ciclos variables (10 días): sí', notas(variable, addDias(variable[variable.length - 1].fecha, 5)).includes('variables'));
  ok('ciclos variables (4 días): no', !notas(normal, hoyNormal).includes('variables'));

  const base = historial('2026-01-01', [28, 28, 28]);
  const ultimo = '2026-03-26';
  ok('sin regla 90 días: sí', notas(base, addDias(ultimo, 90)).includes('sinRegla'));
  ok('sin regla 40 días: no', !notas(base, addDias(ultimo, 40)).includes('sinRegla'));
  ok('sin regla: 3 ciclos perdidos antes de 90 días', notas(historial('2026-01-01', [21, 21, 21]), addDias('2026-03-05', 66)).includes('sinRegla'));

  ok('regla larga (8 días): sí', notas([...regla('2026-01-01'), ...regla('2026-01-29', 8)], '2026-02-10').includes('reglaLarga'));
  ok('regla larga (7 días): no', !notas([...regla('2026-01-01'), ...regla('2026-01-29', 7)], '2026-02-10').includes('reglaLarga'));

  const abundante = (n: number) => [...regla('2026-01-01'), ...regla('2026-01-29', 2, { abundante: true }).slice(0, n), ...regla('2026-01-31', 3)];
  ok('sangrado abundante 2 días: sí', notas(abundante(2), '2026-02-05').includes('abundante'));
  ok('sangrado abundante 1 día: no', !notas(abundante(1), '2026-02-05').includes('abundante'));

  ok('sangrado entre reglas: sí', notas([...regla('2026-01-01'), dia('2026-01-09', 2)], '2026-01-12').includes('entreReglas'));
  ok('tras el sexo: sí', notas([...regla('2026-01-01'), dia('2026-01-14', 0, { sintomas: ['sangradoSexo'] })], '2026-01-15').includes('entreReglas'));
  ok('manchado entre reglas: no', !notas([...regla('2026-01-01'), dia('2026-01-09', 1)], '2026-01-12').includes('entreReglas'));

  const dolor = (ambas: boolean) => [...regla('2026-01-01', 5, { dolor: ambas ? 3 : 2 }), ...regla('2026-01-29', 5, { dolor: 3 })];
  ok('dolor fuerte en 2 reglas seguidas: sí', notas(dolor(true), '2026-02-05').includes('dolor'));
  ok('dolor fuerte en 1: no', !notas(dolor(false), '2026-02-05').includes('dolor'));

  const { p } = derivar(base);
  ok('retraso: sí', notas(base, addDias(p!.hasta, 1)).includes('retraso'));
  ok('retraso el último día del rango: no', !notas(base, p!.hasta).includes('retraso'));

  ok('con anticoncepción hormonal, sin notas de ciclo', !notas(corto, hoyCorto, { hormonal: true }).includes('cortos'));
  ok('…ni retraso', !notas(base, addDias(p!.hasta, 1), { hormonal: true }).includes('retraso'));
  ok('…pero sí las ★', notas([...regla('2026-01-01'), ...regla('2026-01-29', 8)], '2026-02-10', { hormonal: true }).includes('reglaLarga'));

  ok('tras dejarla, 3 ciclos de ajuste', !notas(corto, hoyCorto, { finHormonal: '2026-01-01' }).includes('cortos'));
  const masCorto = historial('2026-01-01', [20, 20, 20, 20, 20, 20]);
  ok('…y después vuelven', notas(masCorto, addDias(masCorto[masCorto.length - 1].fecha, 5), { finHormonal: '2026-01-01' }).includes('cortos'));
}

// ── historial ────────────────────────────────────────────────────────────────
bloque('historial');
{
  const dias = historial('2026-01-01', [28, 30, 29, 27, 31, 29]);
  const { rs, cs } = derivar(dias);
  igual('estadísticas', estadisticas(cs), { ciclos: 6, tipico: 29, corto: 27, largo: 31, variacion: 4, regular: true, regla: 5 });
  igual('sin ciclos, sin estadísticas', estadisticas(derivar(regla('2026-01-01')).cs), null);
  igual('con 2, aún no se sabe si es regular', estadisticas(derivar(historial('2026-01-01', [28, 29])).cs)?.regular, null);
  igual('irregular', estadisticas(derivar(historial('2026-01-01', [25, 35, 28])).cs)?.regular, false);
  igual('día del ciclo', diaDelCiclo('2026-01-03', rs), 3);
  igual('día del ciclo antes de la primera regla', diaDelCiclo('2025-12-31', rs), null);
  igual('día del ciclo cruzando el cambio de hora', diaDelCiclo('2026-11-07', [{ inicio: '2026-10-10', fin: '2026-10-14' }]), 29);
  const sintomas = [
    dia('2026-01-02', 3, { sintomas: ['cabeza', 'cansancio'] }),
    dia('2026-01-04', 3, { sintomas: ['cabeza'] }),
    dia('2026-01-30', 3, { sintomas: ['cabeza'] }),
  ];
  igual('síntomas más frecuentes y su día típico', sintomasFrecuentes(sintomas, reglas(sintomas)), [
    { sintoma: 'cabeza', veces: 3, diaTipico: 1 },
    { sintoma: 'cansancio', veces: 1, diaTipico: 1 },
  ]);
  ok('un día sin nada está vacío', vacio(dia('2026-01-01')));
  ok('un día con nota no', !vacio(dia('2026-01-01', 0, { nota: 'x' })));
}

// ── migraciones ──────────────────────────────────────────────────────────────
bloque('migraciones');
{
  const base = new DatabaseSync(':memory:');
  const version = () => (base.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  igual('migra de 0 a la última', migrar((sql) => base.exec(sql), version()), VERSION_ESQUEMA);
  igual('user_version actualizada', version(), VERSION_ESQUEMA);
  const tablas = (base.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
  ok('existen todas las tablas', TABLAS.every((t) => tablas.includes(t)));
  let ejecuciones = 0;
  migrar(() => ejecuciones++, version());
  igual('volver a migrar no hace nada', ejecuciones, 0);
  let futura = false;
  try {
    migrar(() => {}, VERSION_ESQUEMA + 1);
  } catch {
    futura = true;
  }
  ok('una base de una versión futura se rechaza', futura);

  let filas = 0;
  const insertar = (flujo: number, dolor = 0) => {
    try {
      base.prepare('INSERT INTO dias (fecha, flujo, dolor) VALUES (?, ?, ?)').run(`2026-10-${10 + ++filas}`, flujo, dolor);
      return true;
    } catch {
      return false;
    }
  };
  ok('la base acepta flujo 0–4', insertar(0) && insertar(4));
  ok('la base rechaza flujo 5', !insertar(5));
  ok('la base rechaza dolor 4', !insertar(0, 4));

  // Una migración que falla no deja nada a medias.
  const otra = new DatabaseSync(':memory:');
  let fallo = false;
  try {
    migrar((sql) => otra.exec(sql.replace('CREATE TABLE dias', 'CREATE TABLA dias')), 0);
  } catch {
    fallo = true;
  }
  const tras = (otra.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get() as { n: number }).n;
  ok('migración rota: falla y no deja tablas a medias', fallo && tras === 0);

  igual('ajustes guardados se mezclan con los defectos', mezclarAjustes({ idioma: 'es', recordatorio: { activo: true } as Ajustes['recordatorio'] }).recordatorio, {
    ...A.recordatorio,
    activo: true,
  });
}

// ── textos e informe ─────────────────────────────────────────────────────────
bloque('textos e informe');
igual('traducir con variables', traducir('es', 'hoy.antes', { n: 5 }), 'Te bajará en unos 5 días');
igual('inglés por defecto', A.idioma, 'en');
igual('variante hormonal', traducir('en', variante('hoy.regla', true), { n: 2 }), 'Day 2 of your bleed');
igual('sin variante, la normal', variante('hoy.medico', true), 'hoy.medico');
{
  // Ninguna palabra de la lista prohibida (PLAN.md §11) fuera de las negaciones del aviso.
  const prohibidas = /birth control|natural family|avoid pregnancy|safe days|can't get pregnant|get pregnant|trying to conceive|boost your chances|plan a pregnancy|fertile today|detect|diagnos|accurate|clinically|recommended|might be pregnant/i;
  const textos = (['en', 'es'] as const).flatMap((i) => (['hoy.ventana', 'hoy.ventanaAyuda', 'ob.fertilidadAyuda', 'cal.fertil', 'hoy.guiaRetraso', 'nota.sinRegla'] as const).map((k) => traducir(i, k)));
  ok('sin palabras prohibidas', textos.every((t) => !prohibidas.test(t)));
}
{
  const dias = [dia('2026-01-01', 3), dia('2026-01-02', 3, { abundante: true, dolor: 3, sintomas: ['cabeza', 'animo'], nota: 'Dolor, "fuerte"' }), dia('2026-01-10', 0, { sexo: 'protegido' })];
  const filas = informe(dias, reglas(dias), {
    cabecera: ['fecha', 'dia_ciclo', 'flujo', 'coagulos', 'dolor', 'sintomas', 'nota'],
    flujo: (f) => traducir('es', `flujo.${f}`),
    dolor: (d) => traducir('es', `dolor.${d}`),
    sintoma: (s) => traducir('es', `sin.${s}`),
    si: 'sí',
  }).split('\n');
  igual('informe: cabecera', filas[0], 'fecha,dia_ciclo,flujo,coagulos,dolor,sintomas,nota');
  igual('informe: día sencillo', filas[1], '2026-01-01,1,Medio,,,,');
  igual('informe: día con todo y comillas escapadas', filas[2], '2026-01-02,2,Medio,sí,Fuerte,Dolor de cabeza; Ánimo bajo,"Dolor, ""fuerte"""');
  igual('informe: el sexo no sale', filas.length, 3);
}

console.log(fallos ? `\n${fallos} de ${total} asserts FALLAN` : `\n${total} asserts OK`);
process.exit(fallos ? 1 : 0);
