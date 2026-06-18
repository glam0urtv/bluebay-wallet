import '../models/transaction.dart';
import 'api_service.dart';

class TokenBalance {
  final String tokenId;
  final String name;
  final String symbol;
  final String? iconUrl;
  final double balance;

  TokenBalance({required this.tokenId, required this.name, required this.symbol, this.iconUrl, required this.balance});

  factory TokenBalance.fromJson(Map<String, dynamic> json) {
    return TokenBalance(
      tokenId: json['token']['id'] ?? json['tokenId'] ?? '',
      name: json['token']['name'] ?? '',
      symbol: json['token']['symbol'] ?? '',
      iconUrl: json['token']['iconUrl'],
      balance: (json['balance'] ?? 0).toDouble(),
    );
  }
}

class WalletService {
  final ApiService _api = ApiService();

  Future<double> getBalance() async {
    final data = await _api.get('/wallets/me/balance');
    return (data['balance'] ?? 0).toDouble();
  }

  Future<List<TokenBalance>> getBalances() async {
    final response = await _api.get('/wallets/me/balances');
    final list = (response['data'] as List<dynamic>? ?? []) as List<dynamic>;
    return list.map((e) => TokenBalance.fromJson(e as Map<String, dynamic>)).toList();
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
    String? tokenId,
  }) async {
    return _api.post('/transactions/p2p', {
      'receiverUserId': receiverId, 'amount': amount, 'idempotencyKey': idempotencyKey,
      if (note != null) 'note': note,
      if (tokenId != null) 'tokenId': tokenId,
    });
  }

  Future<Map<String, dynamic>> sendP2M({
    required String merchantId,
    required double amount,
    required String idempotencyKey,
    String? note,
    String? tokenId,
  }) async {
    return _api.post('/transactions/p2m', {
      'merchantUserId': merchantId, 'amount': amount, 'idempotencyKey': idempotencyKey,
      if (note != null) 'note': note,
      if (tokenId != null) 'tokenId': tokenId,
    });
  }
}
