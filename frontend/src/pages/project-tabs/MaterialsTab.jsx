import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, FileUp, Sparkles, FileCode, Plus, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';

export const MaterialsTab = ({ projectId, materials, onReload }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      await api.uploadMaterial(projectId, file);
      onReload();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (materialId) => {
    try {
      await api.retryMaterial(materialId);
      onReload();
    } catch (err) {
      alert('Retry failed: ' + err.message);
    }
  };

  const handleCreateTextNotes = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      setNoteError('Please enter both title and notes content');
      return;
    }
    try {
      setSavingNote(true);
      setNoteError('');
      await api.createTextMaterial(projectId, noteTitle.trim(), noteContent.trim());
      setShowTextModal(false);
      setNoteTitle('');
      setNoteContent('');
      onReload();
    } catch (err) {
      setNoteError(err.message || 'Failed to save notes');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
        }}
        className={`glass-panel rounded-3xl p-8 text-center border-2 border-dashed transition ${
          dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700/80 hover:border-indigo-500/50'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
          <Upload className={`w-7 h-7 ${uploading ? 'animate-bounce' : ''}`} />
        </div>
        <h3 className="text-base font-bold text-white">Add Learning Materials</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
          Upload PDF lecture notes or paste syllabus notes directly. The system automatically chunks, extracts key concepts, and indexes text for grounded AI retrieval.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30">
            <FileUp className="w-4 h-4" />
            <span>{uploading ? 'Uploading & Queuing...' : 'Choose PDF File'}</span>
            <input
              type="file"
              accept="application/pdf"
              disabled={uploading}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowTextModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition shadow-sm"
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>Paste Study Notes / Markdown</span>
          </button>
        </div>
      </div>

      {/* Paste Notes Modal */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Paste Study Notes</h3>
              </div>
              <button
                onClick={() => setShowTextModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {noteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{noteError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTextNotes} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes Title</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Chapter 3: Optimization & Neural Architecture"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes Content (Text or Markdown)</label>
                <textarea
                  rows={8}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Paste lecture text, key definitions, formulas, or summaries..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-500 font-mono resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTextModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-60 shadow-md shadow-indigo-600/30"
                >
                  {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save & Ingest Notes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uploaded Materials List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Project Documents ({materials.length})
          </h3>
          <button
            onClick={onReload}
            className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </button>
        </div>

        {materials.length > 0 ? (
          <div className="space-y-3">
            {materials.map((mat) => (
              <div
                key={mat._id}
                className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 mt-0.5">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-bold text-white text-sm">{mat.originalName}</h4>
                      <Badge variant={mat.status}>
                        {mat.status.toUpperCase()} {mat.status === 'processing' ? `${mat.progress}%` : ''}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {mat.summary || `${(mat.fileSize / 1024).toFixed(1)} KB • ${mat.pagesCount || 1} Pages • ${mat.chunksCount || 0} Chunks`}
                    </p>

                    {/* Extracted Concepts Chips */}
                    {mat.extractedConcepts?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-400" /> Concepts:
                        </span>
                        {mat.extractedConcepts.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700/60"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {mat.errorMessage && (
                      <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {mat.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {mat.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(mat._id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Processing
                    </button>
                  )}
                  {mat.status === 'ready' && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Ready for Tutor & Quizzes
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 glass-panel rounded-2xl text-slate-400 text-xs">
            No materials added yet. Upload a PDF or paste notes above to begin.
          </div>
        )}
      </div>
    </div>
  );
};
