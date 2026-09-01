import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { toast } from '../store/toast.store';
import { Loading } from '../components/ui';

import { geocodeLocation, getDrivingDistance } from '../services/geo';

const CARGO_TYPES = ['Machinery', 'Electronics', 'Chemicals', 'FMCG', 'Containers', 'Agriculture', 'Other'];
const VEHICLE_TYPES = ['light', 'medium', 'heavy', 'flatbed', 'tanker'];

const initial = {
  ownerId: '',
  pickupAddress: '',
  pickupCity: '',
  pickupLat: null,
  pickupLng: null,
  destAddress: '',
  destCity: '',
  destLat: null,
  destLng: null,
  cargoType: 'Machinery',
  cargoDescription: '',
  weightKg: '',
  units: 1,
  vehicleType: 'medium',
  pickupDate: '',
  additionalRequirements: '',
  estimatedDistanceKm: 0,
  estimatedDurationHours: 0,
};

export default function RequestShipment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initial);
  const [owners, setOwners] = useState([]);
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingRoute, setCheckingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/owners');
        setOwners(res.data.data.owners || []);
      } catch {
        setOwners([]);
      } finally {
        setLoadingOwners(false);
      }
    })();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const estimateDistance = async (customForm = form) => {
    const pCity = (customForm.pickupCity || '').trim();
    const dCity = (customForm.destCity || '').trim();
    if (!pCity || !dCity) return null;

    setCheckingRoute(true);
    try {
      // 1. Geocode Pickup City / Address
      const pickupQuery = customForm.pickupAddress ? `${customForm.pickupAddress}, ${pCity}` : pCity;
      const destQuery = customForm.destAddress ? `${customForm.destAddress}, ${dCity}` : dCity;

      const [pGeo, dGeo] = await Promise.all([
        geocodeLocation(pickupQuery) || geocodeLocation(pCity),
        geocodeLocation(destQuery) || geocodeLocation(dCity),
      ]);

      if (!pGeo || !dGeo) {
        toast(`Could not find coordinates for ${!pGeo ? pCity : dCity}`, 'warning');
        setCheckingRoute(false);
        return null;
      }

      // 2. Real highway road route & distance via OSRM
      const route = await getDrivingDistance(pGeo, dGeo);
      if (route) {
        setForm((f) => ({
          ...f,
          pickupLat: pGeo.lat,
          pickupLng: pGeo.lng,
          destLat: dGeo.lat,
          destLng: dGeo.lng,
          estimatedDistanceKm: route.distanceKm,
          estimatedDurationHours: route.durationHours,
        }));
        setRouteInfo(route);
        toast(`📍 Route calculated: ${route.distanceKm.toLocaleString('en-IN')} km (~${route.durationHours} hrs)`, 'success');
        return route;
      } else {
        toast('Could not calculate driving route', 'warning');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      toast('Could not estimate distance', 'error');
    } finally {
      setCheckingRoute(false);
    }
    return null;
  };

  const next = async () => {
    if (step === 1) {
      if (!form.ownerId || !form.pickupCity || !form.destCity || !form.cargoType) {
        setError('Please fill in owner, route cities and cargo type');
        return;
      }
      // If distance wasn't estimated yet, calculate it automatically
      if (!form.estimatedDistanceKm) {
        await estimateDistance(form);
      }
    }
    if (step === 2 && (!form.weightKg || !form.pickupDate)) {
      setError('Please fill in weight and pickup date');
      return;
    }
    setError('');
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ownerId: form.ownerId,
        pickup: { address: form.pickupAddress, city: form.pickupCity, lat: Number(form.pickupLat) || 0, lng: Number(form.pickupLng) || 0 },
        destination: { address: form.destAddress, city: form.destCity, lat: Number(form.destLat) || 0, lng: Number(form.destLng) || 0 },
        cargoType: form.cargoType,
        cargoDescription: form.cargoDescription,
        weightKg: Number(form.weightKg),
        units: Number(form.units) || 1,
        vehicleType: form.vehicleType,
        pickupDate: form.pickupDate,
        additionalRequirements: form.additionalRequirements,
        estimatedDistanceKm: form.estimatedDistanceKm || 0,
      };
      await api.post('/requests', payload);
      toast('Shipment request submitted!', 'success');
      navigate('/requests');
    } catch (err) {
      setError(extractError(err));
      setSubmitting(false);
    }
  };

  if (loadingOwners) return <AppLayout nav={customerNav} title="Request Shipment"><Loading /></AppLayout>;
  if (owners.length === 0)
    return (
      <AppLayout nav={customerNav} title="Request Shipment">
        <div className="card text-muted">
          No fleet owners are currently accepting requests. Please check back soon.
        </div>
      </AppLayout>
    );

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <AppLayout nav={customerNav} title="Request Shipment" subtitle="Tell us about your cargo — three quick steps">
      {/* Progress bar */}
      <div className="card mb-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          {['Route & Cargo', 'Schedule & Vehicle', 'Review & Submit'].map((label, i) => (
            <span key={label} style={{ fontWeight: 600, color: step === i + 1 ? 'var(--orange)' : step > i + 1 ? 'var(--success)' : 'var(--text-muted)' }}>
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--orange)', borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {error && <div className="card mb-2" style={{ background: '#FEF2F2', borderColor: 'var(--danger)', color: 'var(--danger)' }}>{error}</div>}

      {step === 1 && (
        <div className="card fade">
          <div className="form-grid">
            <div className="form-field full">
              <label>Select Fleet Owner ⛟</label>
              <select value={form.ownerId} onChange={set('ownerId')}>
                <option value="">Select an owner...</option>
                {owners.map((o) => (
                  <option key={o.ownerId} value={o.ownerId}>
                    {o.companyName || o.name} {o.city ? `(${o.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>📌 Pickup Address</label>
              <input value={form.pickupAddress} onChange={set('pickupAddress')} onBlur={() => form.pickupCity && form.destCity && estimateDistance()} placeholder="Street, Industrial Area" />
            </div>
            <div className="form-field">
              <label>Pickup City*</label>
              <input value={form.pickupCity} onChange={set('pickupCity')} onBlur={() => form.destCity && estimateDistance()} placeholder="e.g. Mumbai, Delhi, Ahmedabad" />
            </div>
            <div className="form-field">
              <label>🏁 Destination Address</label>
              <input value={form.destAddress} onChange={set('destAddress')} onBlur={() => form.pickupCity && form.destCity && estimateDistance()} placeholder="Street, Warehouse" />
            </div>
            <div className="form-field">
              <label>Destination City*</label>
              <input value={form.destCity} onChange={set('destCity')} onBlur={() => form.pickupCity && estimateDistance()} placeholder="e.g. Bangalore, Pune, Kolkata" />
            </div>

            <div className="form-field">
              <label>Cargo Type</label>
              <select value={form.cargoType} onChange={set('cargoType')}>
                {CARGO_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Cargo Description</label>
              <input value={form.cargoDescription} onChange={set('cargoDescription')} placeholder="e.g. Industrial generators, Electronics" />
            </div>
          </div>

          {/* Dynamic Route & Distance Preview */}
          <div className="mt-2 p-2" style={{ background: 'var(--bg-muted, #F8FAFC)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => estimateDistance()} disabled={checkingRoute || !form.pickupCity || !form.destCity}>
                {checkingRoute ? 'Calculating Route...' : '🔄 Recalculate Distance'}
              </button>
              {form.estimatedDistanceKm > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge b-in_transit" style={{ fontSize: '0.9rem', padding: '0.35rem 0.65rem' }}>
                    🛣️ {form.estimatedDistanceKm.toLocaleString('en-IN')} km
                  </span>
                  {form.estimatedDurationHours > 0 && (
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      ⏱️ Approx. {form.estimatedDurationHours >= 24 ? `${(form.estimatedDurationHours / 24).toFixed(1)} days (${form.estimatedDurationHours} hrs)` : `${form.estimatedDurationHours} hrs`}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                  Enter pickup & destination cities to calculate highway road distance via free OpenStreetMap/OSRM.
                </span>
              )}
            </div>
            <button className="btn btn-primary" onClick={next} disabled={checkingRoute}>Next →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card fade">
          <div className="form-grid">
            <div className="form-field">
              <label>Weight (kg)*</label>
              <input type="number" value={form.weightKg} onChange={set('weightKg')} placeholder="5000" />
            </div>
            <div className="form-field">
              <label>Units</label>
              <input type="number" value={form.units} onChange={set('units')} placeholder="1" />
            </div>
            <div className="form-field">
              <label>Vehicle Type</label>
              <select value={form.vehicleType} onChange={set('vehicleType')}>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Pickup Date*</label>
              <input type="date" value={form.pickupDate} onChange={set('pickupDate')} />
            </div>
            <div className="form-field full">
              <label>Additional Requirements</label>
              <textarea rows={3} value={form.additionalRequirements} onChange={set('additionalRequirements')} placeholder="Any special handling instructions..." />
            </div>
          </div>
          <div className="mt-2 flex justify-between">
            <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={next}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card fade">
          <h4>Review Your Request</h4>
          <table className="data-table">
            <tbody>
              <tr><td><strong>Owner</strong></td><td>{owners.find((o) => o.ownerId === form.ownerId)?.companyName || form.ownerId}</td></tr>
              <tr><td><strong>Route</strong></td><td>{form.pickupCity || '—'} → {form.destCity || '—'}</td></tr>
              <tr><td><strong>Estimated Distance</strong></td><td>{form.estimatedDistanceKm ? `~${form.estimatedDistanceKm.toLocaleString('en-IN')} km` : 'Calculating...'} {form.estimatedDurationHours > 0 ? `(approx. ${form.estimatedDurationHours} hrs)` : ''}</td></tr>
              <tr><td><strong>Cargo</strong></td><td>{form.cargoType} — {form.cargoDescription || 'N/A'}</td></tr>
              <tr><td><strong>Weight</strong></td><td>{form.weightKg} kg × {form.units} units</td></tr>
              <tr><td><strong>Vehicle</strong></td><td>{form.vehicleType}</td></tr>
              <tr><td><strong>Pickup Date</strong></td><td>{form.pickupDate}</td></tr>
              {form.additionalRequirements && <tr><td><strong>Notes</strong></td><td>{form.additionalRequirements}</td></tr>}
            </tbody>
          </table>
          <div className="mt-2 flex justify-between">
            <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'SUBMIT REQUEST'}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
