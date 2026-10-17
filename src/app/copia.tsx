// Exportar o importar la copia cifrada con contraseña. La contraseña no se guarda en
// ningún sitio: la escribe el usuario cada vez.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Boton, Campo, Nota, Pantalla } from '@/components/ui';
import { useT } from '@/hooks';
import { ErrorCopia, exportarCopia, importarCopia } from '@/lib/copias';
import { estaCifrada } from '@/lib/db';
import { hoyISO } from '@/lib/fechas';
import { avisar, cambiarAjustes, recargar } from '@/store/app';

const LONGITUD_MINIMA = 6;

export default function Copia() {
  const { modo } = useLocalSearchParams<{ modo: 'exportar' | 'importar' }>();
  const t = useT();
  const exportar = modo === 'exportar';
  const [contrasena, setContrasena] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const cifrado = estaCifrada();

  const fallo = (e: unknown) => {
    if (!(e instanceof ErrorCopia)) return setError(String(e));
    setError(t(e.motivo === 'contrasena' ? 'copia.malContrasena' : e.motivo === 'futura' ? 'copia.futura' : 'copia.sinCifrado'));
  };

  const hacerExportar = async () => {
    if (contrasena.length < LONGITUD_MINIMA) return setError(t('copia.corta'));
    if (contrasena !== repetida) return setError(t('copia.noCoinciden'));
    setOcupado(true);
    try {
      await exportarCopia(contrasena);
      cambiarAjustes({ ultimaCopia: hoyISO() });
      avisar(t('copia.hecha'));
      router.back();
    } catch (e) {
      fallo(e);
    } finally {
      setOcupado(false);
    }
  };

  const hacerImportar = () => {
    if (!contrasena) return setError(t('copia.corta'));
    Alert.alert(t('copia.importar'), t('copia.confirmar'), [
      { text: t('g.cancelar'), style: 'cancel' },
      {
        text: t('copia.importar'),
        style: 'destructive',
        onPress: async () => {
          setOcupado(true);
          try {
            if (await importarCopia(contrasena)) {
              recargar();
              avisar(t('copia.importada'));
              router.dismissAll();
            }
          } catch (e) {
            fallo(e);
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);
  };

  return (
    <Pantalla
      titulo={exportar ? t('copia.exportar') : t('copia.importar')}
      atras
      pie={
        <Boton
          texto={exportar ? t('copia.guardar') : t('copia.elegir')}
          icono={exportar ? 'share' : 'download'}
          onPress={exportar ? hacerExportar : hacerImportar}
          deshabilitado={ocupado || !cifrado}
        />
      }
    >
      {!cifrado && <Nota tono="aviso" texto={t('copia.sinCifrado')} />}
      <Nota tono={exportar ? 'neutro' : 'aviso'} icono="lock" texto={exportar ? t('copia.ayudaExportar') : t('copia.ayudaImportar')} />
      <Campo
        etiqueta={t('copia.contrasena')}
        value={contrasena}
        onChangeText={(v) => {
          setContrasena(v);
          setError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        error={exportar ? null : error}
      />
      {exportar && (
        <Campo
          etiqueta={t('copia.repetir')}
          value={repetida}
          onChangeText={(v) => {
            setRepetida(v);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          error={error}
        />
      )}
    </Pantalla>
  );
}
