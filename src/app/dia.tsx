// Un día: flujo, dolor, síntomas, sexo (plegado) y nota. Cada cambio se guarda al
// momento; ‹ › mueve de día sin salir. No se apunta el futuro.
//
// La lista de síntomas sale de la investigación (Bruinvels 2021, datos de Clue, NICE
// NG73): lo que sirve para ver patrones o contarlo al médico. No se añaden más sin
// preguntar.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Boton, Campo, Chip, Chips, Icono, Interruptor, Pantalla, Seccion, Segmentado } from '@/components/ui';
import { useFormato } from '@/hooks';
import { addDias, fechaLarga } from '@/lib/fechas';
import { diaVacio } from '@/lib/motor';
import { guardarDia, useApp } from '@/store/app';
import { TACTIL } from '@/theme';
import { SINTOMAS, type Dia, type Dolor, type Flujo, type Sexo } from '@/types';

const FLUJOS: Flujo[] = [0, 1, 2, 3, 4];
const DOLORES: Dolor[] = [0, 1, 2, 3];
const SEXOS: Sexo[] = ['protegido', 'sinProteccion'];

export default function PantallaDia() {
  const { t, idioma } = useFormato();
  const hoy = useApp((x) => x.hoy);
  const params = useLocalSearchParams<{ fecha?: string }>();
  const [fecha, setFecha] = useState(params.fecha && params.fecha <= hoy ? params.fecha : hoy);
  const guardado = useApp((x) => x.dias.find((d) => d.fecha === fecha));
  const d = guardado ?? diaVacio(fecha);
  const [verSexo, setVerSexo] = useState(false);

  const cambiar = (parcial: Partial<Dia>) => guardarDia({ ...d, ...parcial });
  const alternar = <T,>(lista: T[], x: T) => (lista.includes(x) ? lista.filter((y) => y !== x) : [...lista, x]);

  const flecha = (icono: string, delta: number, activa: boolean) => (
    <Pressable
      onPress={() => setFecha(addDias(fecha, delta))}
      disabled={!activa}
      style={[s.flecha, !activa && { opacity: 0.3 }]}
      accessibilityRole="button"
      accessibilityLabel={icono === 'chevron-left' ? '‹' : '›'}
    >
      <Icono nombre={icono} />
    </Pressable>
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
      <Seccion titulo={t('dia.flujo')}>
        <Segmentado
          opciones={FLUJOS.map((f) => ({ valor: f, texto: t(`flujo.${f}`) }))}
          valor={d.flujo}
          onCambio={(flujo) => cambiar({ flujo, abundante: flujo >= 2 && d.abundante })}
        />
        {d.flujo >= 2 && <Interruptor titulo={t('dia.abundante')} valor={d.abundante} onCambio={(abundante) => cambiar({ abundante })} />}
      </Seccion>

      <Seccion titulo={t('dia.dolor')}>
        <Segmentado opciones={DOLORES.map((x) => ({ valor: x, texto: t(`dolor.${x}`) }))} valor={d.dolor} onCambio={(dolor) => cambiar({ dolor })} />
      </Seccion>

      <Seccion titulo={t('dia.sintomas')}>
        <Chips>
          {SINTOMAS.map((x) => (
            <Chip key={x} multiple texto={t(`sin.${x}`)} activo={d.sintomas.includes(x)} onPress={() => cambiar({ sintomas: alternar(d.sintomas, x) })} />
          ))}
        </Chips>
      </Seccion>

      {verSexo || d.sexo ? (
        <Seccion titulo={t('dia.sexo')}>
          <Chips>
            {SEXOS.map((x) => (
              <Chip key={x} texto={t(`sexo.${x}`)} activo={d.sexo === x} onPress={() => cambiar({ sexo: d.sexo === x ? null : x })} />
            ))}
          </Chips>
        </Seccion>
      ) : (
        <Boton texto={t('dia.sexo')} variante="texto" icono="chevron-down" onPress={() => setVerSexo(true)} style={{ alignSelf: 'flex-start' }} />
      )}

      <Campo etiqueta={t('dia.nota')} value={d.nota} onChangeText={(nota) => cambiar({ nota })} multiline />
    </Pantalla>
  );
}

const s = StyleSheet.create({
  flecha: { width: TACTIL, height: TACTIL, alignItems: 'center', justifyContent: 'center' },
});
