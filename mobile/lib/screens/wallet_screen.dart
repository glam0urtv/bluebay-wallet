import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/wallet_service.dart';
import '../widgets/rotating_coin.dart';
import 'send_screen.dart';
import 'receive_screen.dart';
import 'transaction_history_screen.dart';
import 'merchant_list_screen.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  List<TokenBalance> _balances = [];
  bool _loading = true;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadBalances();
  }

  Future<void> _loadBalances() async {
    try {
      final balances = await WalletService().getBalances();
      if (mounted) setState(() { _balances = balances; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    final currentBalance = _balances.isNotEmpty && _currentIndex < _balances.length
        ? _balances[_currentIndex]
        : null;

    final imgUrl = currentBalance?.iconUrl != null && currentBalance!.iconUrl!.isNotEmpty
        ? (currentBalance.iconUrl!.startsWith('http') ? currentBalance.iconUrl! : currentBalance.iconUrl!)
        : null;

    return RefreshIndicator(
      onRefresh: _loadBalances,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          const SizedBox(height: 20),

          // Token chips row
          if (_balances.length > 1)
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF1A1830), borderRadius: BorderRadius.circular(24)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(_balances.length, (i) {
                    final b = _balances[i];
                    final selected = i == _currentIndex;
                    return GestureDetector(
                      onTap: () => setState(() => _currentIndex = i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: selected ? const Color(0xFF7C3AED) : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          b.symbol,
                          style: TextStyle(color: selected ? Colors.white : const Color(0xFF6B5F99), fontWeight: FontWeight.w700, fontSize: 13, letterSpacing: 1),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),

          const SizedBox(height: 16),

          // Coin card with gradient background
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF1E1B4B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: const Color(0xFF7C3AED).withValues(alpha: 0.25), blurRadius: 30, offset: const Offset(0, 10))],
            ),
            child: RotatingCoin(
              balance: _loading ? null : (currentBalance?.balance ?? 0),
              imageUrl: imgUrl,
              tokenName: currentBalance != null ? '${currentBalance.name} (${currentBalance.symbol})' : null,
            ),
          ),

          const SizedBox(height: 24),

          // Quick actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(children: [
              Row(children: [
                Expanded(child: _btn('Send', Icons.send_rounded, const Color(0xFF3B82F6), () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SendScreen())).then((_) => _loadBalances());
                })),
                const SizedBox(width: 10),
                Expanded(child: _btn('Shop', Icons.store_rounded, const Color(0xFF7C3AED), () async {
                  final result = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MerchantListScreen()));
                  if (result != null && mounted) {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => SendScreen(
                      lockedMerchantId: result['userId'], lockedMerchantName: result['name'], lockedMerchantRate: (result['rate'] as num).toDouble(),
                    ))).then((_) => _loadBalances());
                  }
                })),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: _btn('Receive', Icons.qr_code_scanner_rounded, const Color(0xFF10B981), () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReceiveScreen())).then((_) => _loadBalances());
                })),
                const SizedBox(width: 10),
                Expanded(child: _btn('History', Icons.receipt_long_rounded, const Color(0xFFF59E0B), () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TransactionHistoryScreen()));
                })),
              ]),
            ]),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _btn(String label, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withValues(alpha: 0.15))),
        child: Column(children: [
          Icon(icon, color: color, size: 26),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13)),
        ]),
      ),
    );
  }
}
