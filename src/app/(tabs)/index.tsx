// Hoy: dónde estás del ciclo, el botón de "Hoy me ha bajado" y cómo estás hoy.
// Nunca un estado fértil/no fértil de hoy: la ventana, si se pidió, va como rango.

import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ayuda, Boton, Fila, Icono, Nota, Pantalla, Seccion, Texto } from '@/components/ui';
import { useCiclo, useFormato } from '@/hooks';
import type { Clave } from '@/lib/i18n';
import type { EstadoHoy, NotaSalud } from '@/lib/motor';
import { empezarRegla, terminarRegla, useApp } from '@/store/app';
import { espacio, RADIO, TACTIL, useColores, useEstilos, type Paleta } from '@/theme';
import type { Dia } from '@/types';

export default function Hoy() {
  const { t, rango } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const { estado, prevision: p, ventana, notas, hoy } = useCiclo();
  const abierta = useApp((x) => x.ajustes.reglaAbierta);
  const dia = useApp((x) => x.dias.find((d) => d.fecha === hoy));

  const conRango = estado.tipo === 'antes' || estado.tipo === 'pronto';
  const medico = notas.filter((n) => n !== 'retraso');

  return (
    <Pantalla
      titulo={t('tab.hoy')}
      derecha={
        <Pressable onPress={() => router.push('/ajustes')} hitSlop={8} style={s.ajustes} accessibilityRole="button" accessibilityLabel={t('aj.titulo')}>
          <Icono nombre="settings" tam={22} />
        </Pressable>
      }
    >
      <View style={s.heroe}>
        <Texto estilo="heroe" tono="acento">
          {heroe(estado, t)}
        </Texto>
        {conRango && p && <Texto tono="texto2">{t('hoy.estimacion', { rango: rango(p.desde, p.hasta) })}</Texto>}
        {conRango && p?.estimada && (
          <View style={s.etiqueta}>
            <Icono nombre="info" tam={14} tinte={c.texto2} />
            <Texto estilo="micro" tono="texto2">
              {t(p.ciclos ? 'hoy.estimadaPocos' : 'hoy.estimada')}
            </Texto>
          </View>
        )}
      </View>
      {notas.includes('retraso') && <Nota texto={t('hoy.guiaRetraso')} />}

      {abierta ? (
        <Boton texto={t('hoy.terminar')} variante="secundario" icono="check" onPress={() => terminarRegla(t('hoy.terminada'))} style={s.grande} />
      ) : estado.tipo !== 'regla' ? (
        <Boton texto={t('hoy.empezar')} icono="droplet" onPress={() => empezarRegla(t('hoy.empezada'))} style={s.grande} />
      ) : null}

      <Fila
        titulo={t('hoy.comoEstas')}
        subtitulo={dia ? resumen(dia, t) : t('hoy.comoEstasAyuda')}
        icono="edit-3"
        onPress={() => router.push({ pathname: '/dia', params: { fecha: hoy } })}
        chevron
      />

      {ventana && (
        <View style={s.ventana}>
          <View style={[s.punto, { backgroundColor: c.fertil }]} />
          <View style={{ flex: 1 }}>
            <Texto estilo="cuerpo">{t('hoy.ventana', { rango: rango(ventana.desde, ventana.hasta) })}</Texto>
            <Ayuda>{t('hoy.ventanaAyuda')}</Ayuda>
          </View>
        </View>
      )}

      {medico.length > 0 && (
        <Seccion titulo={t('hoy.medico')} icono="message-circle">
          {medico.map((n) => (
            <Nota key={n} icono="message-circle" texto={t(`nota.${n as Exclude<NotaSalud, 'retraso'>}`)} />
          ))}
        </Seccion>
      )}
    </Pantalla>
  );
}

function heroe(e: EstadoHoy, t: (k: Clave, v?: Record<string, number>) => string): string {
  switch (e.tipo) {
    case 'regla':
      return t('hoy.regla', { n: e.dia });
    case 'antes':
      return e.dias === 1 ? t('hoy.manana') : t('hoy.antes', { n: e.dias });
    case 'pronto':
      return t('hoy.pronto');
    case 'retraso':
      return e.dias === 1 ? t('hoy.retraso1') : t('hoy.retraso', { n: e.dias });
    case 'sinDatos':
      return t('hoy.sinDatos');
  }
}

/** "Medio · Dolor o calambres: leve · Cansancio · Ejercicio: suave". */
function resumen(d: Dia, t: (k: Clave) => string): string {
  return [
    d.flujo ? t(`flujo.${d.flujo}`) : '',
    d.dolor ? `${t('dia.dolor')}: ${t(`dolor.${d.dolor}`).toLowerCase()}` : '',
    ...d.sintomas.map((x) => t(`sin.${x}`)),
    d.ejercicio ? `${t('dia.ejercicio')}: ${t(`ejercicio.${d.ejercicio}`).toLowerCase()}` : '',
    d.deseo !== null ? t(d.deseo ? 'deseo.si' : 'deseo.no') : '',
    d.nota.trim() ? t('dia.nota') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    ajustes: { width: TACTIL, height: TACTIL, alignItems: 'flex-end', justifyContent: 'center' },
    heroe: { gap: espacio.sm, paddingTop: espacio.lg },
    etiqueta: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
    grande: { minHeight: 56 },
    ventana: { flexDirection: 'row', gap: espacio.md, padding: espacio.md, borderRadius: RADIO, backgroundColor: c.fertilSuave },
    punto: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  });
