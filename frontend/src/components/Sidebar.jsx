import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  ShieldCheck,
  Compass,
  Layers,
  Users,
  Cpu,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
        className={`fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-slate-800 bg-slate-950/90 backdrop-blur-md p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-5">
          {/* Learner Journey Section */}
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Learner Navigation
            </span>
            <nav className="mt-2 space-y-1">
              <NavLink
                to="/"
                end
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Home Dashboard</span>
              </NavLink>

              <NavLink
                to="/spaces"
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <FolderKanban className="w-4 h-4" />
                <span>Spaces & Projects</span>
              </NavLink>

              {!isAdmin && (
                <NavLink
                  to="/analytics"
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`
                  }
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Global Analytics</span>
                </NavLink>
              )}
            </nav>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs mb-1">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Core Learning Loop</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Upload PDF → Process RAG → Grounded AI Tutor → Adaptive Quiz → Concept Mastery Update.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>AI Study Companion</span>
            <span className="font-mono text-[10px] text-indigo-400">v3.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
