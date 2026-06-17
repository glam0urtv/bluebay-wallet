'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ phone: '', pin: '', fullName: '', email: '', role: 'user' });

  const fetchUsers = async (p: number) => {
    setLoading(true);
    try {
      const data = await api.get(`/users?page=${p}&limit=20`);
      setUsers(data.data);
      setTotal(data.total);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(page); }, [page]);

  const resetForm = () => {
    setForm({ phone: '', pin: '', fullName: '', email: '', role: 'user' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/users/${editingId}`, {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email || undefined,
          role: form.role,
          ...(form.pin ? { pin: form.pin } : {}),
        });
        toast.success('User updated');
      } else {
        await api.post('/users', form);
        toast.success('User created');
      }
      resetForm();
      fetchUsers(page);
    } catch (err: any) { toast.error(err.message); }
  };

  const startEdit = (u: any) => {
    setForm({ phone: u.phone, pin: '', fullName: u.fullName, email: u.email || '', role: u.role });
    setEditingId(u.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try { await api.delete(`/users/${id}`); toast.success('User deleted'); fetchUsers(page); }
    catch (err: any) { toast.error(err.message); }
  };

  const toggleActive = async (userId: string) => {
    try {
      await api.patch(`/users/${userId}/toggle-active`);
      fetchUsers(page);
    } catch (err: any) { toast.error(err.message); }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('User ID copied!');
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-gray-500">{total} total users</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 mb-6 space-y-4">
          <h3 className="font-semibold">{editingId ? 'Edit User' : 'New User'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN {editingId && '(leave empty to keep)'}</label>
              <input type="password" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" required={!editingId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="user">User</option>
                <option value="merchant">Merchant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center justify-center gap-1">
                <Check className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
            : users.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No users</td></tr>
            : users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{u.fullName}</p>
                    <button onClick={() => copyId(u.id)} className="text-xs text-gray-400 hover:text-primary font-mono">{u.id.slice(0, 8)}...</button>
                  </td>
                  <td className="px-6 py-4 text-sm">{u.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700' : u.role === 'merchant' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">{u.wallet?.balance ?? 0} BB</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="ml-2 text-sm">{u.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" /></button>
                      {u.role !== 'admin' && (
                        <button onClick={() => toggleActive(u.id)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      {u.role !== 'admin' && (
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" /></button>
                      )}
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
