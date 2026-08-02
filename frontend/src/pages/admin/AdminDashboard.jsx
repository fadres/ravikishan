import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

function StatCard({ label, value, icon, color = 'aqua' }) {
  return (
    <div className="glass rounded-2xl p-5" role="region" aria-label={label}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">{label}</span>
      </div>
      <p className={`text-2xl font-extrabold text-${color}-300`}>{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api('/api/progress/admin/analytics');
        setStats(res);
      } catch {
        setError('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  if (error) {
    return <div className="max-w-4xl mx-auto px-4 py-10"><p className="text-rose-300">{error}</p></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Platform Overview</h1>
      <p className="text-sm text-slate-400 mb-8">Key metrics for the Study Vault platform.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Active Users" value={stats?.activeUsers ?? 0} icon="👥" />
        <StatCard label="Progress Records" value={stats?.totalProgress ?? 0} icon="📊" />
        <StatCard label="Bookmarks" value={stats?.totalBookmarks ?? 0} icon="🔖" />
        <StatCard label="Events Tracked" value={stats?.totalEvents ?? 0} icon="📈" />
        <StatCard label="Avg. Time/Event" value={`${stats?.avgTimeSpent ?? 0}s`} icon="⏱" />
        <StatCard label="Subjects" value={0} icon="📚" />
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/content" className="px-4 py-2 rounded-xl bg-aqua-400/20 text-aqua-200 text-sm font-bold hover:bg-aqua-400/30 transition border border-aqua-400/30">
            Manage Content
          </a>
          <a href="/admin/users" className="px-4 py-2 rounded-xl bg-emerald-400/20 text-emerald-200 text-sm font-bold hover:bg-emerald-400/30 transition border border-emerald-400/30">
            Manage Users
          </a>
          <a href="/admin/audit" className="px-4 py-2 rounded-xl bg-violet-400/20 text-violet-200 text-sm font-bold hover:bg-violet-400/30 transition border border-violet-400/30">
            Audit Trail
          </a>
          <a href="/admin/upload" className="px-4 py-2 rounded-xl bg-amber-400/20 text-amber-200 text-sm font-bold hover:bg-amber-400/30 transition border border-amber-400/30">
            File Uploads
          </a>
        </div>
      </div>
    </div>
  );
}