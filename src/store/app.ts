// El estado de la app: un único store con todos los datos en memoria.
//
// Contrato de cada acción: primero SQLite (síncrono), luego `set()`. Así lo que se ve
// es siempre lo que está guardado, y la pantalla cambia en el mismo tick.
//
// Lo calculado (reglas, previsión, notas) NO vive aquí: se deriva en `hooks.ts` con las
// funciones puras de `lib/motor.ts`. Tras cada cambio que mueva la previsión o los
// ajustes del recordatorio, se reprograma el recordatorio.

import * as LocalAuthentication from 'expo-local-authentication';
import { create } from 'zustand';

import * as Recordatorio from '../../modules/recordatorio';
import * as db from '@/lib/db';
import { AJUSTES_DEFECTO } from '@/lib/esquema';
import { addDias, hoyISO, instante } from '@/lib/fechas';
import { traducir } from '@/lib/i18n';
import { ciclos, diasBienvenida, diaVacio, FLUJO_RELLENO, prever, rellenoAbierta, separar, vacio } from '@/lib/motor';
import type { Ajustes, Dia } from '@/types';

export type Aviso = { texto: string; deshacer?: () => void; id: number };

type Estado = db.Todo & {
  cargado: boolean;
  bloqueado: boolean;
  aviso: Aviso | null;
  /** Se refresca al volver a primer plano: la cuenta atrás depende del día. */
  hoy: string;
};

export const useApp = create<Estado>(() => ({
  cargado: false,
  bloqueado: false,
  aviso: null,
  hoy: hoyISO(),
  dias: [],
  ajustes: AJUSTES_DEFECTO,
  excluidos: [],
  sospechososVistos: [],
}));

const get = useApp.getState;
const set = useApp.setState;

const prevision = (s = get()) => {
  const { reglas } = separar(s.dias);
  return prever(reglas, ciclos(reglas, s.excluidos), s.ajustes);
};

// ── Arranque ─────────────────────────────────────────────────────────────────

export async function iniciar() {
  await db.abrir();
  const datos = db.cargar();
  set({ ...datos, cargado: true, bloqueado: datos.ajustes.bienvenida && datos.ajustes.bloqueo });
  mantenimiento();
}

export function recargar() {
  set({ ...db.cargar() });
  mantenimiento();
}

/**
 * Al abrir la app y al volver a ella (por si ha cambiado el día): rellena la regla
 * abierta con "Hoy me ha bajado" hasta hoy, la cierra al llegar a su duración típica y
 * reprograma el recordatorio.
 */
export function mantenimiento(hoy = hoyISO()) {
  const s = get();
  const abierta = s.ajustes.reglaAbierta;
  if (abierta) {
    const { rellenar, cerrar } = rellenoAbierta(s.dias, abierta, hoy, prevision(s)?.regla ?? s.ajustes.reglaDicha);
    const porFecha = new Map(s.dias.map((d) => [d.fecha, d]));
    const nuevos = rellenar.map((f) => ({ ...(porFecha.get(f) ?? diaVacio(f)), flujo: FLUJO_RELLENO }));
    const ajustes = cerrar ? { ...s.ajustes, reglaAbierta: null } : s.ajustes;
    db.transaccion(() => {
      nuevos.forEach(db.guardarDia);
      if (cerrar) db.guardarKv('ajustes', ajustes);
    });
    for (const d of nuevos) porFecha.set(d.fecha, d);
    set({ dias: ordenar([...porFecha.values()]), ajustes });
  }
  set({ hoy });
  reprogramar();
}

const ordenar = (dias: Dia[]) => dias.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

/** Cancela y programa el siguiente recordatorio, si toca. */
export function reprogramar() {
  const s = get();
  Recordatorio.cancelarTodo();
  const r = s.ajustes.recordatorio;
  const p = prevision(s);
  if (!s.ajustes.bienvenida || !r.activo || !p) return;
  const cuando = instante(addDias(p.inicio, -r.diasAntes), r.hora);
  if (cuando <= Date.now()) return;
  Recordatorio.programar(1, cuando, 'PERIODactyl', r.texto.trim() || traducir(s.ajustes.idioma, 'rec.texto'));
}

// ── Bienvenida ───────────────────────────────────────────────────────────────

export type DatosBienvenida = Pick<Ajustes, 'idioma' | 'hormonal' | 'fertilidad' | 'cicloDicho' | 'reglaDicha' | 'bloqueo'> & {
  /** Inicio de la última regla, o null si no se acuerda. */
  ultima: string | null;
  recordatorio: boolean;
};

export function completarBienvenida(d: DatosBienvenida, hoy = hoyISO()) {
  const { ultima, recordatorio, ...resto } = d;
  const dias = ultima ? diasBienvenida(ultima, d.reglaDicha, hoy) : [];
  // Si la regla dicha aún no ha terminado, sigue abierta y se rellena día a día.
  const abierta = ultima && addDias(ultima, d.reglaDicha - 1) > hoy ? ultima : null;
  const ajustes: Ajustes = {
    ...AJUSTES_DEFECTO,
    ...resto,
    bienvenida: true,
    reglaAbierta: abierta,
    recordatorio: { ...AJUSTES_DEFECTO.recordatorio, activo: recordatorio },
  };
  db.transaccion(() => {
    dias.forEach(db.guardarDia);
    db.guardarKv('ajustes', ajustes);
  });
  set({ dias, ajustes });
  mantenimiento(hoy);
}

// ── Avisos y bloqueo ─────────────────────────────────────────────────────────

let siguienteAviso = 0;
export const avisar = (texto: string, deshacer?: () => void) => set({ aviso: { texto, deshacer, id: ++siguienteAviso } });
export const cerrarAviso = () => set({ aviso: null });

export const desbloquear = () => set({ bloqueado: false });
export const bloquear = () => set({ bloqueado: get().ajustes.bloqueo });

let autenticando = false;
/** Mientras se pide la huella o el PIN, el sistema saca otra pantalla: `_layout` no debe bloquear por eso. */
export const estaAutenticando = () => autenticando;

/** Huella o PIN del móvil. Un solo aviso a la vez. */
export async function autenticar(motivo: string): Promise<boolean> {
  if (autenticando) return false;
  autenticando = true;
  try {
    return (await LocalAuthentication.authenticateAsync({ promptMessage: motivo })).success;
  } finally {
    autenticando = false;
  }
}

// ── Días ─────────────────────────────────────────────────────────────────────

export function guardarDia(d: Dia) {
  const s = get();
  const antes = s.dias.find((x) => x.fecha === d.fecha);
  if (vacio(d)) db.borrarDia(d.fecha);
  else db.guardarDia(d);
  const dias = ordenar([...s.dias.filter((x) => x.fecha !== d.fecha), ...(vacio(d) ? [] : [d])]);
  set({ dias });
  // Quitar el flujo de hoy con la regla abierta es decir que ya se ha ido.
  if (s.ajustes.reglaAbierta && d.fecha === s.hoy && d.flujo < 2) cambiarAjustes({ reglaAbierta: null });
  else if ((antes?.flujo ?? 0) >= 2 !== (d.flujo >= 2)) reprogramar();
}

/** "Hoy me ha bajado": flujo medio hoy (sin bajar uno abundante) y la regla queda abierta. */
export function empezarRegla(texto: string) {
  const s = get();
  const antes = s.dias.find((x) => x.fecha === s.hoy);
  const abiertaAntes = s.ajustes.reglaAbierta;
  const hoy = antes ?? diaVacio(s.hoy);
  guardarDia({ ...hoy, flujo: hoy.flujo >= 2 ? hoy.flujo : FLUJO_RELLENO });
  cambiarAjustes({ reglaAbierta: s.hoy });
  avisar(texto, () => {
    guardarDia(antes ?? diaVacio(s.hoy));
    cambiarAjustes({ reglaAbierta: abiertaAntes });
  });
}

/** "Se me ha ido": hoy es el último día. */
export function terminarRegla(texto: string) {
  const abierta = get().ajustes.reglaAbierta;
  cambiarAjustes({ reglaAbierta: null });
  avisar(texto, () => cambiarAjustes({ reglaAbierta: abierta }));
}

// ── Ciclos ───────────────────────────────────────────────────────────────────

export function excluir(inicio: string, si: boolean) {
  const excluidos = get().excluidos.filter((f) => f !== inicio).concat(si ? [inicio] : []);
  db.guardarKv('excluidos', excluidos);
  set({ excluidos });
  reprogramar();
}

/** "No, fue así": no se vuelve a preguntar por ese ciclo. */
export function sospechosoVisto(inicio: string) {
  const sospechososVistos = [...get().sospechososVistos, inicio];
  db.guardarKv('sospechososVistos', sospechososVistos);
  set({ sospechososVistos });
}

// ── Ajustes ──────────────────────────────────────────────────────────────────

export function cambiarAjustes(parcial: Partial<Ajustes>) {
  const s = get();
  const ajustes = { ...s.ajustes, ...parcial };
  // Al dejar la anticoncepción hormonal empiezan los 3 ciclos de ajuste.
  if (s.ajustes.hormonal && parcial.hormonal === false) ajustes.finHormonal = s.hoy;
  db.guardarKv('ajustes', ajustes);
  set({ ajustes });
  reprogramar();
}

export function borrarTodo() {
  db.borrarTodo();
  Recordatorio.cancelarTodo();
  set({ ...db.cargar(), bloqueado: false });
}
