// Pantalla segura: FLAG_SECURE en MainActivity antes de super.onCreate. Bloquea capturas y
// grabación y deja en blanco la vista previa de recientes desde el primer fotograma.
//
// No expo-screen-capture: añade READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE y
// DETECT_SCREEN_CAPTURE, observa la galería y pone el flag tarde (PLAN.md §8).
// ponytail: siempre activo, sin ajuste; para el médico está el informe CSV.

const { withMainActivity } = require('expo/config-plugins');

module.exports = function pantallaSegura(config) {
  return withMainActivity(config, (c) => {
    let src = c.modResults.contents;
    if (src.includes('FLAG_SECURE')) return c;
    src = src
      .replace('\nimport android.os.Bundle\n', '\nimport android.os.Bundle\nimport android.view.WindowManager\n')
      .replace(
        /\n(\s*)super\.onCreate\(/,
        (m, sangria) =>
          `\n${sangria}// @generated pantalla-segura: sin capturas ni vista previa en recientes.` +
          `\n${sangria}window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)${m}`,
      );
    // Si la plantilla de Expo cambia, que falle el prebuild y no salga un APK sin la pantalla segura.
    if (!src.includes('FLAG_SECURE') || !src.includes('import android.view.WindowManager')) {
      throw new Error('pantalla-segura: no encuentro onCreate o los imports en MainActivity.kt');
    }
    c.modResults.contents = src;
    return c;
  });
};
