import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';

const TABS = ['all', 'confirmed', 'active', 'in_transit', 'delivered'];

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    (async () => {
      try { const r = await api.get('/shipments'); setShipments(r.data.data.shipments || []); }
      catch { setShipments([]); }
    })();
  }, []);

  if (!shipments) return <AppLayout nav={ownerNav} title="Shipments"><Loading /></AppLayout>;

  const active = ['assigned', 'pickup', 'in_transit'];
  const filtered =
    tab === 'all' ? shipments
    : tab === 'active' ? shipments.filter((s) => active.includes(s.status))
    : tab === 'in_transit' ? shipments.filter((s) => s.status === 'in_transit')
    : tab === 'delivered' ? shipments.filter((s) => ['delivered', 'completed'].includes(s.status))
    : shipments.filter((s) => s.status === 'confirmed');

  return (
    <AppLayout nav={ownerNav} title="Shipments" subtitle="Manage and track all shipments">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'active' ? 'Active' : t === 'in_transit' ? 'In Transit' : t === 'delivered' ? 'Delivered' : 'Confirmed'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🚚" title="No shipments here" subtitle="Shipments are created when customers accept your quotations." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Ref</th><th>Route</th><th>Truck</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/shipments/${s._id}`)}>
                  <td><strong>{s.trackingRef}</strong></td>
                  <td>
                    {s.requestId?.pickup?.city && s.requestId?.destination?.city
                      ? `${s.requestId.pickup.city} → ${s.requestId.destination.city}`
                      : '—'}
                  </td>
                  <td>{s.truckId?.regNumber || '—'}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/shipments/${s._id}`); }}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
