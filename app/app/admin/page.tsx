'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalDictations: number;
  monthDictations: number;
  topModes: { mode: string; count: number }[];
  topUsers: { name: string; email: string; count: number }[];
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription_tier: string;
  created_at: string;
  dictation_count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users' | 'firms'>('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteMsg, setInviteMsg] = useState('');

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, planFilter, page]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (planFilter) params.set('plan', planFilter);
      params.set('page', page.toString());
      params.set('limit', '20');
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      if (res.ok) {
        setInviteMsg('User invited successfully');
        setInviteEmail('');
        setInviteName('');
        fetchUsers();
      } else {
        const data = await res.json();
        setInviteMsg(data.error || 'Failed to invite');
      }
    } catch {
      setInviteMsg('Connection failed');
    }
    setTimeout(() => setInviteMsg(''), 3000);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-ink-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-ink-400 hover:text-ink-200 text-sm">&larr; Back</Link>
          <h1 className="font-display text-lg text-ink-50">
            Admin <span className="text-gold-400">Dashboard</span>
          </h1>
        </div>
        <div className="flex gap-1">
          {(['overview', 'users', 'firms'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize ${tab === t ? 'bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6 max-w-5xl">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats?.totalUsers ?? '-', color: 'text-gold-400' },
                { label: 'Active (30d)', value: stats?.activeUsers ?? '-', color: 'text-green-400' },
                { label: 'Total Dictations', value: stats?.totalDictations ?? '-', color: 'text-gold-400' },
                { label: 'This Month', value: stats?.monthDictations ?? '-', color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-4">
                  <p className="text-xs text-ink-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-display ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Top Modes */}
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-ink-200 mb-3">Most Used Document Modes</h3>
              <div className="space-y-2">
                {(stats?.topModes || []).map(m => (
                  <div key={m.mode} className="flex items-center justify-between">
                    <span className="text-sm text-ink-300 capitalize">{m.mode.replace(/-/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-ink-800 rounded-full h-2">
                        <div
                          className="bg-gold-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, (m.count / (stats?.totalDictations || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-500 w-8 text-right">{m.count}</span>
                    </div>
                  </div>
                ))}
                {(!stats?.topModes || stats.topModes.length === 0) && (
                  <p className="text-xs text-ink-600 italic">No data yet</p>
                )}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-ink-200 mb-3">Top Users by Usage</h3>
              <div className="space-y-2">
                {(stats?.topUsers || []).map((u, i) => (
                  <div key={u.email} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-500 w-4">{i + 1}.</span>
                      <span className="text-sm text-ink-200">{u.name || u.email}</span>
                    </div>
                    <span className="text-xs text-ink-400">{u.count} dictations</span>
                  </div>
                ))}
                {(!stats?.topUsers || stats.topUsers.length === 0) && (
                  <p className="text-xs text-ink-600 italic">No data yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-4 max-w-5xl">
            {/* Invite Form */}
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-ink-200 mb-3">Invite User</h3>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="Email"
                  className="flex-1 min-w-[200px] bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
                />
                <input
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Name"
                  className="w-40 bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-200"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button onClick={inviteUser} className="px-4 py-2 bg-gold-500 text-ink-950 rounded-lg text-sm font-medium">Invite</button>
              </div>
              {inviteMsg && <p className="text-xs text-gold-400 mt-2">{inviteMsg}</p>}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search users..."
                className="flex-1 min-w-[200px] bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500"
              />
              <select
                value={roleFilter}
                onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-200"
              >
                <option value="">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
              <select
                value={planFilter}
                onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
                className="bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-200"
              >
                <option value="">All Plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="bg-ink-900/50 border border-ink-800/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-800/50">
                    <th className="text-left px-4 py-2.5 text-xs text-ink-400 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs text-ink-400 font-medium">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs text-ink-400 font-medium">Role</th>
                    <th className="text-left px-4 py-2.5 text-xs text-ink-400 font-medium">Plan</th>
                    <th className="text-left px-4 py-2.5 text-xs text-ink-400 font-medium">Joined</th>
                    <th className="text-right px-4 py-2.5 text-xs text-ink-400 font-medium">Dictations</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-ink-800/30 hover:bg-ink-800/20">
                      <td className="px-4 py-2.5 text-ink-200">{u.name || '-'}</td>
                      <td className="px-4 py-2.5 text-ink-300">{u.email || '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.role === 'owner' ? 'bg-gold-500/20 text-gold-400' :
                          u.role === 'admin' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-ink-700 text-ink-300'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.subscription_tier === 'enterprise' ? 'bg-gold-500/20 text-gold-400' :
                          u.subscription_tier === 'pro' ? 'bg-green-500/20 text-green-300' :
                          'bg-ink-700 text-ink-400'
                        }`}>{u.subscription_tier}</span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-400 text-xs">{u.created_at ? formatDate(u.created_at) : '-'}</td>
                      <td className="px-4 py-2.5 text-ink-300 text-right">{u.dictation_count ?? 0}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-600 text-xs italic">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs bg-ink-800 text-ink-300 disabled:opacity-40"
              >Previous</button>
              <span className="text-xs text-ink-500">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={users.length < 20}
                className="px-3 py-1.5 rounded-lg text-xs bg-ink-800 text-ink-300 disabled:opacity-40"
              >Next</button>
            </div>
          </div>
        )}

        {/* Firms Tab */}
        {tab === 'firms' && (
          <div className="max-w-3xl">
            <p className="text-ink-400 text-sm">Firm management — configure firm profiles, vocabulary, and white-label branding from Settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
