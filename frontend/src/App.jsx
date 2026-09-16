import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AdminNavbar } from './components/AdminNavbar';
import { AdminSidebar } from './components/AdminSidebar';
import { Home } from './pages/Home';
import { SpaceView } from './pages/SpaceView';
import { ProjectWorkspace } from './pages/ProjectWorkspace';
import { GlobalAnalytics } from './pages/GlobalAnalytics';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';
import { ShieldAlert, ExternalLink, ArrowRight } from 'lucide-react';

const AppShell = () => {
  const [learnerSidebarOpen, setLearnerSidebarOpen] = useState(false);
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Initializing AI Study Companion...</p>
        </div>
      </div>
    );
  }

  const isAdminRoute = location.pathname.startsWith('/admin');

  // 1. Unauthenticated Route Handling:
  if (!user) {
    return <LoginPage defaultPortal={isAdminRoute ? 'admin' : 'learner'} />;
  }

  // 2. ADMIN PORTAL ROUTE TREE (/admin/*)
  if (isAdminRoute) {
    // Strict Guard: Learner accounts cannot view Admin Console
    if (user.role !== 'admin') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-3xl border border-rose-500/30 bg-slate-900/90 backdrop-blur-xl text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Administrator Console Access Required
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              You are signed in as <strong>{user.name}</strong> ({user.email}) with a standard <strong>Learner (Student)</strong> account. The Admin Control Center is restricted to platform administrators.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <span>Return to Learner Workspace</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/admin/login');
                }}
                className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Sign in with Administrator Account
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Pure Admin Window & Portal: Dedicated Admin Navbar & Sidebar
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-emerald-500/30">
        <AdminNavbar toggleSidebar={() => setAdminSidebarOpen(!adminSidebarOpen)} />
        <div className="flex flex-1">
          <AdminSidebar isOpen={adminSidebarOpen} onClose={() => setAdminSidebarOpen(false)} />
          <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
            <Routes>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/analytics" element={<GlobalAnalytics />} />
              <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    );
  }

  // 3. LEARNER PORTAL ROUTE TREE (/*)
  const isAdminUser = user.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-indigo-500/30">
      {/* Top Banner for Admin visiting Learner Workspace */}
      {isAdminUser && (
        <div className="bg-emerald-950/50 border-b border-emerald-500/30 px-4 py-1.5 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Administrator Viewing Learner Workspace:</span>
            <span className="text-emerald-400/90">{user.name} ({user.email})</span>
          </div>
          <Link
            to="/admin"
            className="font-bold text-emerald-300 hover:text-white flex items-center gap-1 hover:underline"
          >
            <span>Return to Admin Control Center</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <Navbar toggleSidebar={() => setLearnerSidebarOpen(!learnerSidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={learnerSidebarOpen} onClose={() => setLearnerSidebarOpen(false)} />
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/spaces" element={<SpaceView />} />
            <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
            <Route path="/analytics" element={<GlobalAnalytics />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
