class Transaction {
  final String id;
  final String? fromWalletId;
  final String? toWalletId;
  final double amount;
  final String type;
  final String status;
  final String? note;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? fromUserName;
  final String? toUserName;

  Transaction({
    required this.id,
    this.fromWalletId,
    this.toWalletId,
    required this.amount,
    required this.type,
    required this.status,
    this.note,
    required this.createdAt,
    this.completedAt,
    this.fromUserName,
    this.toUserName,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] ?? '',
      fromWalletId: json['fromWalletId'],
      toWalletId: json['toWalletId'],
      amount: (json['amount'] ?? 0).toDouble(),
      type: json['type'] ?? '',
      status: json['status'] ?? '',
      note: json['note'],
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'])
          : null,
      fromUserName: json['fromWallet']?['user']?['fullName'],
      toUserName: json['toWallet']?['user']?['fullName'],
    );
  }

  bool get isIncoming => type == 'admin_mint' || toWalletId != null;
  bool get isOutgoing => fromWalletId != null;

  String get displayType {
    switch (type) {
      case 'admin_mint':
        return 'Reward';
      case 'p2p':
        return 'Transfer';
      case 'p2m':
        return 'Payment';
      case 'reversal':
        return 'Reversal';
      default:
        return type;
    }
  }
}
