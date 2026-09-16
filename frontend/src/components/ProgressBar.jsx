import React from 'react';

export const ProgressBar = ({ progress = 0, showLabel = true, size = 'md', className = '' }) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  // Color mapping based on mastery / progress
  let gradient = 'from-indigo-600 to-violet-500';
  if (clamped >= 80) gradient = 'from-emerald-500 to-teal-400';
  else if (clamped >= 50) gradient = 'from-indigo-500 to-cyan-400';
  else gradient = 'from-rose-500 to-amber-500';

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="text-slate-400 font-medium">Progress</span>
          <span className="text-slate-200 font-semibold">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50 ${heights[size]}`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
