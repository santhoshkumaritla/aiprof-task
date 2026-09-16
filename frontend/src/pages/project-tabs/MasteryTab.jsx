import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw, CheckCircle2, BookOpen, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { ProgressBar } from '../../components/ProgressBar';
import { Badge } from '../../components/Badge';

const statusIcon = (status) => {
  if (status === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (status === 'requiring_attention') return <TrendingDown className="w-4 h-4 text-rose-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

export const MasteryTab = ({ projectId }) => {
  const [mastery, setMastery] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, r] = await Promise.all([
        api.getMastery(projectId),
        api.getRecommendations(projectId)
      ]);
      setMastery(m);
      setRecs(r);
    } catch (err) {
      console.error('Failed to load mastery:', err);
    } finally {
      setLoading(false);
    }
  };

  const runGrowthAnalysis = async () => {
    try {
      setAnalyzing(true);
      await api.triggerGrowthAnalysis(projectId);
      await loadData();
    } catch (err) {
      console.error('Growth analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCompleteRec = async (recId) => {
    await api.completeRecommendation(recId);
    setRecs(prev => prev.filter(r => r._id !== recId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const concepts = mastery?.concepts || [];
  const breakdown = mastery?.breakdown || {};
  const avgMastery = mastery?.averageMastery || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-3xl font-extrabold text-indigo-400">{avgMastery}%</p>
          <p className="text-xs text-slate-400 mt-1">Average Concept Mastery</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-3xl font-extrabold text-emerald-400">{breakdown.improvingCount || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Concepts Improving</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl text-center">
          <p className="text-3xl font-extrabold text-rose-400">{breakdown.requiringAttentionCount || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Requiring Attention</p>
        </div>
      </div>

      {/* Concept Mastery Bars */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Concept Mastery Levels
          </h3>
          <button
            onClick={runGrowthAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-medium hover:border-indigo-500/40 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${analyzing ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </button>
        </div>

        {concepts.length > 0 ? (
          <div className="space-y-4">
            {concepts.map((concept) => (
              <div key={concept._id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {statusIcon(concept.status)}
                    <span className="text-sm font-semibold text-white">{concept.name}</span>
                    <Badge variant={concept.status}>
                      {concept.status === 'requiring_attention' ? 'Needs Work' : concept.status}
                    </Badge>
                  </div>
                  <span className="text-sm font-bold text-slate-200">{concept.estimatedMastery}%</span>
                </div>
                <ProgressBar progress={concept.estimatedMastery} showLabel={false} size="md" />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Tested {concept.timesTested}× · Correct {concept.timesCorrect}×</span>
                  {concept.history?.length > 1 && (
                    <span className={`font-medium ${
                      concept.history.slice(-1)[0]?.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {concept.history.slice(-1)[0]?.delta > 0 ? '+' : ''}{concept.history.slice(-1)[0]?.delta || 0}% recent trend
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            No concepts tracked yet. Upload learning materials to extract concepts and begin mastery tracking.
          </div>
        )}
      </div>

      {/* Targeted Recommendations */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Recommended Next Actions
        </h3>

        {recs.length > 0 ? (
          <div className="space-y-3">
            {recs.map((rec) => (
              <div
                key={rec._id}
                className="glass-panel p-5 rounded-2xl border-l-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ borderLeftColor: rec.priority === 'high' ? '#F43F5E' : rec.priority === 'medium' ? '#F59E0B' : '#6366F1' }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={rec.priority}>{rec.priority} priority</Badge>
                    <span className="text-xs text-slate-400 capitalize">{rec.actionType?.replace('_', ' ')}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{rec.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{rec.reason}</p>
                  {rec.materialName && rec.targetPageNumber && (
                    <div className="flex items-center gap-1 text-xs text-indigo-400 mt-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{rec.materialName} · Page {rec.targetPageNumber}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleCompleteRec(rec._id)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Complete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            All recommendations completed. Take a quiz to generate fresh targeted next steps!
          </div>
        )}
      </div>
    </div>
  );
};
