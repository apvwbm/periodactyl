// Recordatorio local sin dependencias: AlarmManager inexacto + un receptor que publica la
// notificación en un canal secreto de pantalla de bloqueo + un receptor de arranque que
// vuelve a armar las alarmas. El enfoque es el de ExpoSchedulingDelegate y el receptor de
// arranque de expo-notifications, sin su Firebase (PLAN.md §8).

package com.aitorperez.periodactyl.recordatorio

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class RecordatorioModule : Module() {
  private val contexto: Context
    get() = requireNotNull(appContext.reactContext).applicationContext

  override fun definition() = ModuleDefinition {
    Name("Recordatorio")

    Function("programar") { id: Int, cuandoMs: Double, titulo: String, texto: String ->
      Alarmas.programar(contexto, Alarma(id, cuandoMs.toLong(), titulo, texto))
    }

    Function("cancelarTodo") { Alarmas.cancelarTodo(contexto) }

    Function("activas") {
      Alarmas.crearCanal(contexto)
      NotificationManagerCompat.from(contexto).areNotificationsEnabled()
    }
  }
}

data class Alarma(val id: Int, val cuandoMs: Long, val titulo: String, val texto: String) {
  fun json(): String =
    JSONObject().put("id", id).put("cuandoMs", cuandoMs).put("titulo", titulo).put("texto", texto).toString()

  companion object {
    fun de(json: String) = JSONObject(json).let {
      Alarma(it.getInt("id"), it.getLong("cuandoMs"), it.getString("titulo"), it.getString("texto"))
    }
  }
}

/**
 * Las alarmas se guardan en SharedPreferences para volver a armarlas tras reiniciar el
 * móvil o actualizar la app (Android las borra en los dos casos). Este archivo NO va
 * cifrado: por eso el texto por defecto es neutro y Ajustes lo explica.
 */
object Alarmas {
  private const val CANAL = "recordatorio"
  private const val MARGEN_PERDIDA_MS = 12 * 60 * 60 * 1000L

  private fun prefs(c: Context) = c.getSharedPreferences("recordatorio", Context.MODE_PRIVATE)

  private fun alarmas(c: Context) = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun intencion(c: Context, a: Alarma) = PendingIntent.getBroadcast(
    c,
    a.id,
    Intent(c, ReceptorAlarma::class.java).putExtra("id", a.id).putExtra("titulo", a.titulo).putExtra("texto", a.texto),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  // Inexacta a propósito: Android la entrega en la hora siguiente, que sobra para "en unos
  // 2 días", y así no hace falta SCHEDULE_EXACT_ALARM.
  private fun armar(c: Context, a: Alarma) =
    alarmas(c).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, a.cuandoMs, intencion(c, a))

  private fun guardadas(c: Context) = prefs(c).all.values.filterIsInstance<String>().map(Alarma::de)

  fun programar(c: Context, a: Alarma) {
    prefs(c).edit().putString(a.id.toString(), a.json()).apply()
    armar(c, a)
  }

  fun cancelarTodo(c: Context) {
    guardadas(c).forEach { alarmas(c).cancel(intencion(c, it)) }
    prefs(c).edit().clear().apply()
  }

  fun olvidar(c: Context, id: Int) = prefs(c).edit().remove(id.toString()).apply()

  /** Tras reiniciar o actualizar. La que se perdió con el móvil apagado suena ya, salvo que sea vieja. */
  // ponytail: 12 h de margen fijo; si molesta, que el JS mande la caducidad con la alarma.
  fun rearmar(c: Context) {
    val ahora = System.currentTimeMillis()
    guardadas(c).forEach { if (it.cuandoMs > ahora - MARGEN_PERDIDA_MS) armar(c, it) else olvidar(c, it.id) }
  }

  /** La visibilidad en la pantalla de bloqueo solo se puede fijar al crear el canal. */
  fun crearCanal(c: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val canal = NotificationChannel(CANAL, "PERIODactyl", NotificationManager.IMPORTANCE_DEFAULT).apply {
      lockscreenVisibility = Notification.VISIBILITY_SECRET
    }
    c.getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
  }

  @SuppressLint("MissingPermission")
  fun publicar(c: Context, id: Int, titulo: String, texto: String) {
    crearCanal(c)
    val gestor = NotificationManagerCompat.from(c)
    if (!gestor.areNotificationsEnabled()) return
    val abrir = c.packageManager.getLaunchIntentForPackage(c.packageName)?.let {
      PendingIntent.getActivity(c, id, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val notificacion = NotificationCompat.Builder(c, CANAL)
      .setSmallIcon(android.R.drawable.ic_popup_reminder)
      .setContentTitle(titulo)
      .setContentText(texto)
      .setContentIntent(abrir)
      .setAutoCancel(true)
      .setVisibility(NotificationCompat.VISIBILITY_SECRET)
      .build()
    try {
      gestor.notify(id, notificacion)
    } catch (_: SecurityException) {
      // Permiso retirado entre la comprobación y el aviso: no hay nada que hacer.
    }
  }
}

class ReceptorAlarma : BroadcastReceiver() {
  override fun onReceive(c: Context, i: Intent) {
    val id = i.getIntExtra("id", 0)
    Alarmas.publicar(c, id, i.getStringExtra("titulo") ?: "", i.getStringExtra("texto") ?: "")
    Alarmas.olvidar(c, id)
  }
}

class ReceptorArranque : BroadcastReceiver() {
  override fun onReceive(c: Context, i: Intent) {
    if (i.action == Intent.ACTION_BOOT_COMPLETED || i.action == Intent.ACTION_MY_PACKAGE_REPLACED) Alarmas.rearmar(c)
  }
}
