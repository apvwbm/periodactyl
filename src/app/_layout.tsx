// Raíz: fuentes, apertura de la base cifrada, tema, bloqueo y navegación.
//
// El splash se mantiene hasta que las fuentes Y los datos están listos, así la
// primera pantalla sale entera y sin parpadeos.

import { Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AvisoFlotante, Boton, Icono, Texto } from '@/components/ui';
import { useT } from '@/hooks';
import { limpiarCache } from '@/lib/copias';
import { autenticar, bloquear, desbloquear, estaAutenticando, iniciar, mantenimiento, useApp } from '@/store/app';
import { espacio, useColores, useEstilos, type Paleta } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const MARGEN_BLOQUEO_MS = 30_000;

export default function Raiz() {
  const [fuentes] = useFonts({ Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold });
  const cargado = useApp((s) => s.cargado);
  const bloqueado = useApp((s) => s.bloqueado);
  const c = useColores();

  useEffect(() => {
    void iniciar().then(limpiarCache);
  }, []);

  useEffect(() => {
    if (fuentes && cargado) void SplashScreen.hideAsync();
  }, [fuentes, cargado]);

  // El fondo de la ventana, para que no asome blanco en oscuro al cambiar de pantalla.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.fondo);
  }, [c]);

  // Al volver de segundo plano: se bloquea si ha pasado fuera más del margen, y por si ha
  // cambiado el día se rellena la regla abierta y se reprograma el recordatorio. El margen
  // existe porque compartir o elegir un archivo también manda la app a segundo plano. La
  // huella o el PIN del sistema también, y eso se ignora del todo.
  useEffect(() => {
    let fueraDesde = 0;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estaAutenticando()) return;
      if (estado === 'background') fueraDesde = Date.now();
      if (estado !== 'active' || !fueraDesde) return;
      if (Date.now() - fueraDesde > MARGEN_BLOQUEO_MS) bloquear();
      fueraDesde = 0;
      mantenimiento();
    });
    return () => sub.remove();
  }, []);

  if (!fuentes || !cargado) return null;

  const modal = { presentation: 'modal', animation: 'slide_from_bottom' } as const;
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fondo }, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bienvenida" options={{ gestureEnabled: false }} />
        <Stack.Screen name="dia" options={modal} />
        <Stack.Screen name="ajustes" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="copia" options={modal} />
      </Stack>
      <AvisoFlotante />
      {bloqueado && <Bloqueo />}
    </SafeAreaProvider>
  );
}

/**
 * Capa de bloqueo ENCIMA de la navegación, no en su lugar: así al desbloquear se vuelve
 * exactamente a donde se estaba. Usa la huella o, si no, el PIN del móvil.
 */
function Bloqueo() {
  const t = useT();
  const c = useColores();
  const s = useEstilos(estilos);
  const pedir = useCallback(async () => {
    if (await autenticar(t('bloqueo.motivo'))) desbloquear();
  }, [t]);

  // Solo al aparecer. Pedirlo también en cada vuelta a primer plano haría un bucle: el
  // PIN del sistema es otra actividad, y cancelarlo "vuelve" a la app.
  useEffect(() => {
    void pedir();
  }, [pedir]);

  return (
    <View style={[StyleSheet.absoluteFill, s.bloqueo]}>
      <Icono nombre="lock" tam={32} tinte={c.acento} />
      <Texto estilo="titulo" style={{ textAlign: 'center' }}>
        {t('bloqueo.titulo')}
      </Texto>
      <Boton texto={t('bloqueo.desbloquear')} onPress={pedir} icono="unlock" />
    </View>
  );
}

const estilos = (c: Paleta) =>
  StyleSheet.create({
    bloqueo: { backgroundColor: c.fondo, alignItems: 'center', justifyContent: 'center', gap: espacio.xl, padding: espacio.pantalla },
  });
