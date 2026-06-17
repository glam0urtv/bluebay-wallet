import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart' as nfcKit;

class NFCService {
  static const _channel = MethodChannel('com.tokenwallet.nfc');
  static bool _available = false;

  static Future<bool> isAvailable() async {
    try {
      final hce = await _channel.invokeMethod<bool>('isHceSupported');
      _available = hce == true;
      return _available;
    } catch (_) {
      try {
        _available = await NfcManager.instance.isAvailable();
        return _available;
      } catch (_) {
        _available = false;
        return false;
      }
    }
  }

  static Future<bool> isNfcEnabled() async {
    try {
      return await _channel.invokeMethod<bool>('isNfcEnabled') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> startHce({required String nonce, required double amount}) async {
    try {
      return await _channel.invokeMethod<bool>('startHce', {
        'nonce': nonce,
        'amount': amount,
      }) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> stopHce() async {
    try { await _channel.invokeMethod('stopHce'); } catch (_) {}
  }

  /// Read NFC tag / HCE - uses flutter_nfc_kit for better HCE support
  static Future<String?> readNfcTag() async {
    try {
      final tag = await nfcKit.FlutterNfcKit.poll(timeout: const Duration(seconds: 25));
      if (tag == null) return null;

      // Read NDEF records from any NFC tag
      final records = await nfcKit.FlutterNfcKit.readNDEFRecords();
      if (records != null && records.isNotEmpty) {
        for (final record in records) {
          if (record.payload is String) {
            final payload = record.payload as String;
            if (payload.startsWith('BB|')) return payload;
            // Also try JSON
            final json = NFCService.decodeJsonPayload(payload);
            if (json != null && json['nonce'] != null) return payload;
          }
        }
      }

      // Fallback: try to transceive raw data
      try {
        final rawData = await nfcKit.FlutterNfcKit.transceive('');
        if (rawData != null && rawData.isNotEmpty && rawData.startsWith('BB|')) {
          return rawData;
        }
      } catch (_) {}

      return null;
    } catch (_) {}

    // Second fallback: nfc_manager
    String? result;
    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          final ndef = Ndef.from(tag);
          if (ndef != null) {
            final msg = ndef.cachedMessage;
            if (msg != null && msg.records.isNotEmpty) {
              for (final record in msg.records) {
                final payload = String.fromCharCodes(record.payload);
                if (payload.startsWith('BB|')) result = payload;
              }
            }
          }
          await NfcManager.instance.stopSession();
        },
      );
    } catch (_) {
      result = null;
    }
    return result;
  }

  static Map<String, dynamic>? parseHcePayload(String data) {
    try {
      final parts = data.split('|');
      if (parts.length >= 3 && parts[0] == 'BB') {
        return {'nonce': parts[1], 'amount': double.tryParse(parts[2]) ?? 0};
      }
    } catch (_) {}
    return null;
  }

  static Map<String, dynamic>? decodeJsonPayload(String data) {
    try {
      return jsonDecode(data) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}
