// Un día: flujo, dolor, ánimo, síntomas, ejercicio, sexo y, si hace falta, una nota.
// Cada cambio se guarda al momento; ‹ › mueve de día sin salir. No se apunta el futuro.
//
// La lista de síntomas sale de la investigación (Bruinvels 2021, datos de Clue, NICE
// NG73) más lo que pidió el usuario (ánimo, antojos, ejercicio, ganas): lo que sirve para
// ver patrones o contarlo al médico. No se añaden más sin preguntar.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Boton, Campo, Chip, Chips, Icono, Interruptor, Pantalla, Seccion, Segmentado } from '@/components/ui';
import { useFormato } from '@/hooks';
import { addDias, fechaLarga } from '@/lib/fechas';
import { diaVacio } from '@/lib/motor';
import { guardarDia, useApp } from '@/store/app';
import { espacio, TACTIL } from '@/theme';
import { ANIMOS, SINTOMAS, type Dia, type Dolor, type Ejercicio, type Flujo, type Sexo, type Sintoma } from '@/types';

const FLUJOS: Flujo[] = [0, 1, 2, 3, 4];
const DOLORES: Dolor[] = [0, 1, 2, 3];
const EJERCICIOS: Ejercicio[] = [0, 1, 2, 3];
const SEXOS: Sexo[] = ['protegido', 'sinProteccion'];

export default function PantallaDia() {
  const { t, idioma } = useFormato();
  const hoy = useApp((x) => x.hoy);
  const params = useLocalSearchParams<{ fecha?: string }>();
  const [fecha, setFecha] = useState(params.fecha && params.fecha <= hoy ? params.fecha : hoy);
  const guardado = useApp((x) => x.dias.find((d) => d.fecha === fecha));
  const d = guardado ?? diaVacio(fecha);
  const [verNota, setVerNota] = useState(false);

  const cambiar = (parcial: Partial<Dia>) => guardarDia({ ...d, ...parcial });
  const alternar = (x: Sintoma) => cambiar({ sintomas: d.sintomas.includes(x) ? d.sintomas.filter((y) => y !== x) : [...d.sintomas, x] });
  const mover = (delta: number) => {
    setFecha(addDias(fecha, delta));
    setVerNota(false);
  };

  const flecha = (icono: string, delta: number, activa: boolean) => (
    <Pressable
      onPress={() => mover(delta)}
      disabled={!activa}
      style={[s.flecha, !activa && { opacity: 0.3 }]}
      accessibilityRole="button"
      accessibilityLabel={icono === 'chevron-left' ? '‹' : '›'}
    >
      <Icono nombre={icono} />
    </Pressable>
  );

  const etiquetas = (lista: readonly Sintoma[]) => (
    <Chips>
      {lista.map((x) => (
        <Chip key={x} multiple texto={t(`sin.${x}`)} activo={d.sintomas.includes(x)} onPress={() => alternar(x)} />
      ))}
    </Chips>
  );

  return (
    <Pantalla
      titulo={fechaLarga(fecha, idioma)}
      atras
      derecha={
        <View style={{ flexDirection: 'row' }}>
          {flecha('chevron-left', -1, true)}
          {flecha('chevron-right', 1, fecha < hoy)}
        </View>
      }
      pie={<Boton texto={t('g.hecho')} onPress={() => router.back()} />}
    >
      <Seccion titulo={t('dia.flujo')} icono="droplet">
        <Segmentado
          opciones={FLUJOS.map((f) => ({ valor: f, texto: t(`flujo.${f}`) }))}
          valor={d.flujo}
          onCambio={(flujo) => cambiar({ flujo, abundante: flujo >= 2 && d.abundante })}
        />
        {d.flujo >= 2 && <Interruptor titulo={t('dia.abundante')} valor={d.abundante} onCambio={(abundante) => cambiar({ abundante })} />}
      </Seccion>

      <Seccion titulo={t('dia.dolor')} icono="zap">
        <Segmentado opciones={DOLORES.map((x) => ({ valor: x, texto: t(`dolor.${x}`) }))} valor={d.dolor} onCambio={(dolor) => cambiar({ dolor })} />
      </Seccion>

      <Seccion titulo={t('dia.animo')} icono="smile">
        {etiquetas(ANIMOS)}
      </Seccion>

      <Seccion titulo={t('dia.sintomas')} icono="thermometer">
        {etiquetas(SINTOMAS)}
      </Seccion>

      <Seccion titulo={t('dia.ejercicio')} icono="activity">
        <Segmentado
          opciones={EJERCICIOS.map((x) => ({ valor: x, texto: t(`ejercicio.${x}`) }))}
          valor={d.ejercicio}
          onCambio={(ejercicio) => cambiar({ ejercicio })}
        />
      </Seccion>

      <Seccion titulo={t('dia.sexo')} icono="heart">
        <Chips>
          {[true, false].map((x) => (
            <Chip key={String(x)} texto={t(x ? 'deseo.si' : 'deseo.no')} activo={d.deseo === x} onPress={() => cambiar({ deseo: d.deseo === x ? null : x })} />
          ))}
        </Chips>
        <Chips>
          {SEXOS.map((x) => (
            <Chip key={x} texto={t(`sexo.${x}`)} activo={d.sexo === x} onPress={() => cambiar({ sexo: d.sexo === x ? null : x })} />
          ))}
        </Chips>
      </Seccion>

      {/* La nota, discreta: solo un enlace hasta que se usa. */}
      {verNota || d.nota ? (
        <Seccion titulo={t('dia.nota')} icono="edit-3">
          <Campo value={d.nota} onChangeText={(nota) => cambiar({ nota })} multiline autoFocus={!d.nota} accessibilityLabel={t('dia.nota')} style={s.nota} />
        </Seccion>
      ) : (
        <Boton texto={t('dia.anadirNota')} variante="texto" icono="edit-3" onPress={() => setVerNota(true)} style={{ alignSelf: 'flex-start' }} />
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  flecha: { width: TACTIL, height: TACTIL, alignItems: 'center', justifyContent: 'center' },
  nota: { minHeight: TACTIL + espacio.xl },
});
