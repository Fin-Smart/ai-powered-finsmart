package com.fintitans.finsmart.sms

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony

/** Reads and writes the system SMS provider. Writes only succeed while FinSmart is the default SMS app. */
object SmsStore {
  private val PROJECTION = arrayOf(
    Telephony.Sms._ID,
    Telephony.Sms.THREAD_ID,
    Telephony.Sms.ADDRESS,
    Telephony.Sms.BODY,
    Telephony.Sms.DATE,
    Telephony.Sms.TYPE,
    Telephony.Sms.READ,
  )

  private const val RECENT_INCOMING_PER_THREAD = 3

  private data class Row(
    val id: Long,
    val threadId: Long,
    val address: String,
    val body: String,
    val date: Long,
    val type: Int,
    val read: Boolean,
  )

  private fun Cursor.toRow() = Row(
    id = getLong(0),
    threadId = getLong(1),
    address = getString(2) ?: "",
    body = getString(3) ?: "",
    date = getLong(4),
    type = getInt(5),
    read = getInt(6) == 1,
  )

  private fun Row.toMap(): Map<String, Any?> = mapOf(
    "id" to id.toString(),
    "threadId" to threadId.toString(),
    "address" to address,
    "body" to body,
    "date" to date.toDouble(),
    "direction" to if (type == Telephony.Sms.MESSAGE_TYPE_INBOX) "in" else "out",
    "status" to when (type) {
      Telephony.Sms.MESSAGE_TYPE_INBOX -> "received"
      Telephony.Sms.MESSAGE_TYPE_SENT -> "sent"
      Telephony.Sms.MESSAGE_TYPE_FAILED -> "failed"
      else -> "sending"
    },
    "read" to read,
  )

  /** Latest message per thread, scanning at most [scanLimit] recent messages. */
  fun conversations(context: Context, scanLimit: Int): List<Map<String, Any?>> {
    val threads = LinkedHashMap<Long, MutableMap<String, Any?>>()
    val incoming = HashMap<Long, MutableList<String>>()

    context.contentResolver.query(
      Telephony.Sms.CONTENT_URI,
      PROJECTION,
      null,
      null,
      "${Telephony.Sms.DATE} DESC",
    )?.use { cursor ->
      var scanned = 0
      while (scanned < scanLimit && cursor.moveToNext()) {
        scanned++
        val row = cursor.toRow()
        val thread = threads.getOrPut(row.threadId) {
          mutableMapOf(
            "threadId" to row.threadId.toString(),
            "address" to row.address,
            "snippet" to row.body,
            "date" to row.date.toDouble(),
            "lastDirection" to if (row.type == Telephony.Sms.MESSAGE_TYPE_INBOX) "in" else "out",
            "unreadCount" to 0,
          )
        }
        if (row.type == Telephony.Sms.MESSAGE_TYPE_INBOX) {
          if (!row.read) thread["unreadCount"] = (thread["unreadCount"] as Int) + 1
          val bodies = incoming.getOrPut(row.threadId) { mutableListOf() }
          if (bodies.size < RECENT_INCOMING_PER_THREAD) bodies.add(row.body)
        }
      }
    }

    return threads.map { (threadId, thread) ->
      thread.apply { put("recentIncoming", incoming[threadId] ?: emptyList<String>()) }
    }
  }

  /** Most recent [limit] messages of a thread, oldest first. */
  fun messages(context: Context, threadId: Long, limit: Int): List<Map<String, Any?>> {
    val rows = mutableListOf<Row>()
    context.contentResolver.query(
      Telephony.Sms.CONTENT_URI,
      PROJECTION,
      "${Telephony.Sms.THREAD_ID} = ?",
      arrayOf(threadId.toString()),
      "${Telephony.Sms.DATE} DESC",
    )?.use { cursor ->
      while (rows.size < limit && cursor.moveToNext()) rows.add(cursor.toRow())
    }
    return rows.asReversed().map { it.toMap() }
  }

  fun messageAt(context: Context, uri: Uri): Map<String, Any?>? =
    context.contentResolver.query(uri, PROJECTION, null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) cursor.toRow().toMap() else null
    }

  fun insertInbox(
    context: Context,
    address: String,
    body: String,
    dateSent: Long,
    subscriptionId: Int,
  ): Uri? {
    val values = ContentValues().apply {
      put(Telephony.Sms.ADDRESS, address)
      put(Telephony.Sms.BODY, body)
      put(Telephony.Sms.DATE, System.currentTimeMillis())
      put(Telephony.Sms.DATE_SENT, dateSent)
      put(Telephony.Sms.READ, 0)
      put(Telephony.Sms.SEEN, 0)
      put(Telephony.Sms.THREAD_ID, Telephony.Threads.getOrCreateThreadId(context, address))
      if (subscriptionId >= 0) put(Telephony.Sms.SUBSCRIPTION_ID, subscriptionId)
    }
    return context.contentResolver.insert(Telephony.Sms.Inbox.CONTENT_URI, values)
  }

  fun insertOutbox(context: Context, address: String, body: String): Uri? {
    val values = ContentValues().apply {
      put(Telephony.Sms.ADDRESS, address)
      put(Telephony.Sms.BODY, body)
      put(Telephony.Sms.DATE, System.currentTimeMillis())
      put(Telephony.Sms.READ, 1)
      put(Telephony.Sms.SEEN, 1)
      put(Telephony.Sms.THREAD_ID, Telephony.Threads.getOrCreateThreadId(context, address))
    }
    return context.contentResolver.insert(Telephony.Sms.Outbox.CONTENT_URI, values)
  }

  fun updateType(context: Context, uri: Uri, type: Int) {
    val values = ContentValues().apply { put(Telephony.Sms.TYPE, type) }
    context.contentResolver.update(uri, values, null, null)
  }

  fun threadIdOf(context: Context, uri: Uri): String? =
    context.contentResolver.query(uri, arrayOf(Telephony.Sms.THREAD_ID), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) cursor.getLong(0).toString() else null
    }

  fun markThreadRead(context: Context, threadId: Long) {
    val values = ContentValues().apply {
      put(Telephony.Sms.READ, 1)
      put(Telephony.Sms.SEEN, 1)
    }
    context.contentResolver.update(
      Telephony.Sms.CONTENT_URI,
      values,
      "${Telephony.Sms.THREAD_ID} = ? AND ${Telephony.Sms.READ} = 0",
      arrayOf(threadId.toString()),
    )
  }
}
