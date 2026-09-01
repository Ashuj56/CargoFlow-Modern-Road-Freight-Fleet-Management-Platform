import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { StatusBadge, Loading } from '../components/ui';
import RouteMap from '../components/RouteMap';
import { api } from '../services/api';
import { getSocket, joinShipmentRoom, leaveShipmentRoom } from '../services/socket';
import { toast } from '../store/toast.store';

const STATUS_ORDER = ['confirmed', 'assigned', 'pickup', 'in_transit', 'delivered', 'completed'];

export default function TrackShipment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const joinedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, e] = await Promise.all([
          api.get(`/shipments/${id}`),
          api.get(`/shipments/${id}/tracking`),
        ]);
        setShipment(s.data.data.shipment);
        setEvents(e.data.data.events || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load tracking');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!shipment) return;
    if (!joinedRef.current) {
      joinedRef.current = true;
      joinShipmentRoom(shipment._id);
      const socket = getSocket();
      const onUpdate = (data) => {
        if (data.shipmentId !== shipment._id) return;
        setEvents((prev) => [
          {
            _id: data.eventId || Date.now(),
            status: data.status,
            location: data.location,
            timestamp: data.timestamp,
            note: data.note,
          },
          ...prev,
        ]);
        if (data.location && data.location.address) toast(`📍 ${data.location.address}`, 'info');
      };
      socket.on('tracking:update', onUpdate);
      return () => {
        socket.off('tracking:update', onUpdate);
        leaveShipmentRoom(shipment._id);
        joinedRef.current = false;
      };
    }
    return undefined;
  }, [shipment]);

  if (error) return <AppLayout nav={customerNav} title="Track Shipment"><div className="card text-danger">{error}</div></AppLayout>;
  if (!shipment) return <AppLayout nav={customerNav} title="Track Shipment"><Loading /></AppLayout>;

  const pickup = shipment.requestId?.pickup;
  const destination = shipment.requestId?.destination;
  const latestEvent = events.length ? events[events.length - 1] : null;
  const currentPosition = latestEvent?.location || pickup;
  const currentStatusIndex = STATUS_ORDER.indexOf(shipment.status);
  const statusStep = Math.max(0, currentStatusIndex);

  const shareLink = `${window.location.origin}/public/${shipment.trackingRef}`;

  return (
    <AppLayout nav={customerNav} title={`Track ${shipment.trackingRef}`} subtitle={<StatusBadge status={shipment.status} />}>
      <RouteMap pickup={pickup} destination={destination} currentPosition={currentPosition} height={420} />

      <div className="mt-2 two-col">
        <div className="card">
          <h4>Timeline</h4>
          <div className="timeline mt-1">
            {STATUS_ORDER.map((s, i) => {
              const state = i < statusStep ? 'done' : i === statusStep ? 'active' : '';
              const label = s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div key={s} className={`tl-item ${state}`}>
                  <div className="tl-label">{label}</div>
                  {i === statusStep && (
                    <div className="tl-meta">
                      {shipment.timeline?.find((t) => t.status === s)?.timestamp
                        ? new Date(shipment.timeline.find((t) => t.status === s).timestamp).toLocaleString('en-IN')
                        : 'In progress'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card">
            <h4>Shipment Details</h4>
            <table className="data-table">
              <tbody>
                <tr><td><strong>Truck</strong></td><td>{shipment.truckId ? `${shipment.truckId.regNumber || ''} (${shipment.truckId.type || ''})` : 'Not assigned'}</td></tr>
                <tr><td><strong>Driver</strong></td><td>{shipment.driverId?.name || 'Not assigned'}</td></tr>
                <tr><td><strong>Route</strong></td><td>{pickup?.city} → {destination?.city}</td></tr>
                <tr><td><strong>Cargo</strong></td><td>{shipment.requestId?.cargoType} ({shipment.requestId?.weightKg} kg)</td></tr>
                <tr><td><strong>Created</strong></td><td>{shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString('en-IN') : ''}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card mt-2">
            <h4>Share Tracking Link</h4>
            <div className="flex gap-1">
              <input
                readOnly
                value={shareLink}
                style={{ flex: 1, padding: '0.5rem 0.6rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem' }}
              />
              <button className="btn btn-outline btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(shareLink); toast('Link copied!', 'success'); } catch {} }}>
                Copy
              </button>
            </div>
          </div>

          <div className="card mt-2">
            <h4>Tracking Updates</h4>
            <div className="timeline">
              {events.length === 0 ? (
                <div className="text-muted">No tracking updates yet.</div>
              ) : (
                events.map((ev) => (
                  <div key={ev._id} className="tl-item done">
                    <div className="tl-label">{ev.status?.replace('_', ' ')}</div>
                    {ev.location?.address && <div className="tl-meta">📍 {ev.location.address}</div>}
                    {ev.note && <div className="tl-meta">{ev.note}</div>}
                    <div className="tl-meta">{new Date(ev.timestamp).toLocaleString('en-IN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
