'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react';

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ userId: '', businessName: '', businessCategory: '', conversionRate: '1.0' });
  const [tokens, setTokens] = useState<any[]>([]);
  const [tokenRates, setTokenRates] = useState<{tokenId: string; conversionRate: string}[]>([]);

  useEffect(() => { api.get('/tokens?limit=100').then(d => setTokens(d.data || [])).catch(() => {}); }, []);

  const fetchMerchants = async (p: number) => {
    setLoading(true);
    try {
      const data = await api.get(`/merchants?page=${p}&limit=20`);
      setMerchants(data.data);
      setTotal(data.total);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMerchants(page); }, [page]);

  const resetForm = () => {
    setForm({ userId: '', businessName: '', businessCategory: '', conversionRate: '1.0' });
    setTokenRates([]);
    setEditingId(null);
    setShowForm(false);
  };

  const addTokenRate = () => {
    if (tokens.length === 0) return;
    const existingIds = tokenRates.map(tr => tr.tokenId);
    const available = tokens.find(t => !existingIds.includes(t.id));
    if (available) setTokenRates([...tokenRates, { tokenId: available.id, conversionRate: '1.0' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: any = {
        businessName: form.businessName,
        businessCategory: form.businessCategory || null,
        conversionRate: parseFloat(form.conversionRate),
        tokenRates: tokenRates.map(tr => ({ tokenId: tr.tokenId, conversionRate: parseFloat(tr.conversionRate) })),
      };
      if (!editingId) body.userId = form.userId;

      if (editingId) {
        await api.patch(`/merchants/${editingId}`, body);
        toast.success('Merchant updated');
      } else {
        await api.post('/merchants', body);
        toast.success('Merchant created');
      }
      resetForm();
      fetchMerchants(page);
    } catch (err: any) { toast.error(err.message); }
  };

  const startEdit = (m: any) => {
    setForm({
      userId: m.userId, businessName: m.businessName, businessCategory: m.businessCategory || '', conversionRate: String(m.conversionRate),
    });
    setTokenRates((m.tokenRates || []).map((tr: any) => ({ tokenId: tr.tokenId, conversionRate: String(tr.conversionRate) })));
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this merchant?')) return;
    try { await api.delete(`/merchants/${id}`); toast.success('Deleted'); fetchMerchants(page); }
    catch (err: any) { toast.error(err.message); }
  };

  const toggleActive = async (id: string) => {
    try { await api.patch(`/merchants/${id}/toggle-active`); fetchMerchants(page); }
    catch (err: any) { toast.error(err.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Merchants</h1>
          <p className="text-gray-500">{total} registered</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Merchant'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 mb-6 space-y-4">
          <h3 className="font-semibold">{editingId ? 'Edit Merchant' : 'New Merchant'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input type="text" value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input type="text" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={form.businessCategory} onChange={e => setForm({...form, businessCategory: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default 1 BB = EUR</label>
              <input type="number" step="0.01" value={form.conversionRate} onChange={e => setForm({...form, conversionRate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Per-Token Rates</h4>
              <button type="button" onClick={addTokenRate} className="text-xs text-primary hover:underline">+ Add Token Rate</button>
            </div>
            {tokenRates.map((tr, i) => {
              const token = tokens.find(t => t.id === tr.tokenId);
              return (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <select value={tr.tokenId} onChange={e => {
                    const updated = [...tokenRates]; updated[i].tokenId = e.target.value; setTokenRates(updated);
                  }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
                    {tokens.map(t => <option key={t.id} value={t.id}>{t.name} ({t.symbol})</option>)}
                  </select>
                  <label className="text-xs text-gray-500">1 = EUR</label>
                  <input type="number" step="0.01" value={tr.conversionRate} onChange={e => {
                    const updated = [...tokenRates]; updated[i].conversionRate = e.target.value; setTokenRates(updated);
                  }} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => setTokenRates(tokenRates.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-1">
            <Check className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Business</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Token Rates</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
            : merchants.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No merchants</td></tr>
            : merchants.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{m.businessName}</p>
                    <p className="text-xs text-gray-400">{m.businessCategory || '—'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {(m.tokenRates || []).length > 0
                        ? m.tokenRates.map((tr: any) => (
                            <span key={tr.tokenId} className="inline-flex px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-mono">
                              {tr.token?.symbol || '?'}=€{tr.conversionRate}
                            </span>
                          ))
                        : <span className="text-gray-400 text-xs">No rates set</span>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">{m.user?.wallet?.balance ?? 0} BB</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex w-2 h-2 rounded-full ${m.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="ml-2 text-sm">{m.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActive(m.id)} className={`text-xs px-2 py-1 rounded-lg font-medium ${m.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{m.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
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
