import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const TABS = [
  { to: '/admin', label: 'Requests', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/content', label: 'Content' },
  { to: '/admin/audit', label: 'Audit' },
];

export default function AdminLayout() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <p className="text-aqua-300 text-xs font-bold uppercase tracking-[0.2em]">Ravikishan · Owner Panel</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient">Control Centre</h1>
        <p className="text-sm text-slate-400 mt-1">Access requests, members, content and audit trail.</p>
      </div>

      <nav className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-aqua-400/20 border-aqua-400/50 text-aqua-100'
                  : 'border-white/12 text-slate-300 hover:bg-white/10'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
