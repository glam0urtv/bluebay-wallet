'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit3, X, Check, Coins } from 'lucide-react';

export default function TokensPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', symbol: '', description: '', iconUrl: '' });

  const fetchTokens = async (p: number) => {
    setLoading(true);
    try {
      const data = await api.get(`/tokens?page=${p}&limit=20`);
      setTokens(data.data);
      setTotal(data.total);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTokens(page); }, [page]);

  const resetForm = () => {
    setForm({ name: '', symbol: '', description: '', iconUrl: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/tokens/${editingId}`, {
          name: form.name,
          description: form.description || null,
          iconUrl: form.iconUrl || null,
        });
        toast.success('Token updated');
      } else {
        await api.post('/tokens', form);
        toast.success('Token created');
      }
      resetForm();
      fetchTokens(page);
    } catch (err: any) { toast.error(err.message); }
  };

  const startEdit = (t: any) => {
    setForm({ name: t.name, symbol: t.symbol, description: t.description || '', iconUrl: t.iconUrl || '' });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this token?')) return;
    try { await api.delete(`/tokens/${id}`); toast.success('Deleted'); fetchTokens(page); }
    catch (err: any) { toast.error(err.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Tokens</h1>
          <p className="text-gray-500">{total} token types</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Create Token'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 mb-6 space-y-4">
          <h3 className="font-semibold">{editingId ? 'Edit Token' : 'Create New Token'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="BlueBay Token" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <input type="text" value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value.toUpperCase()})}
                placeholder="BB" maxLength={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary uppercase"
                required disabled={!!editingId} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Official loyalty token" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (for coin display)</label>
              <input type="text" value={form.iconUrl} onChange={e => setForm({...form, iconUrl: e.target.value})}
                placeholder="https://example.com/token-image.jpg" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
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
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Token</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Symbol</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Created By</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
            : tokens.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No tokens yet</td></tr>
            : tokens.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="font-medium">{t.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 bg-primary-50 text-primary rounded-lg text-xs font-bold font-mono">{t.symbol}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.description || '-'}</td>
                  <td className="px-6 py-4 text-sm">{t.admin?.fullName || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
