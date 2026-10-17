// Tokens de diseño. Dos paletas, claro y oscuro, según el tema del móvil y en vivo.
// Ninguna pantalla escribe un color literal: o sale de aquí, o no existe.
//
// **Un solo acento.** El frambuesa es la marca y la regla: el botón principal, la cifra
// héroe, la pestaña activa y los días de regla en el calendario. El verde azulado
// (`fertil`) solo marca la ventana fértil y la ovulación estimadas. Verde y ocre son
// estado. Los colores de estado van SIEMPRE con texto o icono.
//
// Plano: bordes de 1 px y espacio en blanco, nunca sombras ni degradados.
//
// Los estilos que dependen del tema se escriben al final de cada archivo como función
// de la paleta (`const estilos = (c: Paleta) => StyleSheet.create(…)`) y se usan con
// `useEstilos(estilos)`, que los crea una vez por paleta.

import { useColorScheme, type TextStyle } from 'react-native';

export const CLARO = {
  fondo: '#FFFFFF',
  superficie: '#F6F5F5',
  linea: '#E8E4E5',
  lineaFuerte: '#1E1B1D',

  texto: '#1E1B1D',
  texto2: '#6E676B',
  texto3: '#A39CA0',

  acento: '#A3245A',
  acentoSuave: '#F7E6ED',
  sobreAcento: '#FFFFFF',

  fertil: '#2F6F73',
  fertilSuave: '#E2F0F0',

  verde: '#4A7559',
  verdeSuave: '#E5EEE7',
  ocre: '#966A22',
  ocreSuave: '#F6EEDF',

  velo: 'rgba(30,27,29,0.45)',
};

export type Paleta = typeof CLARO;

export const OSCURO: Paleta = {
  fondo: '#111012',
  superficie: '#1C1A1D',
  linea: '#2D2A2E',
  lineaFuerte: '#EEEAEC',

  texto: '#EEEAEC',
  texto2: '#A8A1A5',
  texto3: '#6F686C',

  acento: '#F08BB4',
  acentoSuave: '#3A1B29',
  sobreAcento: '#111012',

  fertil: '#7CC4C8',
  fertilSuave: '#173133',

  verde: '#8DBE9C',
  verdeSuave: '#1C2A21',
  ocre: '#D9AE62',
  ocreSuave: '#2E2414',

  velo: 'rgba(0,0,0,0.6)',
};

export const useColores = (): Paleta => (useColorScheme() === 'dark' ? OSCURO : CLARO);

const cache = new WeakMap<object, Map<Paleta, unknown>>();

/** Estilos que dependen del tema: se crean una vez por paleta y se cachean. */
export function useEstilos<T>(crear: (c: Paleta) => T): T {
  const c = useColores();
  let porPaleta = cache.get(crear);
  if (!porPaleta) cache.set(crear, (porPaleta = new Map()));
  if (!porPaleta.has(c)) porPaleta.set(c, crear(c));
  return porPaleta.get(c) as T;
}

/** Múltiplos de 4. */
export const espacio = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pantalla: 20 } as const;

/** Zona táctil mínima (las guías piden 44 pt; 48 es la de Android). */
export const TACTIL = 48;
export const RADIO = 4;
export const BORDE = 1;

export const fuente = {
  regular: 'Archivo_400Regular',
  semi: 'Archivo_600SemiBold',
  display: 'Archivo_800ExtraBold',
} as const;

/** Las cifras van con `tabular-nums`: si no, una cifra baila al cambiar un dígito. */
const NUM: TextStyle = { fontVariant: ['tabular-nums'] };

// Sin color: lo pone cada pantalla desde la paleta.
export const typo = {
  heroe: { fontFamily: fuente.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.5, ...NUM },
  cifra: { fontFamily: fuente.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.8, ...NUM },
  titulo: { fontFamily: fuente.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, textTransform: 'uppercase' },
  seccion: { fontFamily: fuente.display, fontSize: 13, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  cuerpo: { fontFamily: fuente.semi, fontSize: 16, lineHeight: 22 },
  texto: { fontFamily: fuente.regular, fontSize: 15, lineHeight: 21 },
  apoyo: { fontFamily: fuente.regular, fontSize: 13, lineHeight: 18 },
  dato: { fontFamily: fuente.semi, fontSize: 15, lineHeight: 20, ...NUM },
  micro: { fontFamily: fuente.semi, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;
