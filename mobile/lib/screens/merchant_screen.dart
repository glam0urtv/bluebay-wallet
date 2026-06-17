import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/wallet_service.dart';
import '../models/transaction.dart';
import '../widgets/transaction_tile.dart';

class MerchantScreen extends StatefulWidget {
  const MerchantScreen({super.key});

  @override
  State<MerchantScreen> createState() => _MerchantScreenState();
}

class _MerchantScreenState extends State<MerchantScreen> {
  List<Transaction> _payments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPayments();
  }

  Future<void> _loadPayments() async {
    setState(() => _loading = true);
    try {
      final walletService = WalletService();
      _payments = await walletService.getTransactions();
      _payments = _payments.where((t) => t.type == 'p2m').toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final merchant = auth.user?.merchant;

    return Scaffold(
      appBar: AppBar(title: Text(merchant?.businessName ?? 'My Store')),
      body: RefreshIndicator(
        onRefresh: _loadPayments,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (merchant != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.store, color: Colors.purple),
                          const SizedBox(width: 8),
                          Text(merchant.businessName,
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _infoRow('Category', merchant.businessCategory ?? 'N/A'),
                      const SizedBox(height: 4),
                      _infoRow('Rate', '1 token = EUR ${merchant.conversionRate}'),
                      const SizedBox(height: 4),
                      _infoRow('Status', merchant.isActive ? 'Active' : 'Inactive'),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 24),

            const Text('Recent Payments Received',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),

            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_payments.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text('No payments received yet', style: TextStyle(color: Colors.grey)),
                ),
              )
            else
              ..._payments.take(20).map((t) => TransactionTile(transaction: t)),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      children: [
        Text('$label: ', style: const TextStyle(color: Colors.grey, fontSize: 13)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
      ],
    );
  }
}
