import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';

const FILTERS = ['all', 'pending', 'reviewed', 'quoted', 'accepted', 'rejected'];

export default function Requests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try { const r = await api.get('/requests'); setRequests(r.data.data || []); }
      catch { setRequests([]); }
    })();
  }, []);

  if (!requests) return <AppLayout nav={ownerNav} title="Requests"><Loading /></AppLayout>;

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const requestCardColor = (status) => {
    if (status === 'pending') return '#E87B2C';
    if (status === 'reviewed') return '#2563EB';
    if (status === 'accepted') return '#16A34A';
    return '#E2E8F0';
  };

  return (
    <AppLayout nav={ownerNav} title="Requests" subtitle="Incoming shipment requests from customers">
      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📥" title="No requests here" subtitle="New customer requests appear here in real-time." />
      ) : (
        filtered.map((r) => (
          <div
            key={r._id}
            className="card flex items-center justify-between"
            style={{ borderLeft: `4px solid ${requestCardColor(r.status)}`, cursor: 'pointer' }}
            onClick={() => navigate(`/requests/${r._id}`)}
          >
            <div>
              <div className="flex items-center gap-1">
                <strong>{r.pickup?.city} → {r.destination?.city}</strong>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                {r.customerInfo?.companyName || 'Customer'} · {r.cargoType} · {r.weightKg} kg
              </div>
              {r.rejectionReason && <div className="text-danger" style={{ fontSize: '0.8rem' }}>Reason: {r.rejectionReason}</div>}
            </div>
            <div className="flex gap-1">
              {r.status === 'pending' && (
                <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/requests/${r._id}`); }}>Review</button>
              )}
              {(r.status === 'reviewed' || r.status === 'quoted' || r.status === 'accepted') && (
                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/requests/${r._id}`); }}>
                  {r.status === 'accepted' ? 'View' : r.status === 'quoted' ? 'View Quotation' : 'Build Quote'}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </AppLayout>
  );
}
