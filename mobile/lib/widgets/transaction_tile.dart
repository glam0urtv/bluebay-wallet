import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';

class TransactionTile extends StatelessWidget {
  final Transaction transaction;

  const TransactionTile({super.key, required this.transaction});

  @override
  Widget build(BuildContext context) {
    final isIncoming = transaction.type == 'admin_mint' ||
        (transaction.fromWalletId == null);
    final theme = Theme.of(context);

    IconData icon;
    Color color;
    switch (transaction.type) {
      case 'admin_mint':
        icon = Icons.stars;
        color = Colors.amber;
        break;
      case 'p2p':
        icon = isIncoming ? Icons.arrow_downward : Icons.arrow_upward;
        color = isIncoming ? Colors.green : Colors.red;
        break;
      case 'p2m':
        icon = Icons.shopping_cart;
        color = Colors.purple;
        break;
      case 'reversal':
        icon = Icons.undo;
        color = Colors.orange;
        break;
      default:
        icon = Icons.swap_horiz;
        color = Colors.grey;
    }

    final prefix = isIncoming ? '+' : '-';

    return ListTile(
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(
        transaction.displayType,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      subtitle: Text(
        transaction.note ?? DateFormat('MMM d, HH:mm').format(transaction.createdAt),
        style: const TextStyle(fontSize: 12),
      ),
      trailing: Text(
        '$prefix${transaction.amount.toStringAsFixed(2)}',
        style: TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 15,
          color: isIncoming ? Colors.green : Colors.red,
        ),
      ),
    );
  }
}
