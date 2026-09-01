import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, Loading } from '../components/ui';

const truckIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:26px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">🚚</div>',
  iconSize: [26, 26],
});

function PanToMarkers({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.position[0], m.position[1]]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [markers, map]);
  return null;
}

export default function LiveTracking() {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [positions, setPositions] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/shipments');
        const shipments = r.data.data.shipments || [];
        const activeList = shipments.filter((s) => ['assigned', 'pickup', 'in_transit'].includes(s.status));
        setActive(activeList);

        // Fetch latest tracking event for each
        const results = await Promise.all(
          activeList.map(async (s) => {
            try {
              const ev = await api.get(`/shipments/${s._id}/tracking`);
              const events = ev.data.data.events || [];
              const latest = events[0];
              return { id: s._id, position: latest?.location ? { lat: latest.location.lat, lng: latest.location.lng, address: latest.location.address } : s.requestId?.pickup };
            } catch { return { id: s._id, position: s.requestId?.pickup }; }
          })
        );
        const map = {};
        results.forEach((x) => { map[x.id] = x.position; });
        setPositions(map);
      } catch { setActive([]); }
    })();
  }, []);

  if (!active) return <AppLayout nav={ownerNav} title="Live Tracking"><Loading /></AppLayout>;

  const markers = active
    .filter((s) => positions[s._id]?.lat)
    .map((s) => ({ id: s._id, s, position: [positions[s._id].lat, positions[s._id].lng] }));

  return (
    <AppLayout nav={ownerNav} title="Live Tracking" subtitle={`${active.length} shipment(s) on the road`}>
      <div className="map-wrap" style={{ height: 520 }}>
        <MapContainer center={[20.5, 78]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {markers.map((m) => (
            <Marker key={m.id} position={m.position} icon={truckIcon}>
              <Popup>
                <div>
                  <strong>{m.s.trackingRef}</strong><br />
                  <StatusBadge status={m.s.status} />
                  <div className="text-muted" style={{ fontSize: '0.8rem', margin: '4px 0' }}>{positions[m.s._id]?.address}</div>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/shipments/${m.s._id}`)}>Manage</button>
                </div>
              </Popup>
            </Marker>
          ))}
          {markers.length > 0 && <PanToMarkers markers={markers} />}
        </MapContainer>
      </div>

      {active.length === 0 && (
        <div className="card mt-2 text-muted">No active shipments to track right now.</div>
      )}
    </AppLayout>
  );
}
