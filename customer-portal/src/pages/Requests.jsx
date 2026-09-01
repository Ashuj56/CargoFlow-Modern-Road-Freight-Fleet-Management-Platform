import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';

const FILTERS = ['all', 'pending', 'reviewed', 'quoted', 'accepted', 'rejected', 'cancelled'];

export default function Requests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/requests');
        setRequests(res.data.data || []);
      } catch {
        setRequests([]);
      }
    })();
  }, []);

  if (!requests) return <AppLayout nav={customerNav} title="My Requests"><Loading /></AppLayout>;

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <AppLayout
      nav={customerNav}
      title="My Requests"
      subtitle="Track the status of your shipment requests"
      actions={<button className="btn btn-primary btn-sm" onClick={() => navigate('/request')}>+ New Request</button>}
    >
      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="No shipment requests yet" subtitle="Ready to move something?" action={<button className="btn btn-primary" onClick={() => navigate('/request')}>Request a Shipment</button>} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Route</th><th>Cargo</th><th>Weight</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/requests/${r._id}`)}>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''}</td>
                  <td>{r.pickup?.city} → {r.destination?.city}</td>
                  <td>{r.cargoType}</td>
                  <td>{r.weightKg} kg</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/requests/${r._id}`); }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
