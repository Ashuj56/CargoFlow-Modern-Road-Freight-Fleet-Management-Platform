import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const truckIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const pickupIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#16A34A;border:3px solid #fff;box-shadow:0 0 0 2px #16A34A;position:relative;left:-8px;top:-8px;"></div>',
  iconSize: [16, 16],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#DC2626;border:3px solid #fff;box-shadow:0 0 0 2px #DC2626;position:relative;left:-8px;top:-8px;"></div>',
  iconSize: [16, 16],
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export default function RouteMap({ pickup, destination, currentPosition, height = 400 }) {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (!pickup || !destination) return;
    const p = [pickup.lat, pickup.lng];
    const d = [destination.lat, destination.lng];
    if (!p[0] || !d[0]) return;

    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          setRoute(data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]));
        }
      } catch {
        setRoute(null);
      }
    })();
  }, [pickup, destination]);

  const hasLocations = pickup || destination;
  const bounds = hasLocations ? [[pickup?.lat || 0, pickup?.lng || 0], [destination?.lat || 0, destination?.lng || 0]] : null;

  return (
    <div className="map-wrap" style={{ height, position: 'relative' }}>
      <MapContainer
        center={currentPosition ? [currentPosition.lat, currentPosition.lng] : [(pickup?.lat || destination?.lat) || 20, (pickup?.lng || destination?.lng) || 78]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pickup && pickup.lat && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}><Popup>Pickup</Popup></Marker>}
        {destination && destination.lat && <Marker position={[destination.lat, destination.lng]} icon={destIcon}><Popup>Destination</Popup></Marker>}
        {route && <Polyline positions={route} pathOptions={{ color: '#16A34A', weight: 4, opacity: 0.8 }} />}
        {currentPosition && currentPosition.lat && (
          <Marker position={[currentPosition.lat, currentPosition.lng]} icon={truckIcon}>
            <Popup>Truck position</Popup>
          </Marker>
        )}
        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
      {currentPosition && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(255,255,255,0.92)', padding: '0.4rem 0.6rem', borderRadius: 8, fontSize: '0.75rem', zIndex: 1000, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
          📍 {currentPosition.address || `${currentPosition.lat?.toFixed(4)}, ${currentPosition.lng?.toFixed(4)}`}
        </div>
      )}
    </div>
  );
}
