import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Cpu,
  Bot,
  Activity,
  BarChart3,
  ArrowRight,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const AdminSidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-emerald-900/20 bg-slate-950/95 backdrop-blur-md p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Platform Administration
            </span>
            <nav className="mt-3 space-y-1">
              <NavLink
                to="/admin"
                end
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-emerald-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Control Center</span>
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </NavLink>

              <NavLink
                to="/admin/analytics"
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-emerald-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <BarChart3 className="w-4 h-4 text-teal-400" />
                <span>Global Analytics</span>
              </NavLink>
            </nav>
          </div>

          {/* Quick Access Info */}
          <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 text-xs">
            <div className="flex items-center gap-2 mb-1.5 text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              All AI latencies, token calculations, and user journeys update live from MongoDB every 5 seconds.
            </p>
          </div>
        </div>

        {/* Bottom Switcher: In-App Learner Workspace Navigation */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <Link
            to="/"
            onClick={() => onClose && onClose()}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-950/40 hover:bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 transition shadow-sm"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Learner Workspace</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    </>
  );
};
