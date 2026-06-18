import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/transaction_service.dart';
import '../services/nfc_service.dart';
import '../services/auth_service.dart';
import 'package:provider/provider.dart';

class ReceiveScreen extends StatefulWidget {
  const ReceiveScreen({super.key});

  @override
  State<ReceiveScreen> createState() => _ReceiveScreenState();
}

class _ReceiveScreenState extends State<ReceiveScreen> with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late TabController _tabController;
  bool _nfcAvailable = false;
  bool _nfcScanning = false;
  String? _nfcStatus;
  bool _qrScanning = false;
  late MobileScannerController _scannerController;
  bool _cameraReady = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChange);
    _scannerController = MobileScannerController();
    _checkNFC();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    try {
      if (state == AppLifecycleState.resumed) {
        if (_tabController.index == 0) _scannerController.start();
      } else {
        _scannerController.stop();
      }
    } catch (_) {}
  }

  void _onTabChange() {
    if (_tabController.index == 0) {
      try { _scannerController.start(); } catch (_) {}
    } else {
      try { _scannerController.stop(); } catch (_) {}
    }
  }

  Future<void> _checkNFC() async {
    _nfcAvailable = await NFCService.isAvailable();
    if (mounted) setState(() {});
  }

  void _onQRScanned(BarcodeCapture capture) async {
    if (_qrScanning) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    setState(() => _qrScanning = true);
    try {
      final parts = barcode!.rawValue!.split('|');
      if (parts.length < 3) return;

      final key = parts[0];
      final amount = double.tryParse(parts[1]) ?? 0;
      final type = parts[2];

      if (type == 'nfc') {
        final auth = context.read<AuthService>();
        await TransactionService().processNFCTransfer(key, amount, auth.user!.id);
      } else {
        await TransactionService().processQRTransfer(key, amount);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Received $amount BB!'), backgroundColor: Colors.green));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    } finally {
      setState(() => _qrScanning = false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tabController.removeListener(_onTabChange);
    _tabController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Receive Tokens'),
        bottom: TabBar(controller: _tabController, tabs: const [Tab(text: 'QR Code'), Tab(text: 'NFC')]),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildQRTab(), _buildNFCTab()],
      ),
    );
  }

  Widget _buildQRTab() {
    return Column(
      children: [
        Expanded(
          child: MobileScanner(
            controller: _scannerController,
            onDetect: _onQRScanned,
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.blue.shade50,
          child: const Text('Point camera at sender\'s QR to receive BB tokens', textAlign: TextAlign.center, style: TextStyle(fontSize: 13)),
        ),
      ],
    );
  }

  Widget _buildNFCTab() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.nfc, size: 80, color: _nfcAvailable ? Colors.blue : Colors.grey),
            const SizedBox(height: 16),
            Text(_nfcAvailable ? 'NFC Ready' : 'NFC Not Available', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(
              _nfcStatus ?? (_nfcAvailable ? 'Sender: open app → Send → enter amount → tap phones' : 'NFC requires Android. Use QR code instead.'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
            const SizedBox(height: 24),
            if (_nfcAvailable)
              ElevatedButton.icon(
                onPressed: _nfcScanning ? null : () async {
                  setState(() { _nfcScanning = true; _nfcStatus = 'Hold phone near sender...'; });
                  try {
                    final data = await NFCService.readNfcTag();
                    if (data == null) {
                      setState(() { _nfcScanning = false; _nfcStatus = 'No tag detected.'; });
                      return;
                    }
                    final payload = NFCService.parseHcePayload(data);
                    if (payload != null) {
                      final ns = payload['nonce'] as String;
                      final amt = (payload['amount'] as num).toDouble();
                      final auth = context.read<AuthService>();
                      await TransactionService().processNFCTransfer(ns, amt, auth.user!.id);
                      setState(() { _nfcScanning = false; _nfcStatus = 'Received $amt BB!'; });
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Received $amt BB!'), backgroundColor: Colors.green));
                      return;
                    }
                    final json = NFCService.decodeJsonPayload(data);
                    if (json != null && json['nonce'] != null) {
                      final ns = json['nonce'] as String;
                      final amt = (json['amount'] as num?)?.toDouble() ?? 0;
                      if (amt > 0) {
                        final auth = context.read<AuthService>();
                        await TransactionService().processNFCTransfer(ns, amt, auth.user!.id);
                        setState(() { _nfcScanning = false; _nfcStatus = 'Received $amt BB!'; });
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Received $amt BB!'), backgroundColor: Colors.green));
                        return;
                      }
                    }
                    setState(() { _nfcScanning = false; _nfcStatus = 'Unknown tag format.'; });
                  } catch (e) {
                    setState(() { _nfcScanning = false; _nfcStatus = 'Error: ${e.toString().substring(0, 30)}...'; });
                  }
                },
                icon: _nfcScanning ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.nfc),
                label: Text(_nfcScanning ? 'Scanning...' : 'Start NFC Scan'),
              ),
          ],
        ),
      ),
    );
  }
}
