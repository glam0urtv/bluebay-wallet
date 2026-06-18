import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MerchantListScreen extends StatefulWidget {
  const MerchantListScreen({super.key});

  @override
  State<MerchantListScreen> createState() => _MerchantListScreenState();
}

class _MerchantListScreenState extends State<MerchantListScreen> {
  List<dynamic> _merchants = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ApiService();
      final data = await api.get('/merchants/list');
      setState(() {
        _merchants = (data is List ? data : (data['data'] as List? ?? [])) as List<dynamic>;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Select Store')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _merchants.isEmpty
              ? const Center(child: Text('No merchants available', style: TextStyle(color: Colors.grey)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _merchants.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final m = _merchants[index];
                    final merchantId = m['id'] as String? ?? '';
                    final name = m['businessName'] as String? ?? 'Unknown';
                    final category = m['businessCategory'] as String? ?? '';
                    final rate = m['conversionRate'] as num? ?? 1.0;
                    final userId = m['userId'] as String? ?? '';

                    return Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: Colors.grey.shade200)),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          final tokenRates = (m['tokenRates'] as List<dynamic>?) ?? [];
                          final defaultRate = (m['conversionRate'] as num?)?.toDouble() ?? 1.0;
                          Navigator.pop(context, {
                            'merchantId': merchantId,
                            'userId': userId,
                            'name': name,
                            'rate': defaultRate,
                            'tokenRates': tokenRates.map((tr) => {
                              'tokenId': tr['tokenId'] as String,
                              'conversionRate': (tr['conversionRate'] as num).toDouble(),
                            }).toList(),
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 48, height: 48,
                                decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(12)),
                                child: Icon(Icons.store, color: Colors.purple.shade400),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                                    if (category.isNotEmpty) Text(category, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  if ((m['tokenRates'] as List<dynamic>?)?.isNotEmpty == true)
                                    ...((m['tokenRates'] as List<dynamic>?)!).take(3).map((tr) => Text(
                                      '1 ${tr['token']?['symbol'] ?? '?'} = EUR ${(tr['conversionRate'] as num?)?.toStringAsFixed(2) ?? '1.00'}',
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                                    )).toList()
                                  else
                                    Text('1 BB = EUR ${rate.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                ],
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.chevron_right, color: Colors.grey),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
