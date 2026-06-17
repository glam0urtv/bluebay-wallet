import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/auth_service.dart';
import '../services/wallet_service.dart';
import '../services/transaction_service.dart';
import '../services/nfc_service.dart';

class SendScreen extends StatefulWidget {
  final String? lockedMerchantId;
  final String? lockedMerchantName;
  final double? lockedMerchantRate;

  const SendScreen({super.key, this.lockedMerchantId, this.lockedMerchantName, this.lockedMerchantRate});

  @override
  State<SendScreen> createState() => _SendScreenState();
}

class _SendScreenState extends State<SendScreen> {
  final _receiverController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  bool _loading = false;
  bool _isMerchantPayment = false;
  bool _nfcAvailable = false;
  bool get _isLocked => widget.lockedMerchantId != null;
  bool _sendingNfc = false;

  @override
  void initState() {
    super.initState();
    _checkNFC();
  }

  Future<void> _checkNFC() async {
    _nfcAvailable = await NFCService.isAvailable();
    if (mounted) setState(() {});
  }

  Future<void> _sendManual() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter an amount'), backgroundColor: Colors.red));
      return;
    }

    final receiver = _isLocked ? widget.lockedMerchantId! : _receiverController.text.trim();
    final isMerchant = _isLocked || _isMerchantPayment;

    if (!_isLocked && receiver.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a receiver ID'), backgroundColor: Colors.red));
      return;
    }

    setState(() => _loading = true);
    try {
      final txService = TransactionService();
      final walletService = WalletService();
      final idempotencyKey = txService.generateIdempotencyKey();

      if (isMerchant) {
        await walletService.sendP2M(merchantId: receiver, amount: amount, idempotencyKey: idempotencyKey, note: _noteController.text.isNotEmpty ? _noteController.text : null);
      } else {
        await walletService.sendP2P(receiverId: receiver, amount: amount, idempotencyKey: idempotencyKey, note: _noteController.text.isNotEmpty ? _noteController.text : null);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Sent $amount BB!'), backgroundColor: Colors.green));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendViaNFC() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter an amount first'), backgroundColor: Colors.red));
      return;
    }

    final nfcOn = await NFCService.isNfcEnabled();
    if (!nfcOn) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enable NFC in your phone settings'), backgroundColor: Colors.orange));
      return;
    }

    setState(() => _sendingNfc = true);
    try {
      final txService = TransactionService();
      final session = await txService.createNFCSession(amount);
      final nonce = session['nonce'];

      final hceStarted = await NFCService.startHce(nonce: nonce, amount: amount);
      if (!hceStarted) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('HCE not supported on this device'), backgroundColor: Colors.red));
        setState(() => _sendingNfc = false);
        return;
      }

      if (!mounted) return;

      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => _NFCReadyScreen(nonce: nonce, amount: amount),
      )).then((_) {
        NFCService.stopHce();
        setState(() => _sendingNfc = false);
      });

      setState(() => _sendingNfc = false);
    } catch (e) {
      if (mounted) {
        setState(() => _sendingNfc = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
      }
    }
  }

  @override
  void dispose() {
    _receiverController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(_isLocked ? 'Pay ${widget.lockedMerchantName}' : 'Send Tokens')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_isLocked) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.purple.shade200)),
              child: Row(children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: Colors.purple.shade100, borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.store, color: Colors.purple.shade600),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.lockedMerchantName!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 2),
                    Text('1 BB = EUR ${(widget.lockedMerchantRate ?? 1.0).toStringAsFixed(2)}', style: TextStyle(color: Colors.purple.shade500, fontSize: 13)),
                  ],
                )),
              ]),
            ),
            const SizedBox(height: 20),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                Icon(Icons.info_outline, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                const Expanded(child: Text('Enter amount. Use QR, NFC (Android), or manual user ID.', style: TextStyle(fontSize: 13))),
              ]),
            ),
            const SizedBox(height: 20),
          ],

          TextField(
            controller: _amountController,
            decoration: const InputDecoration(labelText: 'Amount (BB)', prefixIcon: Icon(Icons.monetization_on)),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: _noteController,
            decoration: const InputDecoration(labelText: 'Note (optional)', prefixIcon: Icon(Icons.note)),
          ),
          const SizedBox(height: 12),

          if (!_isLocked) ...[
            SwitchListTile(
              title: const Text('Pay a Merchant'),
              subtitle: const Text('Toggle for merchant payments'),
              value: _isMerchantPayment,
              onChanged: (v) => setState(() => _isMerchantPayment = v),
            ),

            if (_isMerchantPayment) ...[
              const SizedBox(height: 8),
              TextField(
                controller: _receiverController,
                decoration: const InputDecoration(labelText: 'Merchant User ID', prefixIcon: Icon(Icons.store)),
              ),
            ] else ...[
              const SizedBox(height: 8),
              TextField(
                controller: _receiverController,
                decoration: const InputDecoration(labelText: 'Receiver User ID (optional for NFC)', prefixIcon: Icon(Icons.person)),
              ),
            ],
          ],

          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _loading ? null : _sendManual,
            icon: const Icon(Icons.send),
            label: Text(_loading ? 'Sending...' : _isLocked ? 'Pay ${widget.lockedMerchantName}' : 'Send via ID'),
          ),

          if (!_isMerchantPayment && !_isLocked) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _sendingNfc ? null : _sendViaNFC,
              icon: Icon(Icons.nfc, color: _nfcAvailable ? Colors.blue : Colors.grey),
              label: Text(_nfcAvailable ? 'Send via NFC (tap phones)' : 'NFC not available'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 52)),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => _NFCQRSendScreen(amount: double.tryParse(_amountController.text.trim()) ?? 0)));
              },
              icon: const Icon(Icons.qr_code, color: Colors.blue),
              label: const Text('Send via QR (show code)'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 52)),
            ),
          ],
        ],
      ),
    );
  }
}

class _NFCReadyScreen extends StatelessWidget {
  final String nonce;
  final double amount;

  const _NFCReadyScreen({required this.nonce, required this.amount});

  @override
  Widget build(BuildContext context) {
    final qrData = '$nonce|${amount.toStringAsFixed(2)}|nfc';
    return Scaffold(
      appBar: AppBar(title: const Text('Ready for Tap')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100, height: 100,
                decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.blue.shade50),
                child: const Icon(Icons.nfc, size: 56, color: Colors.blue),
              ),
              const SizedBox(height: 24),
              Text('$amount BB', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              const Text('TAP PHONES NOW', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.blue)),
              const SizedBox(height: 8),
              const Text('Receiver: open app → Receive → NFC → Start Scan\nthen tap your phone to this phone', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontSize: 14)),
              const SizedBox(height: 24),
              const Text('Or scan this QR:', style: TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 8),
              QrImageView(
                data: qrData,
                version: QrVersions.auto,
                size: 160,
                backgroundColor: Colors.white,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NFCQRSendScreen extends StatefulWidget {
  final double amount;
  const _NFCQRSendScreen({required this.amount});

  @override
  State<_NFCQRSendScreen> createState() => _NFCQRSendScreenState();
}

class _NFCQRSendScreenState extends State<_NFCQRSendScreen> {
  String? _qrData;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _generate();
  }

  Future<void> _generate() async {
    try {
      final session = await TransactionService().createQRSession(widget.amount);
      setState(() {
        _qrData = '${session['token']}|${session['amount']}|${session['sessionId']}';
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Send via QR')),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : _qrData == null
                ? const Text('Failed to generate QR')
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                        child: Column(children: [
                          const Text('Show this to receiver', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                          const SizedBox(height: 16),
                          QrImageView(
                            data: _qrData!,
                            version: QrVersions.auto,
                            size: 220,
                            backgroundColor: Colors.white,
                          ),
                          const SizedBox(height: 12),
                          const Text('Expires in 30 seconds', style: TextStyle(color: Colors.red, fontSize: 12)),
                          const SizedBox(height: 8),
                          Text('Amount: ${widget.amount} BB', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        ]),
                      ),
                    ],
                  ),
      ),
    );
  }
}
