package com.example.virtual_wallet

import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.cardemulation.HostApduService
import android.os.Bundle

class WalletHceService : HostApduService() {

    companion object {
        var currentNonce: String? = null
        var currentAmount: Double = 0.0
        val TAG = "WalletHceService"
        val UNKNOWN_CMD = byteArrayOf(0x6F.toByte(), 0x00.toByte())
        val SELECT_OK = byteArrayOf(0x90.toByte(), 0x00.toByte())
    }

    override fun processCommandApdu(commandApdu: ByteArray, extras: Bundle?): ByteArray {
        if (commandApdu.size < 2) return UNKNOWN_CMD

        return when {
            commandApdu[0] == 0x00.toByte() && commandApdu[1] == 0xA4.toByte() -> {
                SELECT_OK
            }
            commandApdu[0] == 0x00.toByte() && commandApdu[1] == 0xB0.toByte() -> {
                val nonce = currentNonce
                if (nonce != null) {
                    val payload = "BB|$nonce|${currentAmount}"
                    val record = NdefRecord.createTextRecord("en", payload)
                    val message = NdefMessage(arrayOf(record))
                    message.toByteArray()
                } else {
                    byteArrayOf(0x6F.toByte(), 0x00.toByte())
                }
            }
            else -> UNKNOWN_CMD
        }
    }

    override fun onDeactivated(reason: Int) {}
}
