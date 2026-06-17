'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, Store, ArrowLeftRight, Coins } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ users: 0, merchants: 0, transactions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users?limit=1').then((d) => d.total).catch(() => 0),
      api.get('/merchants?limit=1').then((d) => d.total).catch(() => 0),
      api.get('/settlements?limit=1').then((d) => d.total).catch(() => 0),
    ]).then(([users, merchants, settlements]) => {
      setStats({ users, merchants, transactions: settlements });
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Merchants', value: stats.merchants, icon: Store, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Settlements', value: stats.transactions, icon: ArrowLeftRight, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Token Supply', value: '-', icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{loading ? '...' : card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/mint" className="block p-4 border border-dashed border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50/30 transition-colors">
              <p className="font-medium text-primary">Mint Tokens</p>
              <p className="text-sm text-gray-500">Create and distribute tokens to users</p>
            </a>
            <a href="/users" className="block p-4 border border-dashed border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50/30 transition-colors">
              <p className="font-medium text-primary">Manage Users</p>
              <p className="text-sm text-gray-500">View, activate, or deactivate users</p>
            </a>
            <a href="/merchants" className="block p-4 border border-dashed border-gray-200 rounded-lg hover:border-primary hover:bg-primary-50/30 transition-colors">
              <p className="font-medium text-primary">Manage Merchants</p>
              <p className="text-sm text-gray-500">Set conversion rates, toggle active status</p>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">System Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">API Version</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Database</span>
              <span className="font-mono">SQLite (Prisma)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Transaction Security</span>
              <span className="font-mono">Idempotency Keys</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Transfer Methods</span>
              <span className="font-mono">QR + NFC (Android)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
