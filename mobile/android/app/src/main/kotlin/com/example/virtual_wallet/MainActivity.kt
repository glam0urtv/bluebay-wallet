package com.example.virtual_wallet

import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import android.content.ComponentName
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.tokenwallet.nfc"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startHce" -> {
                    val nonce = call.argument<String>("nonce") ?: ""
                    val amount = call.argument<Double>("amount") ?: 0.0
                    WalletHceService.currentNonce = nonce
                    WalletHceService.currentAmount = amount
                    result.success(true)
                }
                "stopHce" -> {
                    WalletHceService.currentNonce = null
                    WalletHceService.currentAmount = 0.0
                    result.success(true)
                }
                "isNfcEnabled" -> {
                    val adapter = NfcAdapter.getDefaultAdapter(this)
                    result.success(adapter?.isEnabled == true)
                }
                "isHceSupported" -> {
                    val adapter = NfcAdapter.getDefaultAdapter(this)
                    result.success(adapter?.isEnabled == true)
                }
                else -> result.notImplemented()
            }
        }
    }
}
