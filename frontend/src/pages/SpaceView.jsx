import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, ArrowRight, BookOpen, Layers, X } from 'lucide-react';
import { api } from '../services/api';
import { ProgressBar } from '../components/ProgressBar';

export const SpaceView = () => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);

  // Form states
  const [spaceForm, setSpaceForm] = useState({ title: '', description: '', color: '#6366F1' });
  const [projectForm, setProjectForm] = useState({ title: '', description: '', learningGoal: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      const data = await api.getSpaces();
      setSpaces(data);
    } catch (err) {
      console.error('Failed to load spaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    try {
      await api.createSpace(spaceForm);
      setSpaceForm({ title: '', description: '', color: '#6366F1' });
      setShowModal(false);
      loadSpaces();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const proj = await api.createProject({
        ...projectForm,
        spaceId: selectedSpaceId
      });
      setShowProjectModal(false);
      setProjectForm({ title: '', description: '', learningGoal: '' });
      navigate(`/projects/${proj._id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-indigo-400" />
            Spaces & Learning Projects
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Spaces organize broad domains; Projects provide focused, measurable learning workspaces.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Space
        </button>
      </div>

      {/* Spaces List */}
      <div className="space-y-8">
        {spaces.map((space) => (
          <div key={space._id} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                  style={{ backgroundColor: space.color || '#6366F1' }}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{space.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xl">{space.description || 'Broad learning domain.'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedSpaceId(space._id);
                    setShowProjectModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium text-xs border border-indigo-500/30 transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Project in this Space
                </button>
              </div>
            </div>

            {/* Projects Grid for this space */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(space.recentProjects || []).length > 0 ? (
                space.recentProjects.map((project) => (
                  <div
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">{project.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{project.learningGoal || 'Active learning project.'}</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800">
                      <ProgressBar progress={project.progress || 0} size="sm" showLabel={true} />
                      <div className="flex items-center justify-between text-[11px] text-indigo-400 mt-2 font-medium">
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No projects created yet in this Space. Click "New Project in this Space" to begin!
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Space Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative border border-slate-700">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Create New Space</h3>
            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Space Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Machine Learning & AI"
                  value={spaceForm.title}
                  onChange={(e) => setSpaceForm({ ...spaceForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Broad area or certification..."
                  value={spaceForm.description}
                  onChange={(e) => setSpaceForm({ ...spaceForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Theme Color</label>
                <div className="flex gap-2">
                  {['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSpaceForm({ ...spaceForm, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${spaceForm.color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative border border-slate-700">
            <button
              onClick={() => setShowProjectModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Learning & Neural Architectures"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Learning Goal</label>
                <textarea
                  rows={3}
                  required
                  placeholder="What specific skill or outcome do you want to master?"
                  value={projectForm.learningGoal}
                  onChange={(e) => setProjectForm({ ...projectForm, learningGoal: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
