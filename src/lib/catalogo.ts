// Referencias médicas, con su fuente. Si cambia una guía, se cambia aquí y sus asserts.
// La UI no enseña fechas ni fuentes: van solo en estos comentarios.

/**
 * Ciclo por defecto. NHS (https://www.nhs.uk/conditions/periods/); mediana 28 en el
 * estudio de Apple (https://pmc.ncbi.nlm.nih.gov/articles/PMC10226714/). Solo el 13 % de
 * los ciclos dura 28: media 29,3 ± 5,2 en 612.613 ciclos (Bull 2019,
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC6710244/).
 */
export const CICLO_DEFECTO = 28;

/** NHS: "between 2 and 7 days… usually about 5". */
export const REGLA_DEFECTO = 5;

/** Ciclos válidos: 10–90 días (el filtro de Bull 2019 y del estudio de Apple). */
export const CICLO_MIN = 10;
export const CICLO_MAX = 90;

/**
 * Predicción con la mediana de los últimos 6 ciclos válidos; con menos de 3, lo que dijo
 * el usuario. Media y mediana dan el mismo error en 186.000 usuarias de Clue (RMSE 7,50
 * frente a 7,49 días; Li 2021, https://pmc.ncbi.nlm.nih.gov/articles/PMC8714275). drip
 * también pide 3.
 */
export const CICLOS_PREDICCION = 6;
export const CICLOS_MINIMOS = 3;

/** Rango de la previsión: ± la mitad de (más largo − más corto), entre 1 y 4 días. */
export const MARGEN_MIN = 1;
export const MARGEN_MAX = 4;
// ponytail: con menos de 3 ciclos no hay variación medida; ±2 es el punto medio del
// rango. Si hay datos de población mejores (Bull 2019 da la variación por edad), usarlos.
export const MARGEN_ESTIMADO = 2;

/** Huecos de hasta 2 días sin flujo (o solo manchado) siguen siendo la misma regla. */
export const HUECO_REGLA = 2;

/** Ciclo sospechoso de una regla sin apuntar: más de la mediana + 10 días. */
export const MARGEN_SOSPECHOSO = 10;

/**
 * Fase lútea: 13 días. Medida 12,4 ± 2,4 en Bull 2019; Clue usa 13; 14 la sobreestima.
 * NHS: la ovulación ocurre 12–16 días antes de la regla.
 */
export const FASE_LUTEA = 13;

/**
 * Ventana fértil: los 6 días que acaban en la ovulación (Wilcox 1995, NEJM,
 * https://www.talmudology.com/s/TIMING-OF-SEXUAL-INTERCOURSE-IN-RELATION-TO-OVULATION-NEJM-1995.pdf).
 */
export const VENTANA_FERTIL = 6;

/** Ciclos que se predicen hacia delante en el calendario (como drip). */
export const CICLOS_FUTUROS = 3;

// ── Notas de salud ───────────────────────────────────────────────────────────
// "Worth mentioning to a doctor", nunca diagnóstico: el NHS las trata como consejo no
// urgente. Con anticoncepción hormonal solo salen las marcadas con ★.

/**
 * Ciclos cortos o largos: mediana < 21 o > 35 (NHS irregular periods,
 * https://www.nhs.uk/conditions/irregular-periods/). FIGO considera normal 24–38
 * (Munro 2018).
 */
export const CICLO_CORTO = 21;
export const CICLO_LARGO = 35;

/** Ciclos muy variables: más largo − más corto > 9 en los últimos 6 (FIGO: 7–9 según edad). */
export const VARIACION_MAX = 9;

/** Sin regla 90 días (NHS stopped or missed periods), o 3 ciclos perdidos. */
export const SIN_REGLA = 90;
export const CICLOS_PERDIDOS = 3;

/** ★ Regla larga: más de 7 días (NHS). */
export const REGLA_LARGA = 7;

/**
 * ★ Sangrado abundante: la casilla "coágulos grandes / empapa cada 1–2 h" en 2+ días de
 * una regla (NHS heavy periods, https://www.nhs.uk/conditions/heavy-periods/; CDC).
 */
export const DIAS_ABUNDANTE = 2;

/** ★ Dolor fuerte en 2+ reglas seguidas (NHS; NICE NG73 recomienda un diario de dolor). */
export const REGLAS_DOLOR = 2;

/** Tras dejar la anticoncepción hormonal, 3 ciclos de ajuste sin notas de ciclo (como Clue). */
export const CICLOS_AJUSTE = 3;
