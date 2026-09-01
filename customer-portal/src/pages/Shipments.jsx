import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';

const TABS = ['all', 'active', 'in_transit', 'delivered'];

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/shipments');
        setShipments(res.data.data.shipments || []);
      } catch {
        setShipments([]);
      }
    })();
  }, []);

  if (!shipments) return <AppLayout nav={customerNav} title="My Shipments"><Loading /></AppLayout>;

  const active = ['assigned', 'pickup', 'in_transit'];
  const filtered =
    tab === 'all' ? shipments
    : tab === 'active' ? shipments.filter((s) => active.includes(s.status))
    : tab === 'in_transit' ? shipments.filter((s) => s.status === 'in_transit')
    : shipments.filter((s) => ['delivered', 'completed'].includes(s.status));

  return (
    <AppLayout
      nav={customerNav}
      title="My Shipments"
      subtitle="All your booked shipments in one place"
      actions={<button className="btn btn-primary btn-sm" onClick={() => navigate('/request')}>+ New Request</button>}
    >
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : t === 'active' ? 'Active' : t === 'in_transit' ? 'In Transit' : 'Delivered'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🚚" title="No shipments here" subtitle="Once a quotation is accepted, your shipment appears here." action={<button className="btn btn-primary" onClick={() => navigate('/request')}>Request a Shipment</button>} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Ref</th><th>Truck</th><th>Driver</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/shipments/${s._id}`)}>
                  <td><strong>{s.trackingRef}</strong></td>
                  <td>{s.truckId ? `${s.truckId.regNumber || ''} (${s.truckId.type || ''})` : '—'}</td>
                  <td>{s.driverId ? s.driverId.name : '—'}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/tracking/${s._id}`); }}>Track</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
