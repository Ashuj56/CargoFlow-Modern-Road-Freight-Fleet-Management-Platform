import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { StatusBadge, Loading } from '../components/ui';
import RouteMap from '../components/RouteMap';
import Modal from '../components/Modal';
import { toast } from '../store/toast.store';

const TRANSIENTS = {
  confirmed: ['assigned'],
  assigned: ['pickup', 'in_transit'],
  pickup: ['in_transit', 'delivered'],
  in_transit: ['delivered'],
  delivered: ['completed'],
};

export default function ShipmentDetail() {
  const { id } = useParams();
  const [shipment, setShipment] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [trackModal, setTrackModal] = useState(false);
  const [assignSelections, setAssignSelections] = useState({ truckId: '', driverId: '' });
  const [trackForm, setTrackForm] = useState({ status: 'in_transit', lat: '', lng: '', address: '', note: '' });

  const load = async () => {
    try {
      const [s, e] = await Promise.all([api.get(`/shipments/${id}`), api.get(`/shipments/${id}/tracking`)]);
      setShipment(s.data.data.shipment);
      setEvents(e.data.data.events || []);
    } catch (err) { setError(extractError(err)); }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const [t, d] = await Promise.all([api.get('/trucks'), api.get('/drivers')]);
        setTrucks(t.data.data.trucks || []);
        setDrivers(d.data.data.drivers || []);
      } catch {}
    })();
  }, [id]);

  const assign = async () => {
    try {
      await api.patch(`/shipments/${id}/assign`, assignSelections);
      toast('Shipment assigned!', 'success');
      setAssignModal(false);
      load();
    } catch (err) { toast(extractError(err), 'error'); }
  };

  const nextStatus = async (status) => {
    try {
      await api.patch(`/shipments/${id}/status`, { status, note: '' });
      toast(`Shipment ${status.replace('_', ' ')}`, 'success');
      load();
    } catch (err) { toast(extractError(err), 'error'); }
  };

  const complete = async () => {
    try {
      await api.patch(`/shipments/${id}/complete`);
      toast('Shipment completed!', 'success');
      load();
    } catch (err) { toast(extractError(err), 'error'); }
  };

  const addTracking = async () => {
    try {
      await api.post(`/shipments/${id}/tracking`, {
        status: trackForm.status,
        location: { lat: Number(trackForm.lat) || 0, lng: Number(trackForm.lng) || 0, address: trackForm.address },
        note: trackForm.note,
      });
      toast('Tracking event added & pushed live', 'success');
      setTrackModal(false);
      setTrackForm({ status: 'in_transit', lat: '', lng: '', address: '', note: '' });
      load();
    } catch (err) { toast(extractError(err), 'error'); }
  };

  if (error) return <AppLayout nav={ownerNav} title="Shipment"><div className="card text-danger">{error}</div></AppLayout>;
  if (!shipment) return <AppLayout nav={ownerNav} title="Shipment"><Loading /></AppLayout>;

  const req = shipment.requestId || {};
  const pickup = req.pickup;
  const destination = req.destination;
  const currentPos = events[0]?.location || pickup;
  const allowedNext = TRANSIENTS[shipment.status] || [];

  return (
    <AppLayout
      nav={ownerNav}
      title={`Shipment ${shipment.trackingRef}`}
      subtitle={<StatusBadge status={shipment.status} />}
      actions={
        shipment.status === 'confirmed' && (
          <button className="btn btn-primary btn-sm" onClick={() => setAssignModal(true)}>Assign Truck & Driver</button>
        )
      }
    >
      <RouteMap pickup={pickup} destination={destination} currentPosition={currentPos} height={360} />

      <div className="mt-2 grid-3">
        <div className="card">
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>TRUCK</div>
          <strong>{shipment.truckId ? `${shipment.truckId.regNumber} (${shipment.truckId.type})` : 'Not assigned'}</strong>
        </div>
        <div className="card">
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>DRIVER</div>
          <strong>{shipment.driverId?.name || 'Not assigned'}</strong>
        </div>
        <div className="card">
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>ROUTE</div>
          <strong>{pickup?.city} → {destination?.city}</strong>
        </div>
      </div>

      <div className="mt-2 two-col">
        <div className="card">
          <h4>Actions</h4>
          {(allowedNext.length > 0 || shipment.status === 'delivered') && (
            <div className="flex gap-1 mt-1">
              {allowedNext.map((st) => (
                <button key={st} className="btn btn-primary btn-sm" onClick={() => nextStatus(st)}>
                  → {st.replace('_', ' ')}
                </button>
              ))}
              {shipment.status === 'delivered' && (
                <button className="btn btn-dark btn-sm" onClick={complete}>✓ Complete</button>
              )}
            </div>
          )}
          {['assigned', 'pickup', 'in_transit'].includes(shipment.status) && (
            <button className="btn btn-outline btn-sm mt-2" onClick={() => setTrackModal(true)}>📍 Add Tracking Event</button>
          )}
          {shipment.status === 'confirmed' && (
            <div className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>Assign a truck and driver to begin this shipment.</div>
          )}
        </div>

        <div className="card">
          <h4>Details</h4>
          <table className="data-table">
            <tbody>
              <tr><td><strong>Cargo</strong></td><td>{req.cargoType} — {req.weightKg} kg</td></tr>
              <tr><td><strong>Pickup Date</strong></td><td>{req.pickupDate ? new Date(req.pickupDate).toLocaleDateString('en-IN') : '—'}</td></tr>
              <tr><td><strong>Delivered</strong></td><td>{shipment.actualDelivery ? new Date(shipment.actualDelivery).toLocaleDateString('en-IN') : '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-2">
        <h4>Timeline</h4>
        <div className="timeline mt-1">
          {(shipment.timeline || []).map((t, i) => (
            <div key={i} className="tl-item done">
              <div className="tl-label">{t.status?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
              <div className="tl-meta">{new Date(t.timestamp).toLocaleString('en-IN')} {t.note && `— ${t.note}`}</div>
            </div>
          ))}
          {(shipment.timeline || []).length === 0 && <div className="text-muted">No events yet.</div>}
        </div>
      </div>

      {/* Assign modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Truck & Driver"
        footer={<>
          <button className="btn btn-outline" onClick={() => setAssignModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={assign} disabled={!assignSelections.truckId || !assignSelections.driverId}>Assign</button>
        </>}>
        <div className="form-field mb-2">
          <label>Select Truck</label>
          <select value={assignSelections.truckId} onChange={(e) => setAssignSelections({ ...assignSelections, truckId: e.target.value })}>
            <option value="">Choose...</option>
            {trucks.filter((t) => t.status === 'available').map((t) => <option key={t._id} value={t._id}>{t.regNumber} ({t.type})</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Select Driver</label>
          <select value={assignSelections.driverId} onChange={(e) => setAssignSelections({ ...assignSelections, driverId: e.target.value })}>
            <option value="">Choose...</option>
            {drivers.filter((d) => d.status === 'available').map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
      </Modal>

      {/* Tracking modal */}
      <Modal open={trackModal} onClose={() => setTrackModal(false)} title="Add Tracking Event"
        footer={<>
          <button className="btn btn-outline" onClick={() => setTrackModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addTracking}>Add & Push Live</button>
        </>}>
        <div className="form-field mb-2">
          <label>Status</label>
          <select value={trackForm.status} onChange={(e) => setTrackForm({ ...trackForm, status: e.target.value })}>
            {['pickup', 'in_transit'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="form-grid mb-2">
          <div className="form-field"><label>Latitude</label><input type="number" value={trackForm.lat} onChange={(e) => setTrackForm({ ...trackForm, lat: e.target.value })} /></div>
          <div className="form-field"><label>Longitude</label><input type="number" value={trackForm.lng} onChange={(e) => setTrackForm({ ...trackForm, lng: e.target.value })} /></div>
        </div>
        <div className="form-field mb-2"><label>Location Address</label><input value={trackForm.address} onChange={(e) => setTrackForm({ ...trackForm, address: e.target.value })} placeholder="e.g. Near toll plaza, NH-48" /></div>
        <div className="form-field"><label>Note</label><input value={trackForm.note} onChange={(e) => setTrackForm({ ...trackForm, note: e.target.value })} placeholder="Optional note" /></div>
      </Modal>
    </AppLayout>
  );
}
