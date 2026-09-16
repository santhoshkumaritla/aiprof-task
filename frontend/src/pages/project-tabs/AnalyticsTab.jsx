import React, { useEffect, useState } from 'react';
import { BarChart3, Activity, Bot, BookOpen, Brain, CheckSquare, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

const EVENT_ICONS = {
  project_created: '🚀',
  material_uploaded: '📤',
  material_processed: '✅',
  material_failed: '❌',
  tutor_interaction: '🤖',
  quiz_generated: '📝',
  quiz_completed: '🏆',
  mastery_updated: '📈',
  recommendation_generated: '💡',
  recommendation_completed: '✔️'
};

export const AnalyticsTab = ({ projectId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjectAnalytics(projectId).then(setData).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const quizAttempts = data?.quizAttempts || [];
  const events = data?.recentEvents || [];
  const dist = data?.conceptsDistribution || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Quizzes Taken', value: data?.totalQuizzes || 0, icon: CheckSquare, color: 'text-indigo-400' },
          { label: 'Avg Quiz Score', value: `${data?.avgScore || 0}%`, icon: Brain, color: 'text-emerald-400' },
          { label: 'AI Invocations', value: data?.totalAIInvocations || 0, icon: Bot, color: 'text-violet-400' },
          { label: 'Concepts Improving', value: dist.improving || 0, icon: BarChart3, color: 'text-cyan-400' }
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="glass-panel p-5 rounded-2xl flex items-start gap-3">
              <Icon className={`w-5 h-5 ${m.color} mt-0.5 shrink-0`} />
              <div>
                <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quiz Score History as bar chart (CSS) */}
      {quizAttempts.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Quiz Score History
          </h3>
          <div className="flex items-end gap-2 h-32 pt-2">
            {quizAttempts.map((attempt, i) => {
              const height = Math.max(8, (attempt.score / 100) * 100);
              const color = attempt.score >= 80 ? 'bg-emerald-500' : attempt.score >= 55 ? 'bg-indigo-500' : 'bg-rose-500';
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                  <span className="text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition">{attempt.score}%</span>
                  <div
                    className={`w-full rounded-t-lg ${color} transition-all`}
                    style={{ height: `${height}%` }}
                    title={`Quiz ${i + 1}: ${attempt.score}%`}
                  />
                  <span className="text-[10px] text-slate-500">Q{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Concept Distribution */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Concept Status Distribution</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Improving', count: dist.improving || 0, color: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            { label: 'Stable', count: dist.stable || 0, color: 'indigo', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
            { label: 'Needs Work', count: dist.requiringAttention || 0, color: 'rose', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' }
          ].map((s) => (
            <div key={s.label} className={`p-4 rounded-xl ${s.bg} border ${s.border} text-center`}>
              <p className={`text-3xl font-extrabold ${s.text}`}>{s.count}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Stream */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          Recent Learning Activity
        </h3>

        {events.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {events.map((ev, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
                <span className="text-lg shrink-0 mt-0.5">{EVENT_ICONS[ev.eventType] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ev.description}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No learning events recorded yet.</p>
        )}
      </div>
    </div>
  );
};
