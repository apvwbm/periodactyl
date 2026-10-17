// Tipos del dominio. Fechas siempre como 'YYYY-MM-DD' en hora local (`lib/fechas.ts`).

export type Idioma = 'es' | 'en';

/** 0 nada · 1 manchado · 2 ligero · 3 medio · 4 abundante. */
export type Flujo = 0 | 1 | 2 | 3 | 4;

/** 0 no · 1 leve · 2 moderado · 3 fuerte. */
export type Dolor = 0 | 1 | 2 | 3;

/** Las claves se traducen con `sin.<clave>`. El orden es el de los chips. */
export const SINTOMAS = [
  'cabeza',
  'pecho',
  'hinchazon',
  'acne',
  'animo',
  'ansiedad',
  'irritable',
  'cansancio',
  'dolorSexo',
  'intestino',
  'sangradoSexo',
] as const;
export type Sintoma = (typeof SINTOMAS)[number];

export type Sexo = 'protegido' | 'sinProteccion';

/** Un día apuntado. Un día sin nada no se guarda. */
export type Dia = {
  fecha: string;
  flujo: Flujo;
  /** "Coágulos grandes / empapa cada 1–2 h". */
  abundante: boolean;
  dolor: Dolor;
  sintomas: Sintoma[];
  sexo: Sexo | null;
  nota: string;
};

export type Recordatorio = {
  activo: boolean;
  /** 1–3. */
  diasAntes: number;
  /** Minutos desde medianoche. */
  hora: number;
  /** '' = el de por defecto, traducido. */
  texto: string;
};

export type Ajustes = {
  idioma: Idioma;
  /** Bienvenida hecha. */
  bienvenida: boolean;
  /** Anticoncepción hormonal: "sangrado" en vez de "regla", sin fertilidad y solo las notas ★. */
  hormonal: boolean;
  /** Día en que se desactivó `hormonal`: sus 3 ciclos siguientes son de ajuste. */
  finHormonal: string | null;
  fertilidad: boolean;
  /** Lo que dijo el usuario; solo se usa hasta tener 3 ciclos reales. */
  cicloDicho: number;
  reglaDicha: number;
  recordatorio: Recordatorio;
  bloqueo: boolean;
  /** Inicio de la regla en curso si se marcó con "Hoy me ha bajado"; se rellena día a día. */
  reglaAbierta: string | null;
  ultimaCopia: string | null;
};
