'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ merchantId: '', periodStart: '', periodEnd: '' });
  const [clearForm, setClearForm] = useState({ merchantId: '' });
  const [clearing, setClearing] = useState(false);

  const fetchSettlements = async (p: number) => {
    setLoading(true);
    try {
      const data = await api.get(`/settlements?page=${p}&limit=20`);
      setSettlements(data.data);
      setTotal(data.total);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettlements(page); }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/settlements', { merchantId: form.merchantId, periodStart: form.periodStart || undefined, periodEnd: form.periodEnd || undefined });
      toast.success('Settlement created');
      setForm({ merchantId: '', periodStart: '', periodEnd: '' });
      fetchSettlements(page);
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearForm.merchantId) return;
    setClearing(true);
    try {
      const res = await api.post(`/settlements/clear/${clearForm.merchantId}`);
      toast.success(`Cleared ${res.clearedTokens} BB from ${res.merchantName}`);
      setClearForm({ merchantId: '' });
      fetchSettlements(page);
    } catch (err: any) { toast.error(err.message); }
    finally { setClearing(false); }
  };

  const markPaid = async (id: string) => {
    try {
      const res = await api.patch(`/settlements/${id}/pay`);
      toast.success(`Paid EUR ${res.settlement.convertedAmount.toFixed(2)} — cleared ${res.clearedTokens || 0} BB`);
      fetchSettlements(page);
    } catch (err: any) { toast.error(err.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Settlements</h1>
      <p className="text-gray-500 mb-2">Flow: User sends BB → Merchant collects → Admin pays EUR → Clear wallet</p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm">
        <strong>Business Flow:</strong> When you <strong>Mark Paid</strong>, the merchant's BB wallet is automatically zeroed.
        Use <strong>Quick Clear</strong> below to zero a merchant balance without creating a settlement.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold mb-4">Create Settlement</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Merchant ID</label>
              <input type="text" value={form.merchantId} onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
                placeholder="UUID" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <button type="submit" disabled={creating}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 w-full">
              {creating ? 'Creating...' : 'Create Settlement'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold mb-4">Quick Clear Balance</h3>
          <p className="text-xs text-gray-500 mb-3">Zero out a merchant wallet immediately (no settlement record)</p>
          <form onSubmit={handleClear} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Merchant ID</label>
              <input type="text" value={clearForm.merchantId} onChange={(e) => setClearForm({ merchantId: e.target.value })}
                placeholder="UUID" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <button type="submit" disabled={clearing}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 w-full">
              {clearing ? 'Clearing...' : 'Clear Balance'}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Merchant</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">BB</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">EUR</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
            : settlements.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No settlements yet</td></tr>
            : settlements.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-sm font-medium">{s.merchant?.businessName || s.merchantId}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(s.periodStart).toLocaleDateString()} - {new Date(s.periodEnd).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-mono">{s.totalTokens} BB</td>
                  <td className="px-6 py-4 text-sm font-mono font-medium">EUR {s.convertedAmount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === 'paid' ? 'bg-green-50 text-green-700' : s.status === 'approved' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>{s.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {s.status !== 'paid' && (
                      <button onClick={() => markPaid(s.id)}
                        className="text-xs px-3 py-1 rounded-lg font-medium bg-green-50 text-green-600 hover:bg-green-100">
                        Pay & Clear
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="text-sm text-gray-600 hover:text-primary disabled:opacity-30">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="text-sm text-gray-600 hover:text-primary disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
