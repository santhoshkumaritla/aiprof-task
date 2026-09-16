import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Server, Bot, Cpu, Activity, RefreshCw, Play, ChevronDown, ChevronRight, Loader2, FileText, FolderKanban, Layers } from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';

export const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [evalHistory, setEvalHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userJourney, setUserJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningEval, setRunningEval] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    loadAll();
    // Auto-poll live MongoDB updates every 5 seconds
    const pollTimer = setInterval(() => {
      Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getBackgroundJobs(),
        api.getAIEvalHistory()
      ])
        .then(([ov, us, jb, eh]) => {
          setOverview(ov);
          setUsers(us);
          setJobs(jb);
          setEvalHistory(eh);
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(pollTimer);
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [ov, us, jb, eh] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getBackgroundJobs(),
        api.getAIEvalHistory()
      ]);
      setOverview(ov);
      setUsers(us);
      setJobs(jb);
      setEvalHistory(eh);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const inspectUserJourney = async (userId) => {
    try {
      const journey = await api.inspectUser(userId);
      setUserJourney(journey);
      setSelectedUser(userId);
    } catch (err) {
      console.error('Failed to inspect user:', err);
    }
  };

  const handleRunEval = async () => {
    try {
      setRunningEval(true);
      await api.runAIEvalSuite();
      const eh = await api.getAIEvalHistory();
      setEvalHistory(eh);
    } catch (err) {
      console.error('Eval run failed:', err);
    } finally {
      setRunningEval(false);
    }
  };

  const handleRetryJob = async (jobId) => {
    await api.retryJob(jobId);
    const jb = await api.getBackgroundJobs();
    setJobs(jb);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const ai = overview?.aiObservability || {};
  const platform = overview?.platform || {};

  const sections = [
    { id: 'overview', label: 'Platform Overview', icon: Server },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'jobs', label: 'Background Jobs', icon: Cpu },
    { id: 'observability', label: 'AI Observability', icon: Bot },
    { id: 'evaluation', label: 'AI Evaluation', icon: Activity }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            Admin Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Platform monitoring, AI observability, user inspection, and quality evaluation.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Stream (Real-Time)</span>
          </div>
          <button onClick={loadAll} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs font-medium hover:border-slate-500 transition">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Refresh All
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeSection === id
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-700/50'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* PLATFORM OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: platform.totalUsers || 0, color: 'text-cyan-400' },
              { label: 'Total Projects', value: platform.totalProjects || 0, color: 'text-indigo-400' },
              { label: 'Total Materials', value: platform.totalMaterials || 0, color: 'text-violet-400' },
              { label: 'Active Background Jobs', value: platform.activeJobs || 0, color: platform.activeJobs > 0 ? 'text-amber-400' : 'text-emerald-400' }
            ].map((m, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl">
                <p className={`text-3xl font-extrabold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">System Health</h3>
              {[
                { label: 'System Status', value: platform.systemStatus || 'healthy', badge: 'ready' },
                { label: 'Node Version', value: platform.nodeVersion || 'Unknown', badge: 'stable' },
                { label: 'Failed Jobs', value: String(platform.failedJobs || 0), badge: platform.failedJobs > 0 ? 'requiring_attention' : 'ready' },
                { label: 'Uptime', value: `${Math.floor((platform.uptimeSeconds || 0) / 60)}m ${(platform.uptimeSeconds || 0) % 60}s`, badge: 'stable' }
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <span className="text-xs text-slate-400">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-medium">{row.value}</span>
                    <Badge variant={row.badge}>{row.badge === 'ready' ? '●' : '◎'}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">AI Usage Summary</h3>
              {[
                { label: 'Total AI Calls', value: ai.totalCalls || 0 },
                { label: 'Total Tokens Used', value: (ai.totalTokens || 0).toLocaleString() },
                { label: 'Estimated Cost', value: `$${(ai.totalCostUsd || 0).toFixed(4)}` },
                { label: 'Avg Latency', value: `${ai.avgLatencyMs || 0}ms` },
                { label: 'Error Rate', value: `${ai.errorRate || 0}%` }
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <span className="text-xs text-slate-400">{row.label}</span>
                  <span className="text-xs text-emerald-300 font-bold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT */}
      {activeSection === 'users' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Users List */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">All Users ({users.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {users.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => inspectUserJourney(u._id)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      selectedUser === u._id
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                          {u.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={u.role === 'admin' ? 'improving' : 'stable'}>{u.role}</Badge>
                        <p className="text-[10px] text-slate-500 mt-1">{u.projectsCount || 0} projects</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Journey Inspector */}
            {userJourney && (
              <div className="glass-panel rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">User Journey: {userJourney.user?.name}</h3>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Projects', value: userJourney.projects?.length || 0 },
                    { label: 'Quizzes', value: userJourney.quizAttempts?.length || 0 },
                    { label: 'AI Calls', value: userJourney.aiUsage?.length || 0 }
                  ].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-xl font-bold text-white">{m.value}</p>
                      <p className="text-[11px] text-slate-400">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Recent Activity</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(userJourney.recentEvents || []).slice(0, 8).map((ev, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-indigo-400 font-semibold shrink-0">{ev.eventType?.replace(/_/g, ' ')}</span>
                        <span className="text-slate-300 truncate">{ev.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">Recent AI Calls</p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(userJourney.aiUsage || []).slice(0, 5).map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                        <span className="text-slate-300 capitalize">{log.feature?.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span>{log.totalTokens} tokens</span>
                          <span>{log.latencyMs}ms</span>
                          <Badge variant={log.status === 'success' ? 'ready' : 'failed'}>{log.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BACKGROUND JOBS */}
      {activeSection === 'jobs' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                Background Document Processing Queue ({jobs.length} jobs)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of asynchronous PDF parsing, semantic chunk extraction, and concept graphs.
              </p>
            </div>
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm w-fit"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {jobs.map((job) => {
              const doc = job.documentDetails || {};
              const docName = doc.name || job.payload?.documentName || 'Course Material';
              const projTitle = job.projectId?.title || 'Learning Workspace';
              const userName = job.userId?.name || job.userId?.email || 'Administrator';
              const durationSec = doc.durationMs ? (doc.durationMs / 1000).toFixed(1) + 's' : null;

              return (
                <div key={job._id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-3">
                  {/* Top Row: Status, Job Type, Attempt & Duration */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Badge variant={job.status}>{job.status.toUpperCase()}</Badge>
                      <span className="text-xs font-semibold text-slate-300 capitalize">
                        {job.jobType?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        Attempt {job.attempts}/{job.maxAttempts}
                      </span>
                      {durationSec && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/20">
                          {durationSec}
                        </span>
                      )}
                    </div>

                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetryJob(job._id)}
                        className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 border border-amber-500/30 transition"
                      >
                        Retry Job
                      </button>
                    )}
                  </div>

                  {/* Document Clarity Card */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-white tracking-tight break-all">
                            {docName}
                          </p>
                          {doc.fileSize && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {doc.fileSize}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 text-indigo-300">
                            <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                            <strong>Project:</strong> {projTitle}
                          </span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-slate-300">
                            <strong>Uploaded by:</strong> {userName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Extracted Metrics Summary */}
                    {(doc.chunksCount > 0 || doc.conceptsCount > 0) && (
                      <div className="flex items-center gap-4 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Layers className="w-3.5 h-3.5" />
                          <strong>{doc.chunksCount}</strong> searchable semantic chunks
                        </span>
                        <span>&bull;</span>
                        <span className="text-emerald-400">
                          <strong>{doc.conceptsCount}</strong> key concepts extracted
                        </span>
                      </div>
                    )}
                  </div>

                  {job.status === 'processing' && (
                    <ProgressBar progress={job.progress || 0} showLabel={true} size="sm" />
                  )}

                  {job.lastError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-1.5">
                      Error: {job.lastError}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
                    {job.completedAt && <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI OBSERVABILITY */}
      {activeSection === 'observability' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header with Live Sync Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-indigo-500/20">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                Live AI Observability & Telemetry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time MongoDB telemetry tracking model latency, token budgets, and cost tracking.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>MongoDB Stream: LIVE</span>
                <span className="text-[10px] text-emerald-400/70 ml-1">Every 5s</span>
              </div>
              <button
                onClick={loadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm"
                title="Refresh AI Observability from MongoDB"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Refresh Live</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: 'Total AI Calls', value: ai.totalCalls || 0, color: 'text-indigo-400' },
              { label: 'Total Tokens', value: (ai.totalTokens || 0).toLocaleString(), color: 'text-violet-400' },
              { label: 'Total Cost (USD)', value: `$${(ai.totalCostUsd || 0).toFixed(4)}`, color: 'text-amber-400' },
              { label: 'Success Rate', value: `${100 - (ai.errorRate || 0)}%`, color: 'text-emerald-400' },
              { label: 'Avg Latency', value: `${ai.avgLatencyMs || 0}ms`, color: 'text-cyan-400' },
              { label: 'Error Rate', value: `${ai.errorRate || 0}%`, color: ai.errorRate > 5 ? 'text-rose-400' : 'text-emerald-400' }
            ].map((m, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl">
                <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Feature breakdown */}
          {ai.featureBreakdown && Object.keys(ai.featureBreakdown).length > 0 && (
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">AI Usage by Feature</h3>
              {Object.entries(ai.featureBreakdown).map(([feature, count]) => {
                const pct = Math.round((count / (ai.totalCalls || 1)) * 100);
                return (
                  <div key={feature} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 capitalize">{feature.replace(/_/g, ' ')}</span>
                      <span className="text-indigo-300 font-bold">{count} calls ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent AI logs */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Recent AI Call Logs</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  REAL-TIME FEED
                </span>
              </h3>
              <span className="text-[11px] text-slate-400">Showing latest {ai.recentLogs?.length || 0} calls</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(ai.recentLogs || []).map((log, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Badge variant={log.status === 'success' ? 'ready' : 'failed'}>{log.status}</Badge>
                    <span className="text-slate-200 capitalize font-medium">{log.feature?.replace(/_/g, ' ')}</span>
                    <span className="text-slate-400 font-mono text-[11px] hidden md:inline">{log.model}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="text-slate-500 font-mono text-[10px]">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : 'Just now'}
                    </span>
                    <span className="font-mono text-slate-300">{log.totalTokens || 0} tokens</span>
                    <span className="font-mono text-slate-300">{log.latencyMs}ms</span>
                    <span className="text-emerald-400 font-mono font-semibold">${log.estimatedCostUsd?.toFixed(6) || '0.000000'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI EVALUATION */}
      {activeSection === 'evaluation' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">AI Quality Evaluation Suite</h3>
              <p className="text-xs text-slate-400 mt-0.5">Automated regression tests for groundedness, citation accuracy, unsupported question handling, and answer rubric grading.</p>
            </div>
            <button
              onClick={handleRunEval}
              disabled={runningEval}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30"
            >
              {runningEval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {runningEval ? 'Running Evaluation...' : 'Run Evaluation Suite'}
            </button>
          </div>

          {evalHistory.length > 0 ? (
            <div className="space-y-4">
              {evalHistory.map((run) => (
                <div key={run._id} className="glass-panel rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">{run.runName}</h4>
                      <p className="text-xs text-slate-400">{new Date(run.createdAt).toLocaleString()} · {run.modelEvaluated}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-extrabold ${run.overallPassRate >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {run.overallPassRate}%
                      </p>
                      <p className="text-xs text-slate-400">{run.passedTests}/{run.totalTests} tests passed</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-slate-400">Avg Groundedness</p>
                      <p className="text-lg font-bold text-indigo-400">{run.averageGroundedness}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-slate-400">Pass Rate</p>
                      <p className="text-lg font-bold text-emerald-400">{run.overallPassRate}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(run.results || []).map((r, ri) => (
                      <div key={ri} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                        r.passed
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}>
                        <span className="text-base shrink-0">{r.passed ? '✅' : '❌'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{r.testCaseName}</span>
                            <Badge variant={r.passed ? 'improving' : 'requiring_attention'}>{r.score}/100</Badge>
                          </div>
                          <p className="text-slate-400 mt-1 line-clamp-2">{r.actualResponseExcerpt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-10 text-center text-slate-400 text-xs space-y-2">
              <Activity className="w-10 h-10 mx-auto text-slate-600" />
              <p>No evaluation runs yet. Click "Run Evaluation Suite" to execute the first quality benchmark.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
