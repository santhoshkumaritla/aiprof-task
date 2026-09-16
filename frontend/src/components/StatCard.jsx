export const StatCard = ({ label, value, hint, accent = 'text-white' }) => (
  <div className="glass-panel p-5 rounded-2xl">
    <span className="text-xs font-medium text-slate-400">{label}</span>
    <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
  </div>
);
