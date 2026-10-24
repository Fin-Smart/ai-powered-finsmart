package com.fintitans.finsmart.sms

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val REQUEST_SMS_ROLE = 7311

class NotDefaultSmsAppException :
  CodedException("ERR_NOT_DEFAULT_SMS_APP", "FinSmart must be the default SMS app to do this.", null)

class FinsmartSmsModule : Module() {
  private var pendingRolePromise: Promise? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun isDefaultSmsApp(context: Context): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      context.getSystemService(RoleManager::class.java)?.isRoleHeld(RoleManager.ROLE_SMS) == true
    } else {
      Telephony.Sms.getDefaultSmsPackage(context) == context.packageName
    }

  private fun requireDefaultSmsApp() {
    if (!isDefaultSmsApp(context)) throw NotDefaultSmsAppException()
  }

  /** Reads (and clears) a notification-tap or sms: link action carried by an activity intent. */
  private fun takeLaunchAction(intent: Intent?): Map<String, Any?>? {
    intent ?: return null
    intent.getStringExtra(LaunchExtras.THREAD_ID)?.let { threadId ->
      intent.removeExtra(LaunchExtras.THREAD_ID)
      return mapOf("type" to "thread", "threadId" to threadId)
    }
    if (intent.hasExtra(LaunchExtras.COMPOSE_ADDRESS)) {
      val action = mapOf(
        "type" to "compose",
        "address" to intent.getStringExtra(LaunchExtras.COMPOSE_ADDRESS).orEmpty(),
        "body" to intent.getStringExtra(LaunchExtras.COMPOSE_BODY).orEmpty(),
      )
      intent.removeExtra(LaunchExtras.COMPOSE_ADDRESS)
      intent.removeExtra(LaunchExtras.COMPOSE_BODY)
      return action
    }
    return null
  }

  override fun definition() = ModuleDefinition {
    Name("FinsmartSms")

    Events("onSmsReceived", "onSmsChanged", "onLaunchAction")

    OnCreate {
      SmsEvents.listener = object : SmsEvents.Listener {
        override fun onReceived(message: Map<String, Any?>) = sendEvent("onSmsReceived", message)
        override fun onChanged(threadId: String) = sendEvent("onSmsChanged", mapOf("threadId" to threadId))
      }
    }

    OnDestroy {
      SmsEvents.listener = null
    }

    Function("isDefaultSmsApp") {
      isDefaultSmsApp(context)
    }

    AsyncFunction("requestDefaultSmsApp") { promise: Promise ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      if (isDefaultSmsApp(activity)) {
        promise.resolve(true)
        return@AsyncFunction
      }

      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = activity.getSystemService(RoleManager::class.java)
        if (roleManager == null || !roleManager.isRoleAvailable(RoleManager.ROLE_SMS)) {
          promise.resolve(false)
          return@AsyncFunction
        }
        roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS)
      } else {
        Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT)
          .putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, activity.packageName)
      }

      pendingRolePromise?.resolve(false)
      pendingRolePromise = promise
      activity.startActivityForResult(intent, REQUEST_SMS_ROLE)
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { activity, payload ->
      if (payload.requestCode == REQUEST_SMS_ROLE) {
        pendingRolePromise?.resolve(isDefaultSmsApp(activity))
        pendingRolePromise = null
      }
    }

    AsyncFunction("getConversations") { scanLimit: Int ->
      requireDefaultSmsApp()
      SmsStore.conversations(context, scanLimit)
    }

    AsyncFunction("getMessages") { threadId: String, limit: Int ->
      requireDefaultSmsApp()
      SmsStore.messages(context, threadId.toLong(), limit)
    }

    AsyncFunction("sendSms") { address: String, body: String ->
      requireDefaultSmsApp()
      SmsSender.send(context, address, body)
    }

    AsyncFunction("markThreadRead") { threadId: String ->
      requireDefaultSmsApp()
      SmsStore.markThreadRead(context, threadId.toLong())
      SmsNotifier.cancel(context, threadId)
    }

    Function("consumeLaunchAction") {
      takeLaunchAction(appContext.currentActivity?.intent)
    }

    OnNewIntent { intent ->
      takeLaunchAction(intent)?.let { sendEvent("onLaunchAction", it) }
    }
  }
}
