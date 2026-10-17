// Esquema de la base de datos y valores por defecto. Sin dependencias de Expo, para
// que `scripts/verifica.ts` pueda probar las migraciones con el `node:sqlite` de Node.
//
// MIGRACIONES: cada entrada es el SQL que lleva de la versión i a la i + 1, y la
// versión vive en `PRAGMA user_version`. Reglas para no perder datos nunca:
//   - NUNCA editar una migración publicada; añadir otra al final.
//   - Solo cambios aditivos (`ADD COLUMN` con DEFAULT, tablas nuevas). Si hace falta
//     reestructurar una tabla: crear la nueva, copiar, borrar la vieja, renombrar.
// Las copias de seguridad llevan su `user_version`, así que una copia antigua se
// importa pasando por estas mismas migraciones.

import type { Ajustes } from '@/types';

export const MIGRACIONES: string[] = [
  // 1 — esquema inicial
  `
  CREATE TABLE kv (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);

  CREATE TABLE dias (
    fecha TEXT PRIMARY KEY NOT NULL,
    flujo INTEGER NOT NULL DEFAULT 0 CHECK (flujo BETWEEN 0 AND 4),
    abundante INTEGER NOT NULL DEFAULT 0,
    dolor INTEGER NOT NULL DEFAULT 0 CHECK (dolor BETWEEN 0 AND 3),
    sintomas TEXT NOT NULL DEFAULT '[]',
    sexo TEXT,
    nota TEXT NOT NULL DEFAULT ''
  );
  `,
];

export const VERSION_ESQUEMA = MIGRACIONES.length;

/** Las tablas con datos (para copiar y para borrar). */
export const TABLAS = ['kv', 'dias'] as const;

/**
 * Aplica las migraciones pendientes, cada una en su transacción junto con el cambio
 * de versión: o entra entera o no entra. `exec` abstrae el driver (expo-sqlite en la
 * app, node:sqlite en la verificación).
 */
export function migrar(exec: (sql: string) => void, version: number): number {
  if (version > VERSION_ESQUEMA) throw new Error('version-futura');
  for (let v = version; v < VERSION_ESQUEMA; v++) {
    try {
      exec(`BEGIN; ${MIGRACIONES[v]}; PRAGMA user_version = ${v + 1}; COMMIT;`);
    } catch (e) {
      exec('ROLLBACK');
      throw e;
    }
  }
  return VERSION_ESQUEMA;
}

export const AJUSTES_DEFECTO: Ajustes = {
  idioma: 'en',
  bienvenida: false,
  hormonal: false,
  finHormonal: null,
  fertilidad: false,
  cicloDicho: 28,
  reglaDicha: 5,
  recordatorio: { activo: false, diasAntes: 2, hora: 540, texto: '' },
  bloqueo: false,
  reglaAbierta: null,
  ultimaCopia: null,
};

/**
 * Lo guardado mezclado con los defectos: un ajuste nuevo de una versión futura aparece
 * con su valor por defecto sin migración. La mezcla de `recordatorio` va aparte porque
 * el spread es superficial.
 */
export const mezclarAjustes = (guardados: Partial<Ajustes>): Ajustes => ({
  ...AJUSTES_DEFECTO,
  ...guardados,
  recordatorio: { ...AJUSTES_DEFECTO.recordatorio, ...guardados.recordatorio },
});
