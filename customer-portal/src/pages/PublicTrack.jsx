import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge, Loading } from '../components/ui';
import RouteMap from '../components/RouteMap';
import { api } from '../services/api';

export default function PublicTrack() {
  const { ref } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/tracking/${ref}`);
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load tracking');
      }
    })();
  }, [ref]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: 'var(--navy)', color: '#fff' }}>
        <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>CARGO<span style={{ color: 'var(--orange)' }}>FLOW</span></span>
        <Link to="/" style={{ color: '#fff' }}>Portal →</Link>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {error ? (
          <div className="card text-danger">{error}</div>
        ) : !data ? (
          <Loading />
        ) : (
          <>
            <div className="card mb-2 flex items-center justify-between">
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tracking reference</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.shipment.trackingRef}</div>
              </div>
              <StatusBadge status={data.shipment.status} />
            </div>

            <RouteMap
              pickup={data.shipment.pickup}
              destination={data.shipment.destination}
              currentPosition={data.events[0]?.location || data.shipment.pickup}
              height={420}
            />

            <div className="mt-2 grid-3">
              <div className="card">
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>ROUTE</div>
                <strong>{data.shipment.pickup?.city} → {data.shipment.destination?.city}</strong>
              </div>
              <div className="card">
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>TRUCK</div>
                <strong>{data.shipment.truck?.regNumber || '—'}</strong>
              </div>
              <div className="card">
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>DRIVER</div>
                <strong>{data.shipment.driver?.name || '—'}</strong>
              </div>
            </div>

            <div className="card mt-2">
              <h4>Tracking Updates</h4>
              <div className="timeline mt-1">
                {data.events.length === 0 ? (
                  <div className="text-muted">No tracking updates yet.</div>
                ) : (
                  data.events.map((ev) => (
                    <div key={ev._id} className="tl-item done">
                      <div className="tl-label">{ev.status?.replace('_', ' ')}</div>
                      {ev.location?.address && <div className="tl-meta">📍 {ev.location.address}</div>}
                      <div className="tl-meta">{new Date(ev.timestamp).toLocaleString('en-IN')}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
