import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { StatCard, StatusBadge, EmptyState, Loading } from '../components/ui';
import { api } from '../services/api';
import { customerNav } from '../navigation';

export default function Dashboard() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState(null);
  const [quotations, setQuotations] = useState(null);
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, q, r] = await Promise.all([
          api.get('/shipments'),
          api.get('/quotations'),
          api.get('/requests'),
        ]);
        setShipments(s.data.data.shipments || []);
        setQuotations(q.data.data.quotations || []);
        setRequests(r.data.data || []);
      } catch (err) {
        setShipments([]);
        setQuotations([]);
        setRequests([]);
      }
    })();
  }, []);

  const activeShipments = (shipments || []).filter((s) =>
    ['assigned', 'pickup', 'in_transit'].includes(s.status)
  );
  const pendingQuotations = (quotations || []).filter((q) => q.status === 'sent');
  const inTransit = activeShipments.filter((s) => s.status === 'in_transit').length;

  const totalSpend = (quotations || [])
    .filter((q) => q.status === 'accepted')
    .reduce((sum, q) => sum + (q.totalAmountINR || 0), 0);

  if (!shipments || !quotations || !requests) return <AppLayout nav={customerNav}><Loading /></AppLayout>;

  return (
    <AppLayout nav={customerNav} title="Dashboard" subtitle="Welcome back — here's your logistics overview">
      <div className="stat-grid">
        <StatCard label="Active Shipments" value={activeShipments.length} />
        <StatCard label="In Transit" value={inTransit} />
        <StatCard label="Pending Quotations" value={pendingQuotations.length} />
        <StatCard label="Total Requests" value={requests.length} />
      </div>

      <div className="two-col">
        <div>
          <h3 className="mb-2">Active Shipments</h3>
          {(activeShipments || []).length === 0 ? (
            <EmptyState
              icon="🚚"
              title="No active shipments"
              subtitle="Ready to move something? Create a shipment request to get started."
              action={<button className="btn btn-primary" onClick={() => navigate('/request')}>Request a Shipment</button>}
            />
          ) : (
            activeShipments.map((s) => (
              <div key={s._id} className="card flex items-center justify-between" style={{ cursor: 'pointer' }} onClick={() => navigate(`/tracking/${s._id}`)}>
                <div>
                  <div className="flex items-center gap-1">
                    <strong>{s.trackingRef}</strong>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm">Track</button>
              </div>
            ))
          )}
        </div>

        <div>
          <h3 className="mb-2">Pending Quotations</h3>
          {pendingQuotations.length === 0 ? (
            <div className="card text-muted">No pending quotations.</div>
          ) : (
            pendingQuotations.map((q) => (
              <div key={q._id} className="card flex items-center justify-between">
                <div>
                  <div className="text-orange money">₹{(q.totalAmountINR || 0).toLocaleString('en-IN')}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {q.requestId ? `${q.requestId.pickup?.city} → ${q.requestId.destination?.city}` : ''}
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/requests/${q.requestId?._id || ''}`)}>Review</button>
              </div>
            ))
          )}
          <h3 className="mt-3 mb-2">Quick Actions</h3>
          <button className="btn btn-dark" style={{ width: '100%' }} onClick={() => navigate('/request')}>
            + Request New Shipment
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
