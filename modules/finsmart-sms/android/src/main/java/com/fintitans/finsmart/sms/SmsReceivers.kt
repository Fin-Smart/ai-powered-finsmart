package com.fintitans.finsmart.sms

import android.app.Activity
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.IBinder
import android.provider.Telephony
import android.util.Log

private const val TAG = "FinsmartSms"

/** Receives every incoming SMS while FinSmart is the default SMS app, stores it and notifies the user. */
class SmsDeliverReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_DELIVER_ACTION) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    val subscriptionId = intent.getIntExtra("android.telephony.extra.SUBSCRIPTION_INDEX", intent.getIntExtra("subscription", -1))

    val pending = goAsync()
    Thread {
      try {
        parts
          .groupBy { it.displayOriginatingAddress ?: it.originatingAddress ?: "" }
          .forEach { (address, messages) ->
            val body = messages.joinToString("") { it.displayMessageBody ?: it.messageBody ?: "" }
            val uri = SmsStore.insertInbox(context, address, body, messages.first().timestampMillis, subscriptionId)
            val stored = uri?.let { SmsStore.messageAt(context, it) } ?: return@forEach
            val threadId = stored["threadId"] as String

            SmsNotifier.notifyIncoming(context, threadId, address, body)
            SmsEvents.received(stored)
          }
      } catch (error: Exception) {
        Log.e(TAG, "Failed to store incoming SMS", error)
      } finally {
        pending.finish()
      }
    }.start()
  }
}

/**
 * Required for the SMS role. Picture and group messages (MMS) are not downloaded yet, so this only
 * logs the push; see the Shield setup screen, which tells users about the limitation.
 */
class MmsWapPushReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Log.w(TAG, "MMS received but MMS download isn't supported yet")
  }
}

/** Handles sms:/smsto: links from other apps by opening FinSmart's compose screen. */
class ComposeSmsActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val address = recipientFrom(intent.data)
    val body = intent.getStringExtra("sms_body") ?: intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""

    packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      launch.putExtra(LaunchExtras.COMPOSE_ADDRESS, address)
      launch.putExtra(LaunchExtras.COMPOSE_BODY, body)
      startActivity(launch)
    }
    finish()
  }
}

/** Sends the quick "respond via message" replies offered on the incoming-call screen. */
class HeadlessSmsSendService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val address = recipientFrom(intent?.data)
    val body = intent?.getStringExtra(Intent.EXTRA_TEXT).orEmpty()

    if (intent?.action == "android.intent.action.RESPOND_VIA_MESSAGE" && address.isNotBlank() && body.isNotBlank()) {
      Thread {
        try {
          SmsSender.send(applicationContext, address, body)
        } catch (error: Exception) {
          Log.e(TAG, "Quick reply failed", error)
        } finally {
          stopSelf(startId)
        }
      }.start()
    } else {
      stopSelf(startId)
    }
    return START_NOT_STICKY
  }
}

/** Extracts the recipient(s) from sms:, smsto:, mms: and mmsto: URIs. */
internal fun recipientFrom(uri: Uri?): String =
  uri?.schemeSpecificPart
    ?.substringBefore('?')
    ?.removePrefix("//")
    ?.let(Uri::decode)
    ?.trim()
    .orEmpty()
