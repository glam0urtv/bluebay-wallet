'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/transactions/nfc/sessions')
      .then((d) => setTxns(d.sent.concat(d.received)))
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    admin_mint: 'bg-green-50 text-green-700',
    p2p: 'bg-blue-50 text-blue-700',
    p2m: 'bg-purple-50 text-purple-700',
    reversal: 'bg-red-50 text-red-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Live Sessions</h1>
      <p className="text-gray-500 mb-6">Active NFC & QR transfer sessions</p>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
      ) : txns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
          No active sessions. They appear here when a user initiates an NFC or QR transfer.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Session ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Expires</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b border-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{t.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 text-sm font-mono">{t.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.expiresAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
