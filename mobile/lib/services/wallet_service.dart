import '../models/transaction.dart';
import 'api_service.dart';

class WalletService {
  final ApiService _api = ApiService();

  Future<double> getBalance() async {
    final data = await _api.get('/wallets/me/balance');
    return (data['balance'] ?? 0).toDouble();
  }

  Future<List<Transaction>> getTransactions({int page = 1, int limit = 20}) async {
    final data = await _api.get('/wallets/me/transactions?page=$page&limit=$limit');
    final list = data['data'] as List<dynamic>? ?? [];
    return list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> sendP2P({
    required String receiverId,
    required double amount,
    required String idempotencyKey,
    String? note,
  }) async {
    return _api.post('/transactions/p2p', {
      'receiverUserId': receiverId,
      'amount': amount,
      'idempotencyKey': idempotencyKey,
      if (note != null) 'note': note,
    });
  }

  Future<Map<String, dynamic>> sendP2M({
    required String merchantId,
    required double amount,
    required String idempotencyKey,
    String? note,
  }) async {
    return _api.post('/transactions/p2m', {
      'merchantUserId': merchantId,
      'amount': amount,
      'idempotencyKey': idempotencyKey,
      if (note != null) 'note': note,
    });
  }
}
