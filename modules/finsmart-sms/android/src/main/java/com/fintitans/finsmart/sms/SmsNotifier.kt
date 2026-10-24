package com.fintitans.finsmart.sms

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build

object SmsNotifier {
  private const val CHANNEL_ID = "finsmart_messages"

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Messages", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "New text messages"
        },
      )
    }
  }

  private fun canNotify(context: Context) =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

  fun notifyIncoming(context: Context, threadId: String, address: String, body: String) {
    if (!canNotify(context)) return
    ensureChannel(context)

    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      putExtra(LaunchExtras.THREAD_ID, threadId)
    } ?: return

    val contentIntent = PendingIntent.getActivity(
      context,
      threadId.hashCode(),
      launch,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context).setPriority(Notification.PRIORITY_HIGH)
    }

    val notification = builder
      .setSmallIcon(android.R.drawable.stat_notify_chat)
      .setContentTitle(address)
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setCategory(Notification.CATEGORY_MESSAGE)
      .setContentIntent(contentIntent)
      .setAutoCancel(true)
      .build()

    context.getSystemService(NotificationManager::class.java).notify(threadId.hashCode(), notification)
  }

  fun cancel(context: Context, threadId: String) {
    context.getSystemService(NotificationManager::class.java).cancel(threadId.hashCode())
  }
}
