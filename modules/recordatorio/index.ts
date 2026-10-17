// Recordatorio local con código nativo propio (PLAN.md §8): expo-notifications arrastra
// Firebase y Google Play services, y esta app promete que nada sale del móvil.
//
// ponytail: solo Android. En iOS, si algún día, UNUserNotificationCenter en este módulo.

import { requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

type Nativo = {
  programar(id: number, cuandoMs: number, titulo: string, texto: string): void;
  cancelarTodo(): void;
  /** Crea el canal (si no existe) y dice si las notificaciones están permitidas. */
  activas(): boolean;
};

// null en Expo Go (no lleva este código nativo) y en iOS: entonces no hace nada.
const nativo = requireOptionalNativeModule<Nativo>('Recordatorio');

export const programar = (id: number, cuandoMs: number, titulo: string, texto: string) =>
  nativo?.programar(id, cuandoMs, titulo, texto);

export const cancelarTodo = () => nativo?.cancelarTodo();

/** Pide POST_NOTIFICATIONS (Android 13+) con el canal ya creado. Solo al activar el recordatorio. */
export async function permiso(): Promise<boolean> {
  if (!nativo) return false;
  nativo.activas();
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  return nativo.activas();
}
