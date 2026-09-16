import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Shield, User, Menu, LogOut, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AISettingsModal } from './AISettingsModal';

export const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [toastMsg, setToastMsg] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
        {/* Left brand & menu toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                AI Study Companion
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  v3.0
                </span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">Learning & Growth Workspace</p>
            </div>
          </Link>
        </div>

        {/* Center Toast notification */}
        {toastMsg && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium animate-fade-in">
            <span>✓</span> {toastMsg}
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2.5">
          {/* AI Settings button */}
          <button
            onClick={() => setAiModalOpen(true)}
            title="Configure Gemini API or AI Model"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Settings</span>
          </button>


          {/* Role status display */}
          {user?.role === 'admin' ? (
            <Link
              to="/admin"
              title="Open Admin Control Center"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Console</span>
            </Link>
          ) : (
            <div
              title="Learner Student Account"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Learner</span>
            </div>
          )}

          {/* User avatar & logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'Learner'}</p>
              <p className="text-[10px] text-slate-400 capitalize mt-0.5">{user?.role || 'user'}</p>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <AISettingsModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onConfigUpdated={() => setToastMsg('AI Settings Updated')}
      />
    </>
  );
};
