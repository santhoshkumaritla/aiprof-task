import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, Loader2, TrendingUp, Layers, FolderKanban, FileText, Activity, CheckSquare, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/ProgressBar';

export const GlobalAnalytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getGlobalAnalytics();
      setData(res);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load global analytics:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    // Auto-poll live database metrics every 5 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const s = data?.summary || {};
  const weeklyActivity = data?.weeklyActivity || [0, 0, 0, 0, 0, 0, 0];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxActivity = Math.max(...weeklyActivity, 1);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-400" />
            Global Learning Analytics
            {isAdmin && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PLATFORM REAL-TIME
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin
              ? 'Real-time database aggregated metrics across all platform workspaces and learners.'
              : 'Aggregated real-time metrics across all your Spaces and Projects.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MongoDB Live Sync</span>
            <span className="text-[10px] text-emerald-400/70 ml-1">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </div>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm disabled:opacity-50"
            title="Refresh analytics from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Spaces', value: s.totalSpaces || 0, icon: Layers, color: 'text-indigo-400', bg: 'from-indigo-600/10 to-indigo-600/0' },
          { label: 'Active Projects', value: s.totalProjects || 0, icon: FolderKanban, color: 'text-violet-400', bg: 'from-violet-600/10 to-violet-600/0' },
          { label: 'Materials Uploaded', value: s.totalMaterials || 0, icon: FileText, color: 'text-cyan-400', bg: 'from-cyan-600/10 to-cyan-600/0' },
          { label: 'Quizzes Completed', value: s.totalQuizzesTaken || 0, icon: CheckSquare, color: 'text-emerald-400', bg: 'from-emerald-600/10 to-emerald-600/0' }
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className={`glass-panel p-6 rounded-2xl bg-gradient-to-br ${m.bg}`}>
              <Icon className={`w-6 h-6 ${m.color} mb-3`} />
              <p className={`text-3xl font-extrabold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-slate-400 mt-1">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Mastery & Score Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Platform Mastery Metrics
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>Average Concept Mastery</span>
                <span className="font-bold text-emerald-400">{s.averageMastery || 0}%</span>
              </div>
              <ProgressBar progress={s.averageMastery || 0} showLabel={false} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>Average Quiz Score</span>
                <span className="font-bold text-indigo-400">{s.averageQuizScore || 0}%</span>
              </div>
              <ProgressBar progress={s.averageQuizScore || 0} showLabel={false} />
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-400">Estimated Study Hours</span>
              <span className="text-white font-bold">{s.estimatedStudyHours || 0}h</span>
            </div>
          </div>
        </div>

        {/* Weekly Activity Heatmap */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Weekly Activity
          </h3>
          <div className="flex items-end gap-2 h-28">
            {weeklyActivity.map((count, i) => {
              const height = Math.max(4, (count / maxActivity) * 100);
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-slate-300">{count > 0 ? count : ''}</span>
                  <div
                    className="w-full rounded-t-lg bg-indigo-600/60 hover:bg-indigo-500 transition"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-slate-500">{days[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weak Areas across all projects */}
      {(data?.weakAreas || []).length > 0 && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Global Weak Concept Areas</h3>
          <div className="space-y-2">
            {data.weakAreas.map((area) => (
              <div key={area.id || area.name} className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{area.name}</p>
                  <ProgressBar progress={area.estimatedMastery} showLabel={false} size="sm" className="mt-2" />
                </div>
                <span className="text-sm font-bold text-rose-400">{area.estimatedMastery}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {(data?.recentProjects || []).length > 0 && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Project Overview</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.recentProjects.map((proj) => (
              <div key={proj._id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{proj.title}</p>
                  <span className="text-xs font-semibold text-indigo-400">{proj.progress || 0}%</span>
                </div>
                <ProgressBar progress={proj.progress || 0} showLabel={false} size="sm" />
                <div className="flex gap-3 text-[11px] text-slate-400">
                  <span>{proj.stats?.materialsCount || 0} materials</span>
                  <span>{proj.stats?.conceptsCount || 0} concepts</span>
                  <span>{proj.stats?.quizzesTaken || 0} quizzes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
