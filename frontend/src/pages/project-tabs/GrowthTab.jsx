import { Sparkles, Target } from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { ProgressBar } from '../../components/ProgressBar';
import { EmptyState } from '../../components/EmptyState';

export const GrowthTab = ({ projectId, concepts = [], recommendations = [], onReload }) => {
  const refresh = async () => {
    await api.triggerGrowthAnalysis(projectId);
    onReload?.();
  };

  const complete = async (id) => {
    await api.completeRecommendation(id);
    onReload?.();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Concept Mastery</h3>
          <button onClick={refresh} className="text-xs text-indigo-300 hover:text-white">
            Recalculate growth
          </button>
        </div>
        {concepts.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No concepts yet"
            description="Upload materials or take a quiz so mastery can be estimated."
          />
        ) : (
          concepts.map((concept) => (
            <div key={concept._id} className="glass-panel rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white">{concept.name}</h4>
                <Badge variant={concept.status}>{concept.status?.replace('_', ' ')}</Badge>
              </div>
              <p className="text-xs text-slate-400 mb-3">{concept.description}</p>
              <ProgressBar progress={concept.estimatedMastery} />
            </div>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" /> Targeted recommendations
        </h3>
        {recommendations.length === 0 ? (
          <EmptyState title="All caught up" description="Complete a quiz to generate next-step guidance." />
        ) : (
          recommendations.map((rec) => (
            <div key={rec._id} className="glass-panel rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{rec.title}</p>
                <Badge variant={rec.priority}>{rec.priority}</Badge>
              </div>
              <p className="text-xs text-slate-400">{rec.reason}</p>
              <button
                onClick={() => complete(rec._id)}
                className="text-xs text-emerald-300 hover:text-emerald-200"
              >
                Mark complete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
