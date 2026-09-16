import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, ExternalLink, Activity, Users, Cpu, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminNavbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="h-16 border-b border-emerald-500/20 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand & Badge */}
      <div className="flex items-center gap-3">
        <Link to="/admin" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight flex items-center gap-2">
              Admin Control Center
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                CONSOLE
              </span>
            </span>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              AI Observability &bull; User Inspection &bull; Quality Benchmarks
            </p>
          </div>
        </Link>
      </div>

      {/* Center Live Stream Indicator */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Real-Time Database Stream Active</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Learner Workspace in-app navigation */}
        <Link
          to="/"
          title="Switch to Learner Workspace"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 transition shadow-sm"
        >
          <span>Learner Workspace</span>
        </Link>

        {/* Administrator Profile & Logout */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xs font-bold text-white shadow">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-200 leading-none">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-wide uppercase mt-0.5">
              Platform Admin
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out from Admin Console"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
