import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, Loader2, Key, Cpu, RefreshCw, Trash2, HelpCircle } from 'lucide-react';
import { api } from '../services/api';

export const AISettingsModal = ({ isOpen, onClose, onConfigUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    hasGeminiKey: false,
    keySuspended: false,
    geminiKeyMasked: null,
    geminiModel: 'gemini-2.0-flash',
    primaryModel: 'intelligent-content-engine',
    provider: 'content-engine'
  });

  const [inputKey, setInputKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [testResult, setTestResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await api.getAIConfig();
      setConfig(data);
      setSelectedModel(data.geminiModel || 'gemini-2.0-flash');
    } catch (err) {
      console.error('Failed to load AI config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setStatusMsg('');
      const res = await api.testAIConnection({
        apiKey: inputKey.trim() || undefined,
        model: selectedModel
      });
      setTestResult(res);
      await loadConfig(); // Refresh suspended state
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setStatusMsg('');
      await api.updateAIConfig({
        geminiApiKey: inputKey.trim() || undefined,
        geminiModel: selectedModel
      });
      setStatusMsg('AI Configuration successfully updated!');
      setInputKey('');
      setTestResult(null);
      await loadConfig();
      if (onConfigUpdated) onConfigUpdated();
    } catch (err) {
      setStatusMsg('Failed to update config: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearKey = async () => {
    try {
      setLoading(true);
      setStatusMsg('');
      setTestResult(null);
      await api.updateAIConfig({ geminiApiKey: '' });
      setInputKey('');
      setStatusMsg('API key cleared. System switched to Intelligent Content Engine.');
      await loadConfig();
      if (onConfigUpdated) onConfigUpdated();
    } catch (err) {
      setStatusMsg('Failed to clear key: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLiveGeminiActive = config.hasGeminiKey && !config.keySuspended;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/50 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 glow-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Engine & API Settings</h3>
              <p className="text-xs text-slate-400">Configure Google Gemini or use the Intelligent Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Engine Status */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active AI Mode:</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              isLiveGeminiActive
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
            }`}>
              <Cpu className="w-3.5 h-3.5" />
              {isLiveGeminiActive
                ? `Live Gemini API (${config.geminiModel})`
                : 'Built-in Intelligent Engine'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Configured API Key:</span>
            <span className="font-mono text-slate-300">
              {config.geminiKeyMasked || 'None (Using Built-In Engine)'}
            </span>
          </div>
        </div>

        {/* Suspended Key Notice */}
        {config.keySuspended && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Stored Gemini Key is Suspended by Google</p>
                <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                  Google Generative Language API returned HTTP 403 (Consumer Suspended). The application will use its built-in Intelligent Content Engine for all questions, grounded citations, quizzes, and grading without disruption.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleClearKey}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Clear Suspended Key
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" /> Get free key at Google AI Studio
              </a>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={config.hasGeminiKey ? 'Paste new working key (AIzaSy...) or leave blank' : 'Paste your AI Studio key: AIzaSy...'}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Target Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended, Fast & Stable)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Specified in .env)</option>
            </select>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Live API Connection Successful!</p>
                    <p className="text-[11px] text-emerald-400 mt-0.5">Model {testResult.model} responded normally.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Connection Test Failed</p>
                    <p className="text-[11px] text-rose-400 mt-0.5">{testResult.error}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {statusMsg && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
              {statusMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="py-2.5 px-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            {config.hasGeminiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Key</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Configuration</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
