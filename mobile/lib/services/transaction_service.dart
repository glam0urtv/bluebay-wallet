import 'package:uuid/uuid.dart';
import 'api_service.dart';

class TransactionService {
  final ApiService _api = ApiService();
  final _uuid = const Uuid();

  Future<Map<String, dynamic>> createQRSession(double amount) async {
    return _api.post('/transactions/qr/sessions', {'amount': amount});
  }

  Future<Map<String, dynamic>> processQRTransfer(String sessionToken, double amount) async {
    return _api.post('/transactions/qr/transfer', {
      'sessionToken': sessionToken,
      'amount': amount,
    });
  }

  Future<Map<String, dynamic>> createNFCSession(double amount) async {
    return _api.post('/transactions/nfc/sessions', {'amount': amount});
  }

  Future<Map<String, dynamic>> processNFCTransfer(String nonce, double amount, String receiverId) async {
    return _api.post('/transactions/nfc/transfer', {
      'nonce': nonce,
      'amount': amount,
      'receiverUserId': receiverId,
    });
  }

  Future<Map<String, dynamic>> getActiveSessions() async {
    return _api.get('/transactions/nfc/sessions');
  }

  String generateIdempotencyKey() {
    return 'mobile-${_uuid.v4()}';
  }
}
