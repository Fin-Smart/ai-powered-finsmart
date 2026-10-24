package com.fintitans.finsmart.sms

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsManager

object SmsSender {
  private const val EXTRA_IS_LAST_PART = "com.fintitans.finsmart.sms.IS_LAST_PART"

  private fun smsManager(context: Context): SmsManager =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      context.getSystemService(SmsManager::class.java)
    } else {
      @Suppress("DEPRECATION")
      SmsManager.getDefault()
    }

  /**
   * Sends a text and records it in the SMS provider (the default SMS app must persist its own sent
   * messages). Returns the thread id the message was stored in.
   */
  fun send(context: Context, address: String, body: String): String? {
    val messageUri = SmsStore.insertOutbox(context, address, body)
    val manager = smsManager(context)
    val parts = manager.divideMessage(body)

    val sentIntents = ArrayList<PendingIntent>(parts.size)
    parts.indices.forEach { index ->
      val intent = Intent(context, SmsSentReceiver::class.java).apply {
        data = messageUri
        putExtra(EXTRA_IS_LAST_PART, index == parts.lastIndex)
      }
      sentIntents.add(
        PendingIntent.getBroadcast(
          context,
          (messageUri?.hashCode() ?: 0) * 31 + index,
          intent,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        ),
      )
    }

    try {
      manager.sendMultipartTextMessage(address, null, parts, sentIntents, null)
    } catch (error: Exception) {
      messageUri?.let { SmsStore.updateType(context, it, Telephony.Sms.MESSAGE_TYPE_FAILED) }
      throw error
    }

    return messageUri?.let { SmsStore.threadIdOf(context, it) }
  }

  fun onPartSent(context: Context, messageUri: Uri, succeeded: Boolean, isLastPart: Boolean) {
    when {
      !succeeded -> SmsStore.updateType(context, messageUri, Telephony.Sms.MESSAGE_TYPE_FAILED)
      isLastPart -> SmsStore.updateType(context, messageUri, Telephony.Sms.MESSAGE_TYPE_SENT)
      else -> return
    }
    SmsStore.threadIdOf(context, messageUri)?.let(SmsEvents::changed)
  }

  fun isLastPart(intent: Intent) = intent.getBooleanExtra(EXTRA_IS_LAST_PART, true)
}

class SmsSentReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val messageUri = intent.data ?: return
    // goAsync() detaches the pending result, after which resultCode always reads 0.
    val succeeded = resultCode == Activity.RESULT_OK
    val pending = goAsync()
    Thread {
      try {
        SmsSender.onPartSent(context, messageUri, succeeded, SmsSender.isLastPart(intent))
      } finally {
        pending.finish()
      }
    }.start()
  }
}
