// Ajustes. Cada cambio se guarda al momento y reprograma el recordatorio.

import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { permiso } from '../../modules/recordatorio';
import { Ayuda, Campo, Fila, Interruptor, Pantalla, Pasos, Seccion, Segmentado, Texto } from '@/components/ui';
import { useCiclo, useFormato } from '@/hooks';
import { exportarInforme } from '@/lib/copias';
import { informe } from '@/lib/csv';
import { hora } from '@/lib/fechas';
import { IDIOMAS } from '@/lib/i18n';
import { autenticar, avisar, borrarTodo, cambiarAjustes, useApp } from '@/store/app';
import { useColores } from '@/theme';
import type { Recordatorio } from '@/types';

// Abren el navegador: la app sigue sin permiso INTERNET.
const WEB = 'https://apvwbm.com/projects/periodactyl';
// Antes de Google Play, quitar esta fila (política de pagos; PLAN.md §4).
const KOFI = 'https://ko-fi.com/apvwbm';

const MEDIA_HORA = 30;
const DIA = 24 * 60;

export default function Ajustes() {
  const { t, idioma, fecha, dias } = useFormato();
  const c = useColores();
  const a = useApp((s) => s.ajustes);
  const { reglas, prevision } = useCiclo();
  const r = a.recordatorio;

  const recordatorio = (parcial: Partial<Recordatorio>) => cambiarAjustes({ recordatorio: { ...r, ...parcial } });

  const activarRecordatorio = async (si: boolean) => {
    if (si && !(await permiso())) return Alert.alert(t('aj.recordatorio'), t('aj.sinPermiso'));
    recordatorio({ activo: si });
  };

  const cambiarBloqueo = async (si: boolean) => {
    if (!si) return cambiarAjustes({ bloqueo: false });
    if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE)
      return Alert.alert(t('aj.bloqueo'), t('aj.bloqueoNoDisponible'));
    if (await autenticar(t('bloqueo.motivo'))) cambiarAjustes({ bloqueo: true });
  };

  const exportar = () =>
    Alert.alert(t('aj.informe'), t('aj.informeAviso'), [
      { text: t('g.cancelar'), style: 'cancel' },
      {
        text: t('g.continuar'),
        onPress: () =>
          void exportarInforme(
            informe(useApp.getState().dias, reglas, {
              cabecera: t('aj.informeCabecera').split(','),
              flujo: (f) => t(`flujo.${f}`),
              dolor: (d) => t(`dolor.${d}`),
              sintoma: (x) => t(`sin.${x}`),
              si: t('g.si'),
            }),
          ),
      },
    ]);

  // Doble confirmación, y luego todo fuera de golpe (como Euki).
  const borrar = () =>
    Alert.alert(t('aj.borrar'), t('aj.borrarConfirmar'), [
      { text: t('g.cancelar'), style: 'cancel' },
      {
        text: t('aj.borrar'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('aj.borrar'), t('aj.borrarSeguro'), [
            { text: t('g.cancelar'), style: 'cancel' },
            {
              text: t('aj.borrar'),
              style: 'destructive',
              onPress: () => {
                const texto = t('aj.borrado');
                borrarTodo();
                avisar(texto);
                router.replace('/bienvenida');
              },
            },
          ]),
      },
    ]);

  return (
    <Pantalla titulo={t('aj.titulo')} atras>
      <Segmentado etiqueta={t('aj.idioma')} opciones={IDIOMAS.map((i) => ({ valor: i.codigo, texto: i.nombre }))} valor={a.idioma} onCambio={(idioma) => cambiarAjustes({ idioma })} />

      <Seccion titulo={t('aj.ciclo')}>
        <Interruptor titulo={t('aj.hormonal')} ayuda={t('aj.hormonalAyuda')} valor={a.hormonal} onCambio={(hormonal) => cambiarAjustes({ hormonal })} />
        <Interruptor
          titulo={t('aj.fertilidad')}
          ayuda={a.hormonal ? t('aj.fertilidadHormonal') : t('aj.fertilidadAyuda')}
          valor={a.fertilidad && !a.hormonal}
          onCambio={(fertilidad) => cambiarAjustes({ fertilidad })}
          deshabilitado={a.hormonal}
        />
        {(!prevision || prevision.estimada) && (
          <>
            <Pasos
              etiqueta={t('aj.cicloDicho')}
              texto={dias(a.cicloDicho)}
              onMenos={a.cicloDicho > 15 ? () => cambiarAjustes({ cicloDicho: a.cicloDicho - 1 }) : undefined}
              onMas={a.cicloDicho < 60 ? () => cambiarAjustes({ cicloDicho: a.cicloDicho + 1 }) : undefined}
            />
            <Pasos
              etiqueta={t('aj.reglaDicha')}
              texto={dias(a.reglaDicha)}
              onMenos={a.reglaDicha > 1 ? () => cambiarAjustes({ reglaDicha: a.reglaDicha - 1 }) : undefined}
              onMas={a.reglaDicha < 10 ? () => cambiarAjustes({ reglaDicha: a.reglaDicha + 1 }) : undefined}
              ayuda={t('aj.dichoAyuda')}
            />
          </>
        )}
      </Seccion>

      <Seccion titulo={t('aj.recordatorio')}>
        <Interruptor titulo={t('aj.recordatorioActivo')} valor={r.activo} onCambio={(si) => void activarRecordatorio(si)} />
        {r.activo && (
          <>
            <Pasos
              etiqueta={t('aj.diasAntes')}
              texto={dias(r.diasAntes)}
              onMenos={r.diasAntes > 1 ? () => recordatorio({ diasAntes: r.diasAntes - 1 }) : undefined}
              onMas={r.diasAntes < 3 ? () => recordatorio({ diasAntes: r.diasAntes + 1 }) : undefined}
            />
            <Pasos
              etiqueta={t('aj.hora')}
              texto={hora(r.hora, idioma)}
              onMenos={() => recordatorio({ hora: (r.hora - MEDIA_HORA + DIA) % DIA })}
              onMas={() => recordatorio({ hora: (r.hora + MEDIA_HORA) % DIA })}
            />
            <Campo
              etiqueta={t('aj.textoAviso')}
              value={r.texto}
              placeholder={t('rec.texto')}
              onChangeText={(texto) => recordatorio({ texto })}
              maxLength={80}
              ayuda={t('aj.textoAvisoAyuda')}
            />
          </>
        )}
      </Seccion>

      <Seccion titulo={t('aj.seguridad')}>
        <Interruptor titulo={t('aj.bloqueo')} ayuda={t('aj.bloqueoAyuda')} valor={a.bloqueo} onCambio={(si) => void cambiarBloqueo(si)} />
      </Seccion>

      <Seccion titulo={t('aj.datos')}>
        <Fila titulo={t('aj.informe')} subtitulo={t('aj.informeAyuda')} icono="file-text" onPress={exportar} chevron />
        <Fila titulo={t('aj.exportar')} icono="lock" onPress={() => router.push({ pathname: '/copia', params: { modo: 'exportar' } })} chevron />
        <Fila titulo={t('aj.importar')} icono="download" onPress={() => router.push({ pathname: '/copia', params: { modo: 'importar' } })} chevron />
        <Ayuda>{a.ultimaCopia ? t('aj.ultimaCopia', { fecha: fecha(a.ultimaCopia) }) : t('aj.nuncaCopia')}</Ayuda>
        <Fila titulo={t('aj.borrar')} icono="trash-2" tinteIcono={c.acento} onPress={borrar} />
      </Seccion>

      <Seccion titulo={t('aj.acerca')}>
        <Texto estilo="cuerpo">PERIODactyl</Texto>
        <Ayuda>{t('aj.version', { v: Constants.expoConfig?.version ?? '' })}</Ayuda>
        <Texto estilo="apoyo" tono="texto2">
          {t('aviso')}
        </Texto>
        <Texto estilo="apoyo" tono="texto2">
          {t('aj.privacidad')}
        </Texto>
        <Fila titulo={t('aj.autor')} subtitulo={t('aj.autorAyuda')} icono="globe" onPress={() => void Linking.openURL(WEB)} />
        <Fila titulo={t('aj.cafe')} subtitulo={t('aj.cafeAyuda')} icono="coffee" onPress={() => void Linking.openURL(KOFI)} />
      </Seccion>
    </Pantalla>
  );
}
