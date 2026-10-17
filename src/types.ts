// Tipos del dominio. Fechas siempre como 'YYYY-MM-DD' en hora local (`lib/fechas.ts`).

export type Idioma = 'es' | 'en';

/** 0 nada · 1 manchado · 2 ligero · 3 medio · 4 abundante. */
export type Flujo = 0 | 1 | 2 | 3 | 4;

/** 0 no · 1 leve · 2 moderado · 3 fuerte. */
export type Dolor = 0 | 1 | 2 | 3;

/** 0 no · 1 suave · 2 moderado · 3 intenso. */
export type Ejercicio = 0 | 1 | 2 | 3;

// Síntomas y estados de ánimo se guardan juntos en `Dia.sintomas` (y en la columna
// `sintomas`): son etiquetas del día. Se traducen con `sin.<clave>` y se enseñan en dos
// grupos. El orden de cada lista es el de sus chips. 'animo' es "ánimo bajo": viene de la
// v1, cuando el ánimo estaba entre los síntomas.
export const SINTOMAS = [
  'cabeza',
  'pecho',
  'hinchazon',
  'acne',
  'cansancio',
  'antojos',
  'dolorSexo',
  'intestino',
  'sangradoSexo',
] as const;
export const ANIMOS = ['alegria', 'calma', 'sensible', 'animo', 'ansiedad', 'irritable'] as const;
export type Sintoma = (typeof SINTOMAS)[number] | (typeof ANIMOS)[number];
export const esAnimo = (s: Sintoma) => (ANIMOS as readonly Sintoma[]).includes(s);

export type Sexo = 'protegido' | 'sinProteccion';

/** Un día apuntado. Un día sin nada no se guarda. */
export type Dia = {
  fecha: string;
  flujo: Flujo;
  /** "Coágulos grandes / empapa cada 1–2 h". */
  abundante: boolean;
  dolor: Dolor;
  /** Síntomas y estados de ánimo. */
  sintomas: Sintoma[];
  ejercicio: Ejercicio;
  /** Ganas de sexo: con ganas, sin ganas o sin apuntar. */
  deseo: boolean | null;
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
  /** Lo que dijo el usuario; solo se usa hasta tener un ciclo real. */
  cicloDicho: number;
  reglaDicha: number;
  recordatorio: Recordatorio;
  bloqueo: boolean;
  /** Inicio de la regla en curso si se marcó con "Hoy me ha bajado"; se rellena día a día. */
  reglaAbierta: string | null;
  ultimaCopia: string | null;
};
