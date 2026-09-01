import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, Loading } from '../components/ui';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/shipments/${id}`);
        setShipment(res.data.data.shipment);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load shipment');
      }
    })();
  }, [id]);

  if (error) return <AppLayout nav={customerNav} title="Shipment"><div className="card text-danger">{error}</div></AppLayout>;
  if (!shipment) return <AppLayout nav={customerNav} title="Shipment"><Loading /></AppLayout>;

  const req = shipment.requestId || {};
  const quotation = shipment.quotationId || {};

  return (
    <AppLayout
      nav={customerNav}
      title={`Shipment ${shipment.trackingRef}`}
      subtitle={<StatusBadge status={shipment.status} />}
      actions={<button className="btn btn-primary btn-sm" onClick={() => navigate(`/tracking/${shipment._id}`)}>📍 Track Live</button>}
    >
      <div className="two-col">
        <div className="card">
          <h4>Shipment Info</h4>
          <table className="data-table">
            <tbody>
              <tr><td><strong>Route</strong></td><td>{req.pickup?.city || '—'} → {req.destination?.city || '—'}</td></tr>
              <tr><td><strong>Cargo</strong></td><td>{req.cargoType || '—'} — {req.weightKg || 0} kg</td></tr>
              <tr><td><strong>Truck</strong></td><td>{shipment.truckId ? `${shipment.truckId.regNumber || ''} (${shipment.truckId.type || ''})` : 'Not assigned'}</td></tr>
              <tr><td><strong>Driver</strong></td><td>{shipment.driverId?.name || 'Not assigned'}</td></tr>
              <tr><td><strong>Pickup Date</strong></td><td>{req.pickupDate ? new Date(req.pickupDate).toLocaleDateString('en-IN') : '—'}</td></tr>
              <tr><td><strong>Quotation Total</strong></td><td className="money text-orange">₹{(quotation.totalAmountINR || 0).toLocaleString('en-IN')}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h4>Timeline</h4>
          <div className="timeline mt-1">
            {(shipment.timeline || []).map((t, i) => (
              <div key={i} className={`tl-item ${i === 0 ? 'done' : 'done'}`}>
                <div className="tl-label">{t.status?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                <div className="tl-meta">{new Date(t.timestamp).toLocaleString('en-IN')}</div>
                {t.note && <div className="tl-meta">{t.note}</div>}
              </div>
            ))}
            {(shipment.timeline || []).length === 0 && <div className="text-muted">No timeline events yet.</div>}
          </div>
        </div>
      </div>

      <div className="card mt-2" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ marginBottom: 0 }}>Documents</h4>
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>Invoices, PODs and manifests for this shipment</div>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/documents')}>View Documents</button>
      </div>
    </AppLayout>
  );
}
