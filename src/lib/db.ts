// Base de datos local cifrada: expo-sqlite compilado con SQLCipher (ver el plugin en
// app.json).
//
// La clave son 32 bytes aleatorios generados en el primer arranque y guardados en
// SecureStore (Android Keystore / iOS Keychain). Se pasa como clave en bruto
// (`x'…'`), lo que evita la derivación PBKDF2 en cada arranque: abrir es instantáneo.
//
// En Expo Go no hay SQLCipher: `PRAGMA key` se ignora y la base queda SIN cifrar.
// `estaCifrada()` lo dice, y las copias cifradas se niegan a funcionar ahí.
//
// Todo es síncrono a propósito: con los datos de una persona, cada consulta tarda
// microsegundos y así el store escribe y pinta en el mismo tick.

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { mezclarAjustes, migrar, TABLAS } from './esquema';
import type { Ajustes, Dia } from '@/types';

const NOMBRE = 'periodactyl.db';
const CLAVE_SECURE_STORE = 'periodactyl.clave';

let db: SQLite.SQLiteDatabase;
let cifrada = false;

/** false en Expo Go, que no trae SQLCipher. */
export const estaCifrada = () => cifrada;

export const conexion = () => db;

async function claveCifrado(): Promise<string> {
  const guardada = await SecureStore.getItemAsync(CLAVE_SECURE_STORE);
  if (guardada) return guardada;
  const nueva = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(CLAVE_SECURE_STORE, nueva);
  return nueva;
}

export const versionDe = (base: SQLite.SQLiteDatabase): number =>
  base.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;

export async function abrir(): Promise<void> {
  const clave = await claveCifrado();
  db = SQLite.openDatabaseSync(NOMBRE);
  db.execSync(`PRAGMA key = "x'${clave}'"`);
  cifrada = db.getFirstSync('PRAGMA cipher_version') !== null;
  migrar((sql) => db.execSync(sql), versionDe(db));
}

// ── Lectura ──────────────────────────────────────────────────────────────────

export type Todo = {
  dias: Dia[];
  ajustes: Ajustes;
  /** Inicios de ciclo excluidos de las previsiones. */
  excluidos: string[];
  /** Inicios de ciclos sospechosos a los que ya se contestó "no, fue así". */
  sospechososVistos: string[];
};

type FilaDia = { fecha: string; flujo: number; abundante: number; dolor: number; sintomas: string; sexo: string | null; nota: string };

function kv<T>(clave: string, defecto: T): T {
  const fila = db.getFirstSync<{ valor: string }>('SELECT valor FROM kv WHERE clave = ?', clave);
  return fila ? (JSON.parse(fila.valor) as T) : defecto;
}

export function cargar(): Todo {
  return {
    dias: db.getAllSync<FilaDia>('SELECT * FROM dias ORDER BY fecha').map((f) => ({
      ...f,
      flujo: f.flujo as Dia['flujo'],
      dolor: f.dolor as Dia['dolor'],
      abundante: f.abundante === 1,
      sintomas: JSON.parse(f.sintomas) as Dia['sintomas'],
      sexo: f.sexo as Dia['sexo'],
    })),
    ajustes: mezclarAjustes(kv<Partial<Ajustes>>('ajustes', {})),
    excluidos: kv<string[]>('excluidos', []),
    sospechososVistos: kv<string[]>('sospechososVistos', []),
  };
}

// ── Escritura ────────────────────────────────────────────────────────────────
// INSERT … ON CONFLICT DO UPDATE y nunca INSERT OR REPLACE (ver AGENTS.md).

export const transaccion = (fn: () => void) => db.withTransactionSync(fn);

export const guardarDia = (d: Dia) =>
  db.runSync(
    `INSERT INTO dias (fecha, flujo, abundante, dolor, sintomas, sexo, nota) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (fecha) DO UPDATE SET flujo = excluded.flujo, abundante = excluded.abundante, dolor = excluded.dolor,
       sintomas = excluded.sintomas, sexo = excluded.sexo, nota = excluded.nota`,
    [d.fecha, d.flujo, Number(d.abundante), d.dolor, JSON.stringify(d.sintomas), d.sexo, d.nota],
  );

export const borrarDia = (fecha: string) => db.runSync('DELETE FROM dias WHERE fecha = ?', fecha);

export const guardarKv = (clave: 'ajustes' | 'excluidos' | 'sospechososVistos', valor: unknown) =>
  db.runSync('INSERT INTO kv (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor', [clave, JSON.stringify(valor)]);

export function borrarTodo() {
  transaccion(() => {
    for (const t of TABLAS) db.execSync(`DELETE FROM ${t}`);
  });
}
