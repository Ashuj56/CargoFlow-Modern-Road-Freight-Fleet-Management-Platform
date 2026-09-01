import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api } from '../services/api';
import { StatCard, StatusBadge, EmptyState, Loading } from '../components/ui';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [shipments, setShipments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, r, sh] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/requests'),
          api.get('/shipments'),
        ]);
        setSummary(s.data.data);
        setRequests(r.data.data || []);
        setShipments(sh.data.data?.shipments || sh.data.data || []);
      } catch {
        setRequests([]);
        setShipments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <AppLayout nav={ownerNav} title="Operations Overview"><Loading /></AppLayout>;

  // Safe defaults for new accounts with no data yet
  const safeSummary = summary ?? {
    fleet: { totalTrucks: 0, available: 0, assigned: 0, maintenance: 0, inactive: 0 },
    operations: { activeShipments: 0 },
    revenue: { totalCollectedINR: 0, outstandingINR: 0 },
  };

  const newRequests = (requests || []).filter((r) => r.status === 'pending');

  const requestCardColor = (status) => {
    if (status === 'pending') return '#E87B2C';
    if (status === 'reviewed') return '#2563EB';
    if (status === 'accepted') return '#16A34A';
    return '#E2E8F0';
  };

  return (
    <AppLayout nav={ownerNav} title="Operations Overview" subtitle="Your fleet at a glance" notifications={newRequests.length}>
      <div className="stat-grid">
        <StatCard label="Fleet Size" value={safeSummary.fleet.totalTrucks} />
        <StatCard label="Available" value={safeSummary.fleet.available} />
        <StatCard label="Assigned" value={safeSummary.fleet.assigned} />
        <StatCard label="Active Shipments" value={safeSummary.operations.activeShipments} />
        <StatCard label="Revenue (Collected)" value={`₹${safeSummary.revenue.totalCollectedINR.toLocaleString('en-IN')}`} />
        <StatCard label="Outstanding" value={`₹${safeSummary.revenue.outstandingINR.toLocaleString('en-IN')}`} />
      </div>

      <div className="card mb-2">
        <h4>Fleet Availability</h4>
        <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: '0.5rem' }}>
          <div style={{ width: `${(safeSummary.fleet.available / Math.max(1, safeSummary.fleet.totalTrucks)) * 100}%`, background: 'var(--success)' }} title="Available" />
          <div style={{ width: `${(safeSummary.fleet.assigned / Math.max(1, safeSummary.fleet.totalTrucks)) * 100}%`, background: 'var(--orange)' }} title="Assigned" />
          <div style={{ width: `${(safeSummary.fleet.maintenance / Math.max(1, safeSummary.fleet.totalTrucks)) * 100}%`, background: 'var(--warning)' }} title="Maintenance" />
          <div style={{ width: `${(safeSummary.fleet.inactive / Math.max(1, safeSummary.fleet.totalTrucks)) * 100}%`, background: 'var(--danger)' }} title="Inactive" />
        </div>
        <div className="flex gap-2 mt-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>🟢 Available {safeSummary.fleet.available}</span>
          <span>🟠 Assigned {safeSummary.fleet.assigned}</span>
          <span>🟡 Maintenance {safeSummary.fleet.maintenance}</span>
          <span>🔴 Inactive {safeSummary.fleet.inactive}</span>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h3 className="mb-2">New Requests</h3>
          {newRequests.length === 0 ? (
            <EmptyState icon="📥" title="No new requests" subtitle="Incoming shipment requests will appear here in real-time." />
          ) : (
            newRequests.map((r) => (
              <div
                key={r._id}
                className="card flex items-center justify-between"
                style={{ borderLeft: `4px solid ${requestCardColor(r.status)}`, cursor: 'pointer' }}
                onClick={() => navigate(`/requests/${r._id}`)}
              >
                <div>
                  <div className="flex items-center gap-1"><strong>{r.pickup?.city} → {r.destination?.city}</strong><StatusBadge status={r.status} /></div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {r.cargoType} · {r.weightKg} kg
                    {r.createdAt ? ` · ${timeAgo(r.createdAt)}` : ''}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/requests/${r._id}`); }}>Review</button>
              </div>
            ))
          )}
        </div>

        <div>
          <h3 className="mb-2">Active Shipments</h3>
          {shipments.filter((s) => ['assigned', 'pickup', 'in_transit'].includes(s.status)).length === 0 ? (
            <div className="card text-muted">No active shipments.</div>
          ) : (
            shipments.filter((s) => ['assigned', 'pickup', 'in_transit'].includes(s.status)).map((s) => (
              <div key={s._id} className="card flex items-center justify-between" style={{ cursor: 'pointer' }} onClick={() => navigate(`/shipments/${s._id}`)}>
                <div>
                  <strong>{s.trackingRef}</strong>
                  <StatusBadge status={s.status} />
                </div>
                <button className="btn btn-outline btn-sm">Manage</button>
              </div>
            ))
          )}
          <h3 className="mt-2 mb-1">Quick Actions</h3>
          <button className="btn btn-dark" style={{ width: '100%' }} onClick={() => navigate('/fleet/trucks')}>Manage Fleet</button>
        </div>
      </div>
    </AppLayout>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
