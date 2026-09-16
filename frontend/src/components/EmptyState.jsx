export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="glass-panel rounded-2xl p-10 text-center text-slate-400">
    {Icon && (
      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
    )}
    <h3 className="text-white font-bold text-base">{title}</h3>
    {description && <p className="text-xs mt-1 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
