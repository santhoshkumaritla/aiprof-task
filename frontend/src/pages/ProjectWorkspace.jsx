import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FileText, Bot, Brain, TrendingUp, BarChart3, Loader2, ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { ProgressBar } from '../components/ProgressBar';
import { Badge } from '../components/Badge';
import { MaterialsTab } from './project-tabs/MaterialsTab';
import { TutorTab } from './project-tabs/TutorTab';
import { QuizTab } from './project-tabs/QuizTab';
import { MasteryTab } from './project-tabs/MasteryTab';
import { AnalyticsTab } from './project-tabs/AnalyticsTab';

const TABS = [
  { id: 'materials', label: 'Materials', icon: FileText },
  { id: 'tutor', label: 'AI Tutor', icon: Bot },
  { id: 'quiz', label: 'Adaptive Quiz', icon: Brain },
  { id: 'mastery', label: 'Mastery & Growth', icon: TrendingUp },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

export const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'materials';

  const [dashboard, setDashboard] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, mats] = await Promise.all([
        api.getProjectDashboard(projectId),
        api.getMaterials(projectId)
      ]);
      setDashboard(dash);
      setMaterials(mats);
    } catch (err) {
      console.error('Failed to load project workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDashboard();
    // Poll material status every 5s if any material is processing
    const interval = setInterval(async () => {
      const mats = await api.getMaterials(projectId).catch(() => []);
      setMaterials(mats);
      const stillProcessing = mats.some(m => m.status === 'queued' || m.status === 'processing');
      if (!stillProcessing) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId, loadDashboard]);

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading learning workspace...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p>Project not found. Please check the URL or go back to your spaces.</p>
      </div>
    );
  }

  const { project, nextRecommendedAction } = dashboard;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Project Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5 justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{project.spaceId?.title || 'Learning Space'}</span>
              <span>/</span>
              <span className="text-slate-300 font-medium">{project.title}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {project.title}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              <span className="text-slate-400 font-medium">Goal:</span> {project.learningGoal}
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-indigo-400" />{project.stats?.materialsCount || 0} Materials</span>
              <span className="flex items-center gap-1"><Brain className="w-3.5 h-3.5 text-violet-400" />{project.stats?.conceptsCount || 0} Concepts</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" />{project.stats?.averageMastery || 0}% Avg Mastery</span>
              <span className="flex items-center gap-1"><Bot className="w-3.5 h-3.5 text-cyan-400" />{project.stats?.tutorInteractions || 0} Tutor Interactions</span>
            </div>
          </div>

          <div className="w-full lg:w-72 space-y-3">
            <ProgressBar progress={project.progress || 0} size="lg" />
            {nextRecommendedAction && (
              <div
                onClick={() => setTab('mastery')}
                className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 cursor-pointer hover:border-indigo-500/40 transition"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> Next Recommendation
                </div>
                <p className="text-xs text-slate-200 font-medium leading-snug">{nextRecommendedAction.title}</p>
                <Badge variant={nextRecommendedAction.priority} className="mt-1.5">{nextRecommendedAction.priority}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              activeTab === id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-700/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'materials' && (
          <MaterialsTab
            projectId={projectId}
            materials={materials}
            onReload={() => api.getMaterials(projectId).then(setMaterials)}
          />
        )}
        {activeTab === 'tutor' && (
          <TutorTab projectId={projectId} project={project} />
        )}
        {activeTab === 'quiz' && (
          <QuizTab projectId={projectId} />
        )}
        {activeTab === 'mastery' && (
          <MasteryTab projectId={projectId} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab projectId={projectId} />
        )}
      </div>
    </div>
  );
};
