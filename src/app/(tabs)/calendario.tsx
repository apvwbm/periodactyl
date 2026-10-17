// Calendario: mes con ‹ ›, hecho con Views. Regla = acento relleno; prevista = borde de
// acento discontinuo, cada ciclo más difuminado; ventana fértil y ovulación solo si se
// pidieron. Siempre con leyenda: el color nunca va solo.

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Ayuda, Mes, Pantalla, Texto, useMesVisto } from '@/components/ui';
import { useFormato, useMarcas } from '@/hooks';
import { fechaLarga } from '@/lib/fechas';
import type { Clave } from '@/lib/i18n';
import { verFertilidad, type Marca } from '@/lib/motor';
import { useApp } from '@/store/app';
import { BORDE, espacio, fuente, RADIO, typo, useColores, useEstilos, type Paleta } from '@/theme';

/** Alfa del borde de cada ciclo previsto: el primero entero, los siguientes más tenues. */
const DIFUMINADO = ['', 'B3', '73'];

export default function Calendario() {
  const { t, idioma } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const hoy = useApp((x) => x.hoy);
  const fertilidad = useApp((x) => verFertilidad(x.ajustes));
  const marcas = useMarcas();
  const visto = useMesVisto(hoy);

  const etiqueta = (iso: string, m: Marca) =>
    [
      fechaLarga(iso, idioma),
      m.regla && t('cal.regla'),
      m.prevista !== undefined && t('cal.prevista'),
      m.fertil && t('cal.fertil'),
      m.ovulacion && t('cal.ovulacion'),
      m.datos && t('cal.datos'),
    ]
      .filter(Boolean)
      .join(', ');

  const leyenda: [Clave, ViewStyle][] = [
    ['cal.regla', { ...s.muestra, backgroundColor: c.acento }],
    ['cal.prevista', { ...s.muestra, ...s.prevista, borderColor: c.acento }],
    ...(fertilidad
      ? ([
          ['cal.fertil', { ...s.muestra, backgroundColor: c.fertilSuave }],
          ['cal.ovulacion', { ...s.puntoLeyenda, backgroundColor: c.fertil }],
        ] as [Clave, ViewStyle][])
      : []),
    ['cal.datos', { ...s.puntoLeyenda, backgroundColor: c.texto2 }],
  ];

  return (
    <Pantalla titulo={t('tab.calendario')}>
      <Mes
        anio={visto.anio}
        mes={visto.mes}
        onMover={visto.mover}
        celda={(iso) => {
          const m = marcas.get(iso) ?? {};
          const futuro = iso > hoy;
          const prevista = m.prevista !== undefined && !m.regla;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/dia', params: { fecha: iso } })}
              disabled={futuro}
              style={[
                s.dia,
                m.fertil && { backgroundColor: c.fertilSuave },
                m.regla && { backgroundColor: c.acento },
                prevista && [s.prevista, { borderColor: c.acento + DIFUMINADO[m.prevista!] }],
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: futuro }}
              accessibilityLabel={etiqueta(iso, m)}
            >
              <Text
                style={[
                  iso === hoy ? s.hoy : typo.dato,
                  { color: m.regla ? c.sobreAcento : futuro ? c.texto2 : c.texto },
                ]}
              >
                {Number(iso.slice(8))}
              </Text>
              <View style={s.puntos}>
                {m.ovulacion && <View style={[s.punto, { backgroundColor: c.fertil }]} />}
                {m.datos && <View style={[s.punto, { backgroundColor: m.regla ? c.sobreAcento : c.texto2 }]} />}
              </View>
            </Pressable>
          );
        }}
      />

      <View style={s.leyenda}>
        {leyenda.map(([clave, muestra]) => (
          <View key={clave} style={s.entrada}>
            <View style={s.hueco}>
              <View style={muestra} />
            </View>
            <Texto estilo="apoyo">{t(clave)}</Texto>
          </View>
        ))}
        <Ayuda>{t('cal.ayuda')}</Ayuda>
      </View>
    </Pantalla>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    dia: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: RADIO },
    prevista: { borderWidth: BORDE, borderStyle: 'dashed' },
    hoy: { ...typo.dato, fontFamily: fuente.display, textDecorationLine: 'underline' },
    puntos: { position: 'absolute', bottom: 4, flexDirection: 'row', gap: 2 },
    punto: { width: 4, height: 4, borderRadius: 2 },
    puntoLeyenda: { width: 8, height: 8, borderRadius: 4 },
    leyenda: { gap: espacio.sm, borderTopWidth: BORDE, borderTopColor: c.linea, paddingTop: espacio.lg },
    entrada: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
    hueco: { width: 20, alignItems: 'center' },
    muestra: { width: 20, height: 20, borderRadius: RADIO },
  });
