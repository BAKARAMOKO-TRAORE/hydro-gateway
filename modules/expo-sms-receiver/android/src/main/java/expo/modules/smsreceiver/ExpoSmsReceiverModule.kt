package expo.modules.smsreceiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.telephony.SmsMessage
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoSmsReceiverModule : Module() {

  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {

    Name("ExpoSmsReceiver")

    Events("onSmsReceived")

    Function("startListening") {
      val context = appContext.reactContext ?: return@Function
      if (receiver != null) return@Function

      val filter = IntentFilter("android.provider.Telephony.SMS_RECEIVED").apply {
        priority = 999
      }

      receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
          val bundle = intent.extras ?: return
          val pdus = bundle.get("pdus") as? Array<*> ?: return
          val format = bundle.getString("format") ?: "3gpp"

          val messages = pdus.mapNotNull { pdu ->
            SmsMessage.createFromPdu(pdu as ByteArray, format)
          }

          val body   = messages.joinToString("") { it.messageBody }
          val sender = messages.firstOrNull()?.originatingAddress ?: ""

          sendEvent("onSmsReceived", mapOf(
            "body"               to body,
            "originatingAddress" to sender,
          ))
        }
      }

      context.registerReceiver(receiver, filter)
    }

    Function("stopListening") {
      val context = appContext.reactContext ?: return@Function
      receiver?.let {
        try { context.unregisterReceiver(it) } catch (e: Exception) {}
      }
      receiver = null
    }
  }
}
