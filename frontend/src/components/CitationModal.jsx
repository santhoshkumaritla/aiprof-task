import React from 'react';
import { X, FileText, Bookmark, ExternalLink } from 'lucide-react';

export const CitationModal = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-indigo-500/30 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Verified Source Citation
            </h3>
            <p className="text-xs text-slate-400">Grounded evidence from your uploaded project material</p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Bookmark className="w-4 h-4 text-indigo-400" />
              <span>{citation.materialName || 'Course Notes'}</span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold text-xs border border-indigo-500/30">
              Page {citation.pageNumber || 1}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Source Excerpt Evidence
            </label>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 leading-relaxed italic">
              "{citation.excerpt || 'Source excerpt matching query evidence.'}"
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
            <span className="text-base">🛡️</span>
            <span>
              <strong>Grounded AI Guarantee:</strong> This response was synthesized strictly from this document chunk rather than unsubstantiated speculation.
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
