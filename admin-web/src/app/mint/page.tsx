'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function MintPage() {
  const [form, setForm] = useState({ userId: '', amount: '', note: '', tokenId: '' });
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    api.get('/tokens?limit=100').then(d => setTokens(d.data || [])).catch(() => {});
  }, []);

  // Auto-select first token if available
  useEffect(() => {
    if (tokens.length > 0 && !form.tokenId) {
      setForm(f => ({ ...f, tokenId: tokens[0].id }));
    }
  }, [tokens]);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.amount) {
      toast.error('User ID and amount are required');
      return;
    }
    setLoading(true);
    try {
      const idempotencyKey = `admin-mint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await api.post('/wallets/mint', {
        userId: form.userId,
        amount: parseFloat(form.amount),
        note: form.note || undefined,
        tokenId: form.tokenId || undefined,
        idempotencyKey,
      });
      const tokenName = tokens.find(t => t.id === form.tokenId)?.symbol || 'tokens';
      toast.success(`Minted ${form.amount} ${tokenName} successfully!`);
      setForm({ userId: '', amount: '', note: '', tokenId: tokens[0]?.id || '' });
    } catch (err: any) {
      toast.error(err.message || 'Mint failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Mint Tokens</h1>
      <p className="text-gray-500 mb-6">Create and send tokens to users</p>

      <div className="max-w-xl bg-white rounded-xl border border-gray-100 p-6">
        <form onSubmit={handleMint} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token Type</label>
            <select
              value={form.tokenId}
              onChange={(e) => setForm({ ...form, tokenId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              {tokens.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              placeholder="UUID of the user"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="100"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Employee of the Month reward"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Minting...' : 'Mint Tokens'}
          </button>
        </form>
      </div>
    </div>
  );
}
