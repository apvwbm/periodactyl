// Historial: cifras de los últimos 6 ciclos, la lista de ciclos (tocar uno lo excluye de
// las previsiones, como el "Hide this cycle" de Clue) y los síntomas más frecuentes.
// Conteo simple, sin "insights".

import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Fila, Icono, Nota, Pantalla, Seccion, Texto, Vacio } from '@/components/ui';
import { useCiclo, useFormato, useHistorial } from '@/hooks';
import { diasEntre } from '@/lib/fechas';
import { duracion, type Ciclo } from '@/lib/motor';
import { excluir, sospechosoVisto } from '@/store/app';
import { BORDE, espacio, useColores, useEstilos, type Paleta } from '@/theme';

export default function Historial() {
  const { t, fecha, dias } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const { ciclos, sospechosos, hoy } = useCiclo();
  const { cifras, sintomas } = useHistorial();

  const largo = (x: Ciclo) => x.dias ?? diasEntre(x.inicio, hoy) + 1;
  const escala = Math.max(28, ...ciclos.map(largo));
  const conAnio = (iso: string) => (iso.slice(0, 4) === hoy.slice(0, 4) ? fecha(iso) : `${fecha(iso)} ${iso.slice(0, 4)}`);

  const tocar = (x: Ciclo) =>
    Alert.alert(x.excluido ? t('his.incluir') : t('his.excluir'), t('his.excluirAyuda'), [
      { text: t('g.cancelar'), style: 'cancel' },
      { text: x.excluido ? t('his.incluir') : t('his.excluir'), onPress: () => excluir(x.inicio, !x.excluido) },
    ]);

  const cifra = (etiqueta: string, valor: string) => (
    <View style={s.cifra}>
      <Texto estilo="micro" tono="texto2">
        {etiqueta}
      </Texto>
      <Texto estilo="cifra">{valor}</Texto>
    </View>
  );

  return (
    <Pantalla titulo={t('tab.historial')}>
      {cifras ? (
        <Seccion titulo={cifras.ciclos === 1 ? t('his.cifra1') : t('his.cifras', { n: cifras.ciclos })}>
          <View style={s.cifras}>
            {cifra(t('his.tipico'), dias(cifras.tipico))}
            {cifra(t('his.regla'), dias(cifras.regla))}
            {cifra(t('his.corto'), dias(cifras.corto))}
            {cifra(t('his.largo'), dias(cifras.largo))}
          </View>
          <View style={s.lectura}>
            <Icono nombre={cifras.regular === false ? 'alert-circle' : cifras.regular ? 'check-circle' : 'info'} tam={16} tinte={cifras.regular === false ? c.ocre : c.texto2} />
            <Texto estilo="apoyo" tono="texto2" style={{ flex: 1 }}>
              {`${t('his.variacion')}: ${dias(cifras.variacion)}. ${
                cifras.regular === null ? t('his.faltan') : cifras.regular ? t('his.regular') : t('his.irregular')
              }`}
            </Texto>
          </View>
        </Seccion>
      ) : (
        <Vacio texto={t('his.vacio')} />
      )}

      {ciclos.length > 0 && (
        <Seccion titulo={t('his.ciclos')}>
          {[...ciclos].reverse().map((x) => {
            const total = largo(x);
            return (
              <View key={x.inicio} style={s.ciclo}>
                <Pressable onPress={() => tocar(x)} disabled={x.dias === null} accessibilityRole="button" style={({ pressed }) => [s.fila, pressed && { backgroundColor: c.superficie }]}>
                  <View style={{ flex: 1, gap: espacio.xs }}>
                    <Texto estilo="cuerpo" tono={x.excluido ? 'texto2' : 'texto'}>
                      {conAnio(x.inicio)}
                    </Texto>
                    <Texto estilo="apoyo" tono="texto2">
                      {[
                        x.dias === null ? t('his.actual', { n: total }) : t('his.duracion', { n: x.dias, m: duracion(x.regla) }),
                        x.excluido && t('his.excluido'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Texto>
                    <View style={[s.barra, { width: `${(total / escala) * 100}%`, opacity: x.excluido ? 0.4 : 1 }]}>
                      <View style={{ flex: Math.min(duracion(x.regla), total), backgroundColor: c.acento }} />
                      <View style={{ flex: Math.max(0, total - duracion(x.regla)), backgroundColor: c.linea }} />
                    </View>
                  </View>
                </Pressable>
                {sospechosos.has(x.inicio) && (
                  <Nota
                    tono="aviso"
                    texto={t('his.sospechoso')}
                    acciones={[
                      { texto: t('his.sospechosoSi'), onPress: () => excluir(x.inicio, true) },
                      { texto: t('his.sospechosoNo'), onPress: () => sospechosoVisto(x.inicio) },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </Seccion>
      )}

      {sintomas.length > 0 && (
        <Seccion titulo={t('his.sintomas')}>
          {sintomas.map((x) => (
            <Fila
              key={x.sintoma}
              titulo={t(`sin.${x.sintoma}`)}
              subtitulo={[x.veces === 1 ? t('g.vez') : t('g.veces', { n: x.veces }), x.diaTipico !== null && t('his.sintomaDia', { n: x.diaTipico })]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </Seccion>
      )}
    </Pantalla>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    cifras: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espacio.lg },
    cifra: { width: '50%', gap: espacio.xs },
    lectura: { flexDirection: 'row', gap: espacio.sm, alignItems: 'flex-start', marginTop: espacio.sm },
    ciclo: { borderBottomWidth: BORDE, borderBottomColor: c.linea, paddingBottom: espacio.sm, gap: espacio.sm },
    fila: { paddingVertical: espacio.sm, minHeight: 48 },
    barra: { flexDirection: 'row', height: 6, borderRadius: 1, overflow: 'hidden', minWidth: 8 },
  });
