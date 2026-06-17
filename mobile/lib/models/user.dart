class User {
  final String id;
  final String phone;
  final String? email;
  final String fullName;
  final String role;
  final String? avatarUrl;
  final bool isActive;
  final Wallet? wallet;
  final MerchantInfo? merchant;

  User({
    required this.id,
    required this.phone,
    this.email,
    required this.fullName,
    required this.role,
    this.avatarUrl,
    this.isActive = true,
    this.wallet,
    this.merchant,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'],
      fullName: json['fullName'] ?? '',
      role: json['role'] ?? 'user',
      avatarUrl: json['avatarUrl'],
      isActive: json['isActive'] ?? true,
      wallet: json['wallet'] != null ? Wallet.fromJson(json['wallet']) : null,
      merchant: json['merchant'] != null
          ? MerchantInfo.fromJson(json['merchant'])
          : null,
    );
  }

  bool get isAdmin => role == 'admin';
  bool get isMerchant => role == 'merchant';
}

class Wallet {
  final String id;
  final double balance;
  final int version;

  Wallet({required this.id, this.balance = 0, this.version = 1});

  factory Wallet.fromJson(Map<String, dynamic> json) {
    return Wallet(
      id: json['id'] ?? '',
      balance: (json['balance'] ?? 0).toDouble(),
      version: json['version'] ?? 1,
    );
  }
}

class MerchantInfo {
  final String id;
  final String businessName;
  final String? businessCategory;
  final double conversionRate;
  final bool isActive;

  MerchantInfo({
    required this.id,
    required this.businessName,
    this.businessCategory,
    this.conversionRate = 1.0,
    this.isActive = true,
  });

  factory MerchantInfo.fromJson(Map<String, dynamic> json) {
    return MerchantInfo(
      id: json['id'] ?? '',
      businessName: json['businessName'] ?? '',
      businessCategory: json['businessCategory'],
      conversionRate: (json['conversionRate'] ?? 1.0).toDouble(),
      isActive: json['isActive'] ?? true,
    );
  }
}
