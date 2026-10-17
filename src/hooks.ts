// Hooks de lectura: traducción, formato y todo lo derivado del store.
//
// Las pantallas no calculan nada: sacan de aquí el estado ya derivado, memoizado sobre
// las porciones del store de las que depende.

import { useMemo } from 'react';

import { fechaCorta, rango } from '@/lib/fechas';
import { traducir, variante, type T } from '@/lib/i18n';
import {
  ciclos,
  estadisticas,
  estadoHoy,
  futuras,
  marcas,
  notasSalud,
  prever,
  proximaVentana,
  separar,
  sintomasFrecuentes,
  sospechoso,
  verFertilidad,
} from '@/lib/motor';
import { useApp } from '@/store/app';

/** Traduce eligiendo sola la variante "sangrado" con anticoncepción hormonal. */
export function useT(): T {
  const idioma = useApp((s) => s.ajustes.idioma);
  const hormonal = useApp((s) => s.ajustes.hormonal);
  return useMemo(() => (clave, vars) => traducir(idioma, variante(clave, hormonal), vars), [idioma, hormonal]);
}

export function useFormato() {
  const idioma = useApp((s) => s.ajustes.idioma);
  const t = useT();
  return useMemo(
    () => ({
      t,
      idioma,
      fecha: (iso: string) => fechaCorta(iso, idioma),
      rango: (a: string, b: string) => rango(a, b, idioma),
      dias: (n: number) => (n === 1 ? t('g.dia') : t('g.dias', { n })),
    }),
    [idioma, t],
  );
}

/** Reglas, ciclos, previsión, estado de hoy, ventana fértil y notas de salud. */
export function useCiclo() {
  const dias = useApp((s) => s.dias);
  const ajustes = useApp((s) => s.ajustes);
  const excluidos = useApp((s) => s.excluidos);
  const vistos = useApp((s) => s.sospechososVistos);
  const hoy = useApp((s) => s.hoy);
  return useMemo(() => {
    const { reglas, entre } = separar(dias);
    const cs = ciclos(reglas, excluidos);
    const p = prever(reglas, cs, ajustes);
    const fs = p ? futuras(p, hoy, verFertilidad(ajustes)) : [];
    return {
      reglas,
      ciclos: cs,
      prevision: p,
      estado: estadoHoy(reglas, p, ajustes.reglaAbierta, hoy),
      futuras: fs,
      ventana: proximaVentana(fs, hoy),
      notas: notasSalud(dias, cs, entre, p, ajustes, hoy),
      sospechosos: new Set(cs.filter((c) => p && sospechoso(c, p) && !vistos.includes(c.inicio)).map((c) => c.inicio)),
      hoy,
    };
  }, [dias, ajustes, excluidos, vistos, hoy]);
}

export function useMarcas() {
  const dias = useApp((s) => s.dias);
  const { reglas, futuras: fs, hoy } = useCiclo();
  return useMemo(() => marcas(dias, reglas, fs, hoy), [dias, reglas, fs, hoy]);
}

export function useHistorial() {
  const dias = useApp((s) => s.dias);
  const { reglas, ciclos: cs } = useCiclo();
  return useMemo(() => ({ cifras: estadisticas(cs), sintomas: sintomasFrecuentes(dias, reglas) }), [dias, reglas, cs]);
}
