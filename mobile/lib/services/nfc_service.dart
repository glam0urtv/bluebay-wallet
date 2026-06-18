import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/services.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:flutter_nfc_kit/flutter_nfc_kit.dart' as nfcKit;

class NFCService {
  static const _channel = MethodChannel('com.tokenwallet.nfc');
  static bool _available = false;

  static Future<bool> isAvailable() async {
    if (_available) return true;
    try {
      if (Platform.isAndroid) {
        final hce = await _channel.invokeMethod<bool>('isHceSupported');
        if (hce == true) { _available = true; return true; }
      }
      _available = await NfcManager.instance.isAvailable();
      return _available;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> isNfcEnabled() async {
    if (Platform.isAndroid) {
      try {
        return await _channel.invokeMethod<bool>('isNfcEnabled') ?? false;
      } catch (_) {
        return false;
      }
    }
    // iOS: CoreNFC doesn't have an "enabled" check - just try to use it
    return true;
  }

  static Future<bool> startHce({required String nonce, required double amount}) async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('startHce', {
        'nonce': nonce, 'amount': amount,
      }) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> stopHce() async {
    if (!Platform.isAndroid) return;
    try { await _channel.invokeMethod('stopHce'); } catch (_) {}
  }

  /// Read NFC tag. On Android uses flutter_nfc_kit for HCE support.
  /// On iOS uses nfc_manager (CoreNFC) for NDEF reading.
  static Future<String?> readNfcTag() async {
    if (Platform.isAndroid) {
      return _readAndroid();
    } else {
      return _readIOS();
    }
  }

  static Future<String?> _readAndroid() async {
    try {
      final tag = await nfcKit.FlutterNfcKit.poll(timeout: const Duration(seconds: 25));
      if (tag == null) return null;

      final records = await nfcKit.FlutterNfcKit.readNDEFRecords();
      if (records != null && records.isNotEmpty) {
        for (final record in records) {
          if (record.payload is String) {
            final payload = record.payload as String;
            if (payload.startsWith('BB|')) return payload;
            final json = NFCService.decodeJsonPayload(payload);
            if (json != null && json['nonce'] != null) return payload;
          }
        }
      }

      try {
        final rawData = await nfcKit.FlutterNfcKit.transceive('');
        if (rawData != null && rawData.isNotEmpty && rawData.startsWith('BB|')) {
          return rawData;
        }
      } catch (_) {}

      return null;
    } catch (_) {
      return _readFallback();
    }
  }

  static Future<String?> _readIOS() async {
    return _readFallback();
  }

  static Future<String?> _readFallback() async {
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
                else {
                  final json = decodeJsonPayload(payload);
                  if (json != null && json['nonce'] != null) result = payload;
                }
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
