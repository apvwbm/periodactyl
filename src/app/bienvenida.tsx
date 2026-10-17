// Bienvenida: el aviso y seis preguntas cortas. Lo opcional se puede saltar y todo se
// puede cambiar luego en Ajustes.
//
// Orden natural: cuándo te bajó, cuánto dura, y luego la anticoncepción. Por eso la
// pregunta del ciclo explica a todas que con píldora, parche o anillo se cuenta la semana
// de descanso (21 + 7 = 28): sumar pastillas + regla fue el error de May.
//
// Empieza en inglés (nada de detectar el idioma del móvil) y va con su propio idioma en
// estado local, para que elegir "Español" en el primer paso traduzca el resto al momento.

import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { permiso } from '../../modules/recordatorio';
import { Ayuda, Boton, Nota, Pantalla, Pasos, Segmentado, SelectorFecha, Texto } from '@/components/ui';
import { REGLA_DEFECTO, CICLO_DEFECTO } from '@/lib/catalogo';
import { AJUSTES_DEFECTO } from '@/lib/esquema';
import { hoyISO } from '@/lib/fechas';
import { IDIOMAS, traducir, variante, type Clave } from '@/lib/i18n';
import { autenticar, completarBienvenida } from '@/store/app';
import { espacio, useColores, useEstilos, type Paleta } from '@/theme';
import type { Idioma } from '@/types';

const AVISO = 0;
const ULTIMA = 1;
const DURACIONES = 2;
const HORMONAL = 3;
const FERTILIDAD = 4;
const RECORDATORIO = 5;
const BLOQUEO = 6;
const TOTAL_PASOS = 7;

export default function Bienvenida() {
  const c = useColores();
  const s = useEstilos(estilos);
  const hoy = hoyISO();
  const [paso, setPaso] = useState(AVISO);
  const [idioma, setIdioma] = useState<Idioma>(AJUSTES_DEFECTO.idioma);
  const [ultima, setUltima] = useState<string | null>(hoy);
  const [ciclo, setCiclo] = useState(CICLO_DEFECTO);
  const [regla, setRegla] = useState(REGLA_DEFECTO);
  const [hormonal, setHormonal] = useState(false);
  const [fertilidad, setFertilidad] = useState(false);
  const [recordatorio, setRecordatorio] = useState(false);
  const t = (k: Clave, v?: Record<string, string | number>) => traducir(idioma, variante(k, hormonal), v);
  const dias = (n: number) => (n === 1 ? t('g.dia') : t('g.dias', { n }));

  const siguiente = () => setPaso(paso + 1);
  // Con anticoncepción hormonal no se pregunta por la fertilidad.
  const anterior = () => setPaso(paso === RECORDATORIO && hormonal ? HORMONAL : paso - 1);

  const elegirHormonal = (si: boolean) => {
    setHormonal(si);
    setPaso(si ? RECORDATORIO : FERTILIDAD);
  };

  const activarRecordatorio = async () => {
    setRecordatorio(await permiso());
    siguiente();
  };

  const terminar = async (bloquear: boolean) => {
    let bloqueo = false;
    if (bloquear) {
      if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) {
        Alert.alert(t('aj.bloqueo'), t('aj.bloqueoNoDisponible'));
      } else bloqueo = await autenticar(t('bloqueo.motivo'));
    }
    completarBienvenida({ idioma, ultima, cicloDicho: ciclo, reglaDicha: regla, hormonal, fertilidad, recordatorio, bloqueo });
    router.replace('/');
  };

  const pie = (
    <View style={s.pie}>
      {paso > AVISO && <Boton texto={t('g.atras')} variante="texto" onPress={anterior} />}
      <View style={{ flex: 1 }} />
      {paso === AVISO && <Boton texto={t('ob.entendido')} onPress={() => siguiente()} />}
      {(paso === ULTIMA || paso === DURACIONES) && <Boton texto={t('g.continuar')} onPress={() => siguiente()} />}
    </View>
  );

  const pregunta = (k: Clave) => (
    <Texto estilo="cifra" style={{ marginTop: espacio.lg }}>
      {t(k)}
    </Texto>
  );

  return (
    <Pantalla pie={pie}>
      <View style={s.progreso} accessibilityLabel={`${paso + 1} / ${TOTAL_PASOS}`}>
        {Array.from({ length: TOTAL_PASOS }, (_, i) => (
          <View key={i} style={[s.marca, { backgroundColor: i <= paso ? c.acento : c.linea }]} />
        ))}
      </View>

      {paso === AVISO && (
        <>
          <Texto estilo="heroe" tono="acento" style={{ marginTop: espacio.lg }}>
            PERIODactyl
          </Texto>
          <Texto estilo="cuerpo">{t('ob.titulo')}</Texto>
          <Segmentado opciones={IDIOMAS.map((i) => ({ valor: i.codigo, texto: i.nombre }))} valor={idioma} onCambio={setIdioma} />
          <Nota icono="lock" texto={t('aviso')} />
        </>
      )}

      {paso === ULTIMA && (
        <>
          {pregunta('ob.ultima')}
          <SelectorFecha valor={ultima ?? hoy} onCambio={setUltima} max={hoy} />
          <Ayuda>{t('ob.ultimaAyuda')}</Ayuda>
          <Boton
            texto={t('ob.noRecuerdo')}
            variante="secundario"
            onPress={() => {
              setUltima(null);
              siguiente();
            }}
          />
        </>
      )}

      {paso === DURACIONES && (
        <>
          {pregunta('ob.duraciones')}
          <Pasos
            etiqueta={t('aj.cicloDicho')}
            texto={dias(ciclo)}
            onMenos={ciclo > 15 ? () => setCiclo(ciclo - 1) : undefined}
            onMas={ciclo < 60 ? () => setCiclo(ciclo + 1) : undefined}
          />
          <Pasos
            etiqueta={t('aj.reglaDicha')}
            texto={dias(regla)}
            onMenos={regla > 1 ? () => setRegla(regla - 1) : undefined}
            onMas={regla < 10 ? () => setRegla(regla + 1) : undefined}
          />
          <Ayuda>{t('ob.duracionesAyuda')}</Ayuda>
          <Boton
            texto={t('ob.noSe')}
            variante="secundario"
            onPress={() => {
              setCiclo(CICLO_DEFECTO);
              setRegla(REGLA_DEFECTO);
              siguiente();
            }}
          />
        </>
      )}

      {paso === HORMONAL && (
        <>
          {pregunta('ob.hormonal')}
          <Texto tono="texto2">{t('ob.hormonalAyuda')}</Texto>
          <Boton texto={t('g.si')} variante="secundario" onPress={() => elegirHormonal(true)} />
          <Boton texto={t('g.no')} variante="secundario" onPress={() => elegirHormonal(false)} />
        </>
      )}

      {paso === FERTILIDAD && (
        <>
          {pregunta('ob.fertilidad')}
          <Texto tono="texto2">{t('ob.fertilidadAyuda')}</Texto>
          <Boton
            texto={t('ob.mostrar')}
            variante="secundario"
            onPress={() => {
              setFertilidad(true);
              siguiente();
            }}
          />
          <Boton
            texto={t('g.ahoraNo')}
            variante="secundario"
            onPress={() => {
              setFertilidad(false);
              siguiente();
            }}
          />
        </>
      )}

      {paso === RECORDATORIO && (
        <>
          {pregunta('ob.recordatorio')}
          <Texto tono="texto2">{t('ob.recordatorioAyuda')}</Texto>
          <Boton texto={t('g.activar')} icono="bell" onPress={() => void activarRecordatorio()} />
          <Boton
            texto={t('g.ahoraNo')}
            variante="secundario"
            onPress={() => {
              setRecordatorio(false);
              siguiente();
            }}
          />
        </>
      )}

      {paso === BLOQUEO && (
        <>
          {pregunta('ob.bloqueo')}
          <Texto tono="texto2">{t('ob.bloqueoAyuda')}</Texto>
          <Boton texto={t('ob.activarBloqueo')} icono="lock" onPress={() => void terminar(true)} />
          <Boton texto={t('g.saltar')} variante="secundario" onPress={() => void terminar(false)} />
        </>
      )}
    </Pantalla>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    pie: { flexDirection: 'row', alignItems: 'center' },
    progreso: { flexDirection: 'row', gap: espacio.xs, paddingTop: espacio.lg },
    marca: { flex: 1, height: 3, backgroundColor: c.linea },
  });
