import React from 'react';

export const Badge = ({ variant = 'default', children, className = '' }) => {
  const styles = {
    improving: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    stable: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    requiring_attention: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    queued: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    default: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const currentStyle = styles[variant] || styles.default;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle} ${className}`}>
      {children}
    </span>
  );
};
