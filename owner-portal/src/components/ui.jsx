export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const className = `badge b-${s}`;
  const showPulse = s === 'in_transit' || s === 'active' || s === 'pickup' || s === 'on_duty';
  return (
    <span className={className}>
      {showPulse && <span className="pulse" />}
      {status}
    </span>
  );
}

export function StatCard({ label, value, delta }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {delta && <div className="stat-delta">{delta}</div>}
    </div>
  );
}

export function EmptyState({ icon = '📦', title, subtitle, action }) {
  return (
    <div className="empty card">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ rows = 3, height = 56 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton mb-1" style={{ height }} />
      ))}
    </div>
  );
}

export function Loading({ text = 'Loading...' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {text}
    </div>
  );
}
