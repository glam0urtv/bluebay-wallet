import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import 'wallet_screen.dart';
import 'send_screen.dart';
import 'receive_screen.dart';
import 'transaction_history_screen.dart';
import 'merchant_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthService>();
    _screens = [
      const WalletScreen(),
      if (auth.isMerchant) const MerchantScreen() else const SendScreen(),
      const ReceiveScreen(),
      const TransactionHistoryScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('BlueBay Wallet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => auth.logout(),
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.wallet), label: 'Wallet'),
          NavigationDestination(
            icon: Icon(auth.isMerchant ? Icons.store : Icons.send),
            label: auth.isMerchant ? 'Store' : 'Send',
          ),
          const NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'Receive'),
          const NavigationDestination(icon: Icon(Icons.receipt_long), label: 'History'),
        ],
      ),
    );
  }
}
