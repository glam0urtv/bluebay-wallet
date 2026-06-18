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
  double _totalBalance = 0;
  bool _loading = true;
  int _currentIndex = 0;
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.85);
    _loadBalances();
  }

  Future<void> _loadBalances() async {
    try {
      final balances = await WalletService().getBalances();
      final total = balances.fold<double>(0, (sum, b) => sum + b.balance);
      if (mounted) setState(() { _balances = balances; _totalBalance = total; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return RefreshIndicator(
      onRefresh: _loadBalances,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          const SizedBox(height: 24),

          Center(child: Text(auth.user?.fullName ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.grey))),
          const SizedBox(height: 4),

          if (_balances.length > 1) ...[
            // Token page dots
            Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(_balances.length, (i) => AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: i == _currentIndex ? 20 : 6, height: 6,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(3), color: i == _currentIndex ? Colors.white : Colors.white30),
            ))),
            const SizedBox(height: 8),
          ],

          // Coin carousel
          SizedBox(
            height: 380,
            child: _loading
                ? const Center(child: RotatingCoin(balance: null))
                : _balances.isEmpty
                    ? const Center(child: RotatingCoin(balance: 0))
                    : PageView.builder(
                        controller: _pageController,
                        itemCount: _balances.length,
                        onPageChanged: (i) => setState(() => _currentIndex = i),
                        itemBuilder: (_, i) {
                          final b = _balances[i];
                          final imgUrl = b.iconUrl != null && b.iconUrl!.isNotEmpty ? b.iconUrl! : null;
                          // If remote URL, prepend base URL
                          final fullImgUrl = imgUrl != null && !imgUrl.startsWith('http')
                              ? 'https://tropical-primp-dingo.ngrok-free.dev/$imgUrl'
                              : imgUrl;
                          return RotatingCoin(
                            balance: b.balance,
                            imageUrl: fullImgUrl,
                            tokenName: '${b.name} (${b.symbol})',
                          );
                        },
                      ),
          ),

          if (_balances.isNotEmpty && _balances.length > 1)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text('Total: ${_totalBalance.toStringAsFixed(0)} BB', textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFA78BFA), fontSize: 13))),

          const SizedBox(height: 8),

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
