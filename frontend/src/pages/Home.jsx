import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, BookOpen, AlertTriangle, CheckCircle2, TrendingUp, Compass, Plus } from 'lucide-react';
import { api } from '../services/api';
import { ProgressBar } from '../components/ProgressBar';
import { Badge } from '../components/Badge';

export const Home = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    recentProjects: [],
    weakAreas: [],
    summary: {},
    recommendations: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadHomeData();

    // Auto-poll live student progress every 8 seconds
    const interval = setInterval(() => {
      Promise.all([api.getGlobalAnalytics(), api.getProjects()])
        .then(([analytics, projects]) => {
          setData(prev => ({
            ...prev,
            recentProjects: projects,
            weakAreas: analytics.weakAreas || [],
            summary: analytics.summary || {}
          }));
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const analytics = await api.getGlobalAnalytics();
      const projects = await api.getProjects();

      let recs = [];
      if (projects.length > 0) {
        try {
          recs = await api.getRecommendations(projects[0]._id);
        } catch (e) {
          console.warn('Could not load recommendations');
        }
      }

      setData({
        recentProjects: projects,
        weakAreas: analytics.weakAreas || [],
        summary: analytics.summary || {},
        recommendations: recs
      });
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const topProject = data.recentProjects[0] || null;
  const nextAction = data.recommendations[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading learning workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Hero: Continue Learning Banner */}
      {topProject ? (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold text-xs border border-indigo-500/30 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> Continue Learning
                </span>
                <span className="text-xs text-slate-400">
                  Space: {topProject.spaceId?.title || 'General'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {topProject.title}
              </h1>

              <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                <strong>Goal:</strong> {topProject.learningGoal}
              </p>

              <div className="max-w-md pt-2">
                <ProgressBar progress={topProject.progress || 0} size="md" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-end items-start md:items-end">
              <button
                onClick={() => navigate(`/projects/${topProject._id}`)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <span>Resume Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/spaces"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-medium text-xs text-center border border-slate-700/60 transition"
              >
                View All Projects
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-8 text-center space-y-4 border border-dashed border-slate-700">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Welcome to AI Study Companion</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
              Create your first Space and Project or initialize demo data to experience the persistent learning loop.
            </p>
          </div>
          <Link
            to="/spaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" /> Create First Space
          </Link>
        </div>
      )}

      {/* Recommended Next Action ("What should I do next?") */}
      {nextAction && topProject && (
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-indigo-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Recommended Next Step
                </span>
                <Badge variant={nextAction.priority}>{nextAction.priority} Priority</Badge>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">{nextAction.title}</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">{nextAction.reason}</p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/projects/${topProject._id}?tab=quiz`)}
            className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-xs border border-indigo-500/30 transition shrink-0"
          >
            Take Action →
          </button>
        </div>
      )}

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Total Spaces</span>
          <p className="text-2xl font-bold text-white mt-1">{data.summary.totalSpaces || 0}</p>
          <span className="text-[11px] text-slate-500">Broad knowledge domains</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Active Projects</span>
          <p className="text-2xl font-bold text-white mt-1">{data.summary.totalProjects || 0}</p>
          <span className="text-[11px] text-slate-500">Focused learning journeys</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Average Concept Mastery</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{data.summary.averageMastery || 0}%</p>
          <span className="text-[11px] text-slate-500">Evidence from quizzes</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Quizzes Completed</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{data.summary.totalQuizzesTaken || 0}</p>
          <span className="text-[11px] text-slate-500">Adaptive assessments</span>
        </div>
      </div>

      {/* Two Columns: Recent Projects & Areas Requiring Attention */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Projects Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Recent Projects
            </h2>
            <Link to="/spaces" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View All →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {data.recentProjects.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/projects/${project._id}`)}
                className="glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-400">
                      {project.spaceId?.title || 'Space'}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {project.stats?.averageMastery || 0}% Mastery
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base leading-snug">{project.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1.5">
                    {project.learningGoal}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800">
                  <ProgressBar progress={project.progress || 0} size="sm" showLabel={false} />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>{project.stats?.materialsCount || 0} Materials</span>
                    <span>{project.stats?.conceptsCount || 0} Concepts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Areas Requiring Attention */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Areas Requiring Attention
          </h2>

          <div className="glass-panel rounded-2xl p-4 space-y-3">
            {data.weakAreas.length > 0 ? (
              data.weakAreas.map((weak) => (
                <div
                  key={weak.id || weak.name}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/30 transition flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{weak.name}</h4>
                    <span className="text-xs text-rose-400 font-medium">
                      Estimated Mastery: {weak.estimatedMastery}%
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/projects/${weak.projectId}?tab=tutor`)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 transition"
                  >
                    Review
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No critical weakness areas detected. High mastery across concepts!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
