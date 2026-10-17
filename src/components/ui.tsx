// Primitivas de interfaz compartidas. Todas pequeñas y sin estado propio salvo lo
// imprescindible; las pantallas se componen con esto y casi nada más. Colores siempre de
// la paleta del tema (claro u oscuro, en vivo).

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFormato, useT } from '@/hooks';
import { addDias, DIAS, desdeISO, diaSemana, diasDelMes, fecha, nombreMes } from '@/lib/fechas';
import { cerrarAviso, useApp } from '@/store/app';
import { BORDE, espacio, RADIO, TACTIL, typo, useColores, useEstilos, type Paleta } from '@/theme';

export type NombreIcono = ComponentProps<typeof Feather>['name'];

export function Icono({ nombre, tam = 20, tinte }: { nombre: string; tam?: number; tinte?: string }) {
  const c = useColores();
  return <Feather name={nombre as NombreIcono} size={tam} color={tinte ?? c.texto} />;
}

// ── Pantalla ─────────────────────────────────────────────────────────────────

export function Pantalla({
  titulo,
  atras,
  derecha,
  pie,
  scroll = true,
  children,
}: {
  titulo?: string;
  atras?: boolean;
  derecha?: ReactNode;
  pie?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const s = useEstilos(estilos);
  const cabecera = (titulo || atras || derecha) && (
    <View style={s.cabecera}>
      {atras && (
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.atras} accessibilityRole="button" accessibilityLabel={t('g.atras')}>
          <Icono nombre="arrow-left" tam={22} />
        </Pressable>
      )}
      <Text style={[typo.titulo, s.titulo]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} accessibilityRole="header">
        {titulo}
      </Text>
      {derecha}
    </View>
  );
  return (
    // Con pie (formularios fuera de las pestañas) se respeta también el borde inferior:
    // si no, el botón de guardar queda debajo de la barra de gestos.
    <SafeAreaView style={s.pantalla} edges={pie ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}>
      {/* Con edge-to-edge Android ya no redimensiona la ventana al abrir el teclado: sin
          esto, el teclado tapa los últimos campos y el pie. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {cabecera}
        {scroll ? (
          <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[s.contenido, { flex: 1 }]}>{children}</View>
        )}
        {pie && <View style={s.pie}>{pie}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Seccion({
  titulo,
  icono,
  derecha,
  children,
  style,
}: {
  titulo?: string;
  /** Un icono Feather pequeño delante del título, en el gris del título. */
  icono?: string;
  derecha?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const c = useColores();
  const s = useEstilos(estilos);
  return (
    <View style={[s.seccion, style]}>
      {(titulo || derecha) && (
        <View style={s.seccionCabecera}>
          {icono && <Icono nombre={icono} tam={14} tinte={c.texto2} />}
          <Text style={[typo.seccion, { color: c.texto2, flex: 1 }]} accessibilityRole="header">
            {titulo}
          </Text>
          {derecha}
        </View>
      )}
      {children}
    </View>
  );
}

export function Ayuda({ children, tono }: { children: ReactNode; tono?: string }) {
  const c = useColores();
  return <Text style={[typo.apoyo, { color: tono ?? c.texto2, marginTop: espacio.xs }]}>{children}</Text>;
}

/** Texto con el color de la paleta. */
export function Texto({ children, estilo = 'texto', tono, style }: { children: ReactNode; estilo?: keyof typeof typo; tono?: keyof Paleta; style?: object }) {
  const c = useColores();
  return <Text style={[typo[estilo], { color: c[tono ?? 'texto'] }, style]}>{children}</Text>;
}

// ── Botones ──────────────────────────────────────────────────────────────────

type Variante = 'principal' | 'secundario' | 'texto' | 'peligro';

export function Boton({
  texto,
  onPress,
  variante = 'principal',
  icono,
  deshabilitado,
  style,
}: {
  texto: string;
  onPress: () => void;
  variante?: Variante;
  icono?: string;
  deshabilitado?: boolean;
  style?: ViewStyle;
}) {
  const c = useColores();
  const s = useEstilos(estilos);
  const relleno = variante === 'principal';
  const tinte = relleno ? c.sobreAcento : variante === 'peligro' ? c.acento : c.texto;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => [
        s.boton,
        relleno && { backgroundColor: c.acento },
        (variante === 'secundario' || variante === 'peligro') && { borderWidth: BORDE, borderColor: variante === 'peligro' ? c.acento : c.lineaFuerte },
        variante === 'texto' && { minHeight: 40, paddingHorizontal: 0 },
        (pressed || deshabilitado) && { opacity: deshabilitado ? 0.4 : 0.75 },
        style,
      ]}
    >
      {icono && <Icono nombre={icono} tam={18} tinte={tinte} />}
      <Text style={[typo.cuerpo, { color: tinte, textAlign: 'center' }]}>{texto}</Text>
    </Pressable>
  );
}

// ── Campos ───────────────────────────────────────────────────────────────────

export function Campo({ etiqueta, ayuda, error, ...props }: TextInputProps & { etiqueta?: string; ayuda?: string; error?: string | null }) {
  const c = useColores();
  const s = useEstilos(estilos);
  return (
    <View>
      {etiqueta && <Text style={[typo.micro, { color: c.texto2, marginBottom: espacio.xs }]}>{etiqueta}</Text>}
      <TextInput
        placeholderTextColor={c.texto3}
        accessibilityLabel={etiqueta}
        {...props}
        style={[typo.cuerpo, s.input, props.multiline && s.multilinea, error ? { borderColor: c.acento } : null, props.style]}
      />
      {error ? <Ayuda tono={c.acento}>{error}</Ayuda> : ayuda ? <Ayuda>{ayuda}</Ayuda> : null}
    </View>
  );
}

export function Segmentado<V extends string | number>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { valor: V; texto: string }[];
  valor: V;
  onCambio: (v: V) => void;
  etiqueta?: string;
}) {
  const c = useColores();
  const s = useEstilos(estilos);
  return (
    <View>
      {etiqueta && <Text style={[typo.micro, { color: c.texto2, marginBottom: espacio.xs }]}>{etiqueta}</Text>}
      <View style={s.segmentado} accessibilityRole="radiogroup">
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              onPress={() => onCambio(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              style={[s.segmento, activo && { backgroundColor: c.lineaFuerte }]}
            >
              <Text style={[typo.micro, { color: activo ? c.fondo : c.texto, textAlign: 'center' }]} numberOfLines={2}>
                {o.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Interruptor({
  titulo,
  ayuda,
  valor,
  onCambio,
  deshabilitado,
}: {
  titulo: string;
  ayuda?: string;
  valor: boolean;
  onCambio: (v: boolean) => void;
  deshabilitado?: boolean;
}) {
  const c = useColores();
  const s = useEstilos(estilos);
  return (
    <View style={[s.fila, deshabilitado && { opacity: 0.5 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[typo.cuerpo, { color: c.texto }]}>{titulo}</Text>
        {ayuda && <Ayuda>{ayuda}</Ayuda>}
      </View>
      <Switch
        value={valor}
        onValueChange={onCambio}
        disabled={deshabilitado}
        accessibilityLabel={titulo}
        trackColor={{ true: c.verde, false: c.linea }}
        thumbColor={c.fondo}
      />
    </View>
  );
}

/** − valor + con zonas táctiles completas. */
export function Pasos({
  etiqueta,
  texto,
  onMenos,
  onMas,
  onTexto,
  ayuda,
}: {
  etiqueta: string;
  texto: string;
  onMenos?: () => void;
  onMas?: () => void;
  /** Si se pasa, el valor del centro también se puede tocar. */
  onTexto?: () => void;
  ayuda?: string;
}) {
  const c = useColores();
  const s = useEstilos(estilos);
  return (
    <View>
      <View style={s.fila}>
        <Text style={[typo.cuerpo, { flex: 1, color: c.texto }]}>{etiqueta}</Text>
        <Pressable onPress={onMenos} disabled={!onMenos} style={[s.paso, !onMenos && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={`${etiqueta} −`}>
          <Icono nombre="minus" />
        </Pressable>
        <Pressable onPress={onTexto} disabled={!onTexto} style={s.valorPaso} accessibilityRole={onTexto ? 'button' : 'text'}>
          <Text style={[typo.dato, { textAlign: 'center', color: c.texto }, onTexto && s.subrayado]}>{texto}</Text>
        </Pressable>
        <Pressable onPress={onMas} disabled={!onMas} style={[s.paso, !onMas && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={`${etiqueta} +`}>
          <Icono nombre="plus" />
        </Pressable>
      </View>
      {ayuda && <Ayuda>{ayuda}</Ayuda>}
    </View>
  );
}

/**
 * ‹ fecha › de día en día. Tocando la fecha se abre un calendario para saltos largos.
 * Nunca pasa de `max` (hoy): no se apunta el futuro.
 */
export function SelectorFecha({ valor, onCambio, max, etiqueta }: { valor: string; onCambio: (iso: string) => void; max: string; etiqueta?: string }) {
  const { t, fecha: corta } = useFormato();
  const [abierto, setAbierto] = useState(false);
  const texto = valor === max ? t('g.hoy') : valor === addDias(max, -1) ? t('g.ayer') : corta(valor);
  return (
    <>
      <Pasos
        etiqueta={etiqueta ?? t('g.fecha')}
        texto={texto}
        onMenos={() => onCambio(addDias(valor, -1))}
        onMas={valor < max ? () => onCambio(addDias(valor, 1)) : undefined}
        onTexto={() => setAbierto(true)}
      />
      {abierto && (
        <CalendarioModal
          valor={valor}
          max={max}
          onElegir={(iso) => {
            onCambio(iso);
            setAbierto(false);
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}

/** Mes con ‹ › y los días en rejilla (la semana empieza en lunes). Cada celda la pinta quien lo usa. */
export function Mes({ anio, mes, onMover, celda }: { anio: number; mes: number; onMover: (delta: number) => void; celda: (iso: string) => ReactNode }) {
  const { idioma } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const primero = fecha(anio, mes, 1);
  const celdas: (string | null)[] = [
    ...Array<null>(diaSemana(primero) - 1).fill(null),
    ...Array.from({ length: diasDelMes(anio, mes) }, (_, i) => fecha(anio, mes, i + 1)),
  ];
  return (
    <View style={{ gap: espacio.sm }}>
      <View style={s.fila}>
        <Pressable onPress={() => onMover(-1)} style={s.paso} accessibilityRole="button" accessibilityLabel="‹">
          <Icono nombre="chevron-left" />
        </Pressable>
        <Text style={[typo.cuerpo, { flex: 1, textAlign: 'center', color: c.texto }]} accessibilityRole="header">
          {nombreMes(mes, idioma).replace(/^./, (l) => l.toUpperCase())} {anio}
        </Text>
        <Pressable onPress={() => onMover(1)} style={s.paso} accessibilityRole="button" accessibilityLabel="›">
          <Icono nombre="chevron-right" />
        </Pressable>
      </View>
      <View style={s.semana}>
        {DIAS[idioma].map((d) => (
          <Text key={d} style={[typo.micro, s.celdaTexto, { color: c.texto3 }]}>
            {d[0].toUpperCase()}
          </Text>
        ))}
      </View>
      <View style={s.semana}>
        {celdas.map((iso, i) => (
          <View key={iso ?? `h${i}`} style={s.celda}>
            {iso && celda(iso)}
          </View>
        ))}
      </View>
    </View>
  );
}

/** El mes visto, con su ‹ ›. */
export function useMesVisto(inicial: string) {
  const [visto, setVisto] = useState(() => {
    const d = desdeISO(inicial);
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });
  const mover = (delta: number) => {
    const d = new Date(visto.anio, visto.mes + delta, 1);
    setVisto({ anio: d.getFullYear(), mes: d.getMonth() });
  };
  return { ...visto, mover };
}

function CalendarioModal({ valor, max, onElegir, onCerrar }: { valor: string; max: string; onElegir: (iso: string) => void; onCerrar: () => void }) {
  const { t } = useFormato();
  const c = useColores();
  const s = useEstilos(estilos);
  const visto = useMesVisto(valor);
  return (
    <Modal transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={s.velo} onPress={onCerrar} accessibilityLabel={t('g.cancelar')}>
        <Pressable style={s.calendario} onPress={() => {}}>
          <Mes
            anio={visto.anio}
            mes={visto.mes}
            onMover={visto.mover}
            celda={(iso) => {
              const elegido = iso === valor;
              const futuro = iso > max;
              return (
                <Pressable
                  onPress={() => onElegir(iso)}
                  disabled={futuro}
                  style={[s.dia, elegido && { backgroundColor: c.acento }, iso === max && !elegido && s.diaHoy]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: elegido, disabled: futuro }}
                  accessibilityLabel={iso}
                >
                  <Text style={[typo.dato, { color: elegido ? c.sobreAcento : futuro ? c.texto3 : c.texto }]}>{Number(iso.slice(8))}</Text>
                </Pressable>
              );
            }}
          />
          <Boton texto={t('g.hoy')} variante="texto" onPress={() => onElegir(max)} style={{ alignSelf: 'center' }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Chip({ texto, activo, onPress, multiple }: { texto: string; activo: boolean; onPress: () => void; multiple?: boolean }) {
  const c = useColores();
  const s = useEstilos(estilos);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: activo } : { selected: activo }}
      style={[s.chip, activo && { borderColor: c.lineaFuerte, backgroundColor: c.superficie }]}
    >
      {activo && <Icono nombre="check" tam={14} />}
      <Text style={[typo.micro, { color: c.texto }]}>{texto}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  const s = useEstilos(estilos);
  return <View style={s.chips}>{children}</View>;
}

// ── Filas y estados ──────────────────────────────────────────────────────────

export function Fila({
  titulo,
  subtitulo,
  derecha,
  icono,
  tinteIcono,
  onPress,
  chevron,
  izquierda,
}: {
  titulo: string;
  subtitulo?: string;
  derecha?: string;
  icono?: string;
  tinteIcono?: string;
  onPress?: () => void;
  chevron?: boolean;
  izquierda?: ReactNode;
}) {
  const c = useColores();
  const s = useEstilos(estilos);
  const contenido = (
    <>
      {izquierda}
      {icono && (
        <View style={s.iconoFila}>
          <Icono nombre={icono} tam={18} tinte={tinteIcono} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[typo.cuerpo, { color: c.texto }]}>{titulo}</Text>
        {subtitulo ? <Text style={[typo.apoyo, { color: c.texto2 }]}>{subtitulo}</Text> : null}
      </View>
      {derecha ? <Text style={[typo.dato, { color: c.texto }]}>{derecha}</Text> : null}
      {chevron && <Icono nombre="chevron-right" tam={18} tinte={c.texto3} />}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.fila, s.filaBorde, pressed && { backgroundColor: c.superficie }]}>
      {contenido}
    </Pressable>
  ) : (
    <View style={[s.fila, s.filaBorde]}>{contenido}</View>
  );
}

export function Nota({
  texto,
  tono = 'neutro',
  icono,
  acciones,
}: {
  texto: string;
  tono?: 'neutro' | 'aviso' | 'peligro' | 'bien';
  icono?: string;
  acciones?: { texto: string; onPress: () => void }[];
}) {
  const c = useColores();
  const s = useEstilos(estilos);
  const tonos = {
    neutro: [c.superficie, c.texto2, 'info'],
    aviso: [c.ocreSuave, c.ocre, 'alert-circle'],
    peligro: [c.acentoSuave, c.acento, 'alert-triangle'],
    bien: [c.verdeSuave, c.verde, 'check-circle'],
  } as const;
  const [fondo, tinte, iconoTono] = tonos[tono];
  return (
    <View style={[s.nota, { backgroundColor: fondo }]}>
      <Icono nombre={icono ?? iconoTono} tam={18} tinte={tinte} />
      <View style={{ flex: 1, gap: espacio.sm }}>
        <Text style={[typo.apoyo, { color: c.texto }]}>{texto}</Text>
        {acciones && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.lg }}>
            {acciones.map((a) => (
              <Boton key={a.texto} texto={a.texto} onPress={a.onPress} variante="texto" style={{ minHeight: 32 }} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  const c = useColores();
  const s = useEstilos(estilos);
  return (
    <View style={s.vacio}>
      <Text style={[typo.texto, { color: c.texto2, textAlign: 'center' }]}>{texto}</Text>
    </View>
  );
}

/** El aviso flotante con "deshacer". Uno a la vez; el nuevo sustituye al anterior. */
export function AvisoFlotante() {
  const aviso = useApp((x) => x.aviso);
  const t = useT();
  const c = useColores();
  const s = useEstilos(estilos);
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(cerrarAviso, 4000);
    return () => clearTimeout(id);
  }, [aviso]);
  if (!aviso) return null;
  return (
    <View style={s.aviso} accessibilityLiveRegion="polite" pointerEvents="box-none">
      <Text style={[typo.apoyo, { color: c.fondo, flex: 1 }]}>{aviso.texto}</Text>
      {aviso.deshacer && (
        <Pressable
          onPress={() => {
            aviso.deshacer?.();
            cerrarAviso();
          }}
          style={s.avisoBoton}
          accessibilityRole="button"
        >
          <Text style={[typo.micro, { color: c.fondo, textTransform: 'uppercase' }]}>{t('g.deshacer')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacio.md,
      paddingHorizontal: espacio.pantalla,
      paddingTop: espacio.lg,
      paddingBottom: espacio.md,
    },
    atras: { width: 32, height: TACTIL, justifyContent: 'center' },
    titulo: { flex: 1, color: c.texto },
    contenido: { paddingHorizontal: espacio.pantalla, paddingBottom: espacio.xxl * 3, gap: espacio.xl },
    pie: { paddingHorizontal: espacio.pantalla, paddingVertical: espacio.md, borderTopWidth: BORDE, borderTopColor: c.linea, backgroundColor: c.fondo },
    seccion: { gap: espacio.sm },
    seccionCabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, minHeight: 24 },
    boton: {
      minHeight: TACTIL,
      borderRadius: RADIO,
      paddingHorizontal: espacio.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacio.sm,
    },
    input: { minHeight: TACTIL, borderWidth: BORDE, borderColor: c.linea, borderRadius: RADIO, paddingHorizontal: espacio.md, color: c.texto },
    multilinea: { minHeight: 96, paddingVertical: espacio.md, textAlignVertical: 'top' },
    segmentado: { flexDirection: 'row', borderWidth: BORDE, borderColor: c.lineaFuerte, borderRadius: RADIO, overflow: 'hidden' },
    segmento: { flex: 1, minHeight: TACTIL, justifyContent: 'center', paddingHorizontal: espacio.xs },
    fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, minHeight: TACTIL },
    filaBorde: { borderBottomWidth: BORDE, borderBottomColor: c.linea, paddingVertical: espacio.sm },
    iconoFila: { width: 36, height: 36, borderRadius: RADIO, backgroundColor: c.superficie, alignItems: 'center', justifyContent: 'center' },
    valorPaso: { minWidth: 64, minHeight: TACTIL, justifyContent: 'center', paddingHorizontal: espacio.xs },
    subrayado: { textDecorationLine: 'underline' },
    velo: { flex: 1, backgroundColor: c.velo, justifyContent: 'center', padding: espacio.pantalla },
    calendario: { backgroundColor: c.fondo, borderRadius: RADIO, padding: espacio.md, gap: espacio.sm },
    semana: { flexDirection: 'row', flexWrap: 'wrap' },
    celda: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
    celdaTexto: { width: `${100 / 7}%`, textAlign: 'center' },
    dia: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: RADIO },
    diaHoy: { borderWidth: BORDE, borderColor: c.lineaFuerte },
    paso: { width: TACTIL, height: TACTIL, borderWidth: BORDE, borderColor: c.linea, borderRadius: RADIO, alignItems: 'center', justifyContent: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacio.xs,
      minHeight: 40,
      paddingHorizontal: espacio.md,
      borderWidth: BORDE,
      borderColor: c.linea,
      borderRadius: RADIO,
    },
    nota: { flexDirection: 'row', gap: espacio.md, padding: espacio.md, borderRadius: RADIO },
    vacio: { alignItems: 'center', gap: espacio.lg, paddingVertical: espacio.xxl },
    aviso: {
      position: 'absolute',
      left: espacio.pantalla,
      right: espacio.pantalla,
      bottom: 96,
      backgroundColor: c.lineaFuerte,
      borderRadius: RADIO,
      paddingLeft: espacio.lg,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TACTIL,
    },
    avisoBoton: { minHeight: TACTIL, justifyContent: 'center', paddingHorizontal: espacio.lg },
  });

