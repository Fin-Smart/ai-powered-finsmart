package com.fintitans.finsmart.sms

/** Bridges broadcast receivers (which run without the JS module) to the module while the app is alive. */
object SmsEvents {
  interface Listener {
    fun onReceived(message: Map<String, Any?>)
    fun onChanged(threadId: String)
  }

  @Volatile
  var listener: Listener? = null

  fun received(message: Map<String, Any?>) {
    listener?.onReceived(message)
  }

  fun changed(threadId: String) {
    listener?.onChanged(threadId)
  }
}

object LaunchExtras {
  const val THREAD_ID = "com.fintitans.finsmart.sms.THREAD_ID"
  const val COMPOSE_ADDRESS = "com.fintitans.finsmart.sms.COMPOSE_ADDRESS"
  const val COMPOSE_BODY = "com.fintitans.finsmart.sms.COMPOSE_BODY"
}
