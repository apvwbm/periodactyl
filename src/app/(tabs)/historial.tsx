// Historial: cifras de los últimos 6 ciclos, dos gráficas para ver de un vistazo si los
// ciclos o las reglas se salen de lo habitual, el patrón de cada cosa por día del ciclo y
// la lista de ciclos (tocar uno lo excluye de las previsiones, como el "Hide this cycle"
// de Clue). Conteo simple, sin "insights".
//
// Gráficas hechas con Views, sin librería. Una sola serie en el acento cada una (acento y
// gris juntos no se distinguen con daltonismo: lo dice el validador de paletas), con su
// referencia y etiquetas solo en los extremos. La lista de ciclos es su tabla.

import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Ayuda, Icono, Nota, Pantalla, Seccion, Texto, Vacio } from '@/components/ui';
import { useCiclo, useFormato, useHistorial } from '@/hooks';
import { CICLO_CORTO, CICLO_LARGO, REGLA_LARGA } from '@/lib/catalogo';
import { diasEntre } from '@/lib/fechas';
import { duracion, type Barra, type Ciclo, type Patron } from '@/lib/motor';
import { excluir, sospechosoVisto } from '@/store/app';
import { BORDE, espacio, RADIO, useColores, useEstilos, type Paleta } from '@/theme';

const FILAS_PATRON = 8;
/** Alto de la fila de la marca bajo las columnas. */
const MARCA = 16;
/** Hueco sobre la columna más alta para su etiqueta. */
const ETIQUETA = 18;
/** Alfa del acento por cuartil de frecuencia: un solo tono, de claro a intenso. */
const INTENSIDAD = ['40', '80', 'BF', 'FF'];
const intensidad = (f: number) => INTENSIDAD[Math.min(3, Math.ceil(f * 4) - 1)];

export default function Historial() {
  const { t, fecha, dias } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const { ciclos, sospechosos, prevision, hoy } = useCiclo();
  const { cifras, barras, patrones } = useHistorial();
  const [elegida, setElegida] = useState<string | null>(null);

  const largo = (x: Ciclo) => x.dias ?? diasEntre(x.inicio, hoy) + 1;
  const escala = Math.max(28, ...ciclos.map(largo));
  const conAnio = (iso: string) => (iso.slice(0, 4) === hoy.slice(0, 4) ? fecha(iso) : `${fecha(iso)} ${iso.slice(0, 4)}`);
  const barra = barras.find((b) => b.inicio === elegida) ?? barras[barras.length - 1];

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
        <Seccion titulo={cifras.ciclos === 1 ? t('his.cifra1') : t('his.cifras', { n: cifras.ciclos })} icono="hash">
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

      {barras.length >= 2 && barra && (
        <>
          <Seccion titulo={t('his.graficaCiclo')} icono="bar-chart-2">
            <Texto estilo="apoyo">{t('his.barra', { fecha: conAnio(barra.inicio), n: barra.ciclo, m: barra.regla })}</Texto>
            <Columnas barras={barras} valor={(b) => b.ciclo} alto={140} franja={[CICLO_CORTO, CICLO_LARGO]} elegida={barra.inicio} onElegir={setElegida} />
            <View style={s.eje}>
              <Texto estilo="micro" tono="texto2">
                {conAnio(barras[0].inicio)}
              </Texto>
              <Texto estilo="micro" tono="texto2">
                {conAnio(barras[barras.length - 1].inicio)}
              </Texto>
            </View>
            <Ayuda>{t('his.graficaCicloAyuda')}</Ayuda>
            {barras.some((b) => b.excluido) && (
              <View style={s.leyenda}>
                <View style={[s.muestra, { borderColor: c.acento }]} />
                <Texto estilo="apoyo" tono="texto2">
                  {t('his.hueco')}
                </Texto>
              </View>
            )}
          </Seccion>

          <Seccion titulo={t('his.graficaRegla')} icono="droplet">
            <Columnas barras={barras} valor={(b) => b.regla} alto={72} linea={REGLA_LARGA} elegida={barra.inicio} onElegir={setElegida} />
            <Ayuda>{t('his.graficaReglaAyuda')}</Ayuda>
          </Seccion>
        </>
      )}

      {patrones.length > 0 && (
        <Seccion titulo={t('his.patron')} icono="grid">
          {patrones.slice(0, FILAS_PATRON).map((p) => (
            <FilaPatron key={p.clave} p={p} />
          ))}
          <Eje dias={patrones[0].frecuencia.length} regla={prevision?.regla ?? 0} />
          <View style={s.escala}>
            <Texto estilo="micro" tono="texto2">
              {t('his.menos')}
            </Texto>
            {INTENSIDAD.map((a) => (
              <View key={a} style={[s.celdaEscala, { backgroundColor: c.acento + a }]} />
            ))}
            <Texto estilo="micro" tono="texto2">
              {t('his.mas')}
            </Texto>
          </View>
          <Ayuda>{t('his.patronAyuda')}</Ayuda>
        </Seccion>
      )}

      {ciclos.length > 0 && (
        <Seccion titulo={t('his.ciclos')} icono="list">
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
    </Pantalla>
  );
}

/**
 * Columnas de una serie, de la más antigua a la más reciente. Una franja (o una línea) de
 * referencia detrás, el valor solo en el más corto y el más largo, y una marca bajo la
 * columna elegida. Excluidas, huecas.
 */
function Columnas({
  barras,
  valor,
  alto,
  franja,
  linea,
  elegida,
  onElegir,
}: {
  barras: Barra[];
  valor: (b: Barra) => number;
  alto: number;
  franja?: [number, number];
  linea?: number;
  elegida: string;
  onElegir: (inicio: string) => void;
}) {
  const { t, fecha } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const valores = barras.map(valor);
  const max = Math.max(...valores, franja?.[1] ?? 0, linea ?? 0);
  const y = (v: number) => (v / max) * (alto - ETIQUETA);
  const [menor, mayor] = [Math.min(...valores), Math.max(...valores)];
  const referencia = (v: number) => (
    <Texto estilo="micro" tono="texto2" style={[s.referencia, { bottom: MARCA + y(v) - 8 }]}>
      {v}
    </Texto>
  );

  return (
    <View style={[s.grafica, { height: alto + MARCA }]}>
      {franja && <View style={[s.franja, { bottom: MARCA + y(franja[0]), height: y(franja[1]) - y(franja[0]) }]} />}
      {linea !== undefined && <View style={[s.linea, { bottom: MARCA + y(linea) }]} />}
      <View style={[s.columnas, { height: alto }]}>
        {barras.map((b, i) => {
          const v = valores[i];
          const extremo = (v === menor || v === mayor) && menor !== mayor;
          return (
            <Pressable
              key={b.inicio}
              onPress={() => onElegir(b.inicio)}
              style={s.hueco}
              accessibilityRole="button"
              accessibilityState={{ selected: b.inicio === elegida }}
              accessibilityLabel={t('his.barra', { fecha: fecha(b.inicio), n: b.ciclo, m: b.regla })}
            >
              {extremo && (
                <Texto estilo="micro" tono="texto2">
                  {v}
                </Texto>
              )}
              <View style={[s.columna, { height: Math.max(2, y(v)) }, b.excluido ? { borderWidth: BORDE, borderColor: c.acento } : { backgroundColor: c.acento }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={s.marcas}>
        {barras.map((b) => (
          <View key={b.inicio} style={s.hueco}>
            {b.inicio === elegida && <View style={[s.elegida, { backgroundColor: c.texto }]} />}
          </View>
        ))}
      </View>
      {franja?.map(referencia)}
      {linea !== undefined && referencia(linea)}
    </View>
  );
}

function FilaPatron({ p }: { p: Patron }) {
  const { t } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const nombre = t(p.clave === 'dolor' ? 'dia.dolor' : p.clave === 'ejercicio' ? 'dia.ejercicio' : p.clave === 'deseo' ? 'deseo.si' : `sin.${p.clave}`);
  const detalle = [p.veces === 1 ? t('g.vez') : t('g.veces', { n: p.veces }), p.diaTipico !== null && t('his.sintomaDia', { n: p.diaTipico })]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={{ gap: espacio.xs }} accessible accessibilityLabel={`${nombre}: ${detalle}`}>
      <View style={s.etiquetaPatron}>
        <Texto estilo="micro" style={{ flex: 1 }}>
          {nombre}
        </Texto>
        <Texto estilo="micro" tono="texto2">
          {detalle}
        </Texto>
      </View>
      <View style={s.tira}>
        {p.frecuencia.map((f, i) => (
          <View key={i} style={[s.celda, { backgroundColor: f ? c.acento + intensidad(f) : c.superficie }]} />
        ))}
      </View>
    </View>
  );
}

/** Días 1, 7, 14, 21, 28… y, en el acento, los de la regla típica. */
function Eje({ dias, regla }: { dias: number; regla: number }) {
  const { t } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const marcas = [1, 7, 14, 21, 28, 35].filter((d) => d <= dias);
  return (
    <View style={{ gap: espacio.xs }}>
      <View style={s.tira}>
        {Array.from({ length: dias }, (_, i) => (
          <View key={i} style={[s.diaEje, i < regla && { backgroundColor: c.acento }]} />
        ))}
      </View>
      <View style={{ height: 16 }}>
        {marcas.map((d) => (
          <Texto key={d} estilo="micro" tono="texto2" style={[s.marcaEje, { left: `${((d - 0.5) / dias) * 100}%` }]}>
            {d === 1 ? t('his.dia', { n: 1 }) : d}
          </Texto>
        ))}
      </View>
    </View>
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

    grafica: { paddingRight: 24 },
    columnas: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: BORDE, borderBottomColor: c.linea },
    hueco: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingHorizontal: 1 },
    columna: { width: '100%', maxWidth: 24, borderTopLeftRadius: RADIO, borderTopRightRadius: RADIO },
    franja: { position: 'absolute', left: 0, right: 24, backgroundColor: c.superficie, borderTopWidth: BORDE, borderBottomWidth: BORDE, borderColor: c.linea },
    linea: { position: 'absolute', left: 0, right: 24, height: BORDE, backgroundColor: c.texto3 },
    referencia: { position: 'absolute', right: 0, width: 20, textAlign: 'right' },
    marcas: { flexDirection: 'row', height: MARCA, alignItems: 'center' },
    elegida: { width: 12, height: 2, borderRadius: 1 },
    eje: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 24 },
    leyenda: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
    muestra: { width: 12, height: 16, borderWidth: BORDE, borderTopLeftRadius: RADIO, borderTopRightRadius: RADIO },

    etiquetaPatron: { flexDirection: 'row', gap: espacio.sm },
    tira: { flexDirection: 'row', gap: 1 },
    celda: { flex: 1, height: 12, borderRadius: 1 },
    diaEje: { flex: 1, height: 3, backgroundColor: c.linea },
    marcaEje: { position: 'absolute', width: 40, marginLeft: -20, textAlign: 'center' },
    escala: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, marginTop: espacio.sm },
    celdaEscala: { width: 16, height: 12, borderRadius: 1 },
  });
