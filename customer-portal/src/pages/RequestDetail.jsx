import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { StatusBadge, Loading } from '../components/ui';
import { toast } from '../store/toast.store';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/requests/${id}`);
        setRequest(r.data.data.request);
      } catch (err) {
        setError(extractError(err));
      }
    })();
  }, [id]);

  useEffect(() => {
    if (request) {
      (async () => {
        try {
          const q = await api.get('/quotations');
          const list = q.data.data.quotations || [];
          const found = list.find((qo) => qo.requestId && String(qo.requestId._id || qo.requestId) === id);
          if (found) setQuotation(found);
        } catch {}
      })();
    }
  }, [request, id]);

  const handleAccept = async (quotationId) => {
    setActing(true);
    try {
      await api.patch(`/quotations/${quotationId}/accept`);
      toast('Quotation accepted! Shipment created.', 'success');
      navigate('/shipments');
    } catch (err) {
      toast(extractError(err), 'error');
      setActing(false);
    }
  };

  const handleDecline = async (quotationId) => {
    setActing(true);
    try {
      await api.patch(`/quotations/${quotationId}/decline`);
      toast('Quotation declined', 'info');
      setQuotation({ ...quotation, status: 'declined' });
      setRequest((r) => ({ ...r, status: 'pending' }));
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.patch(`/requests/${id}/cancel`);
      toast('Request cancelled', 'info');
      setRequest((r) => ({ ...r, status: 'cancelled' }));
    } catch (err) {
      toast(extractError(err), 'error');
    }
  };

  if (error) return <AppLayout nav={customerNav} title="Request"><div className="card text-danger">{error}</div></AppLayout>;
  if (!request) return <AppLayout nav={customerNav} title="Request"><Loading /></AppLayout>;

  return (
    <AppLayout nav={customerNav} title="Request Detail" subtitle={<StatusBadge status={request.status} />}>
      <div className="two-col">
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <h3>Route & Cargo</h3>
            {!['accepted', 'cancelled', 'rejected'].includes(request.status) && (
              <button className="btn btn-outline btn-sm" onClick={handleCancel}>Cancel Request</button>
            )}
          </div>
          <table className="data-table">
            <tbody>
              <tr><td><strong>Pickup</strong></td><td>{request.pickup?.address}, {request.pickup?.city}</td></tr>
              <tr><td><strong>Destination</strong></td><td>{request.destination?.address}, {request.destination?.city}</td></tr>
              <tr><td><strong>Distance</strong></td><td>{request.estimatedDistanceKm ? `~${request.estimatedDistanceKm} km` : '—'}</td></tr>
              <tr><td><strong>Cargo Type</strong></td><td>{request.cargoType}</td></tr>
              <tr><td><strong>Description</strong></td><td>{request.cargoDescription || '—'}</td></tr>
              <tr><td><strong>Weight</strong></td><td>{request.weightKg} kg × {request.units} units</td></tr>
              <tr><td><strong>Vehicle</strong></td><td>{request.vehicleType}</td></tr>
              <tr><td><strong>Pickup Date</strong></td><td>{request.pickupDate ? new Date(request.pickupDate).toLocaleDateString('en-IN') : '—'}</td></tr>
              {request.additionalRequirements && <tr><td><strong>Notes</strong></td><td>{request.additionalRequirements}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="mb-2">Quotation</h3>
          {!quotation ? (
            <div className="text-muted">
              {request.status === 'quoted' || request.status === 'accepted'
                ? 'Quotation not found.'
                : 'No quotation yet. The owner is preparing one.'}
            </div>
          ) : (
            <div>
              <div className="text-orange" style={{ fontSize: '1.6rem', fontWeight: 700 }}>₹{quotation.totalAmountINR?.toLocaleString('en-IN')}</div>
              <div className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                {quotation.includesGST ? `Incl. ${quotation.gstPercent}% GST` : 'Excl. GST'}
              </div>
              <table className="data-table" style={{ marginBottom: '1rem' }}>
                <thead><tr><th>Item</th><th>Amount</th></tr></thead>
                <tbody>
                  {(quotation.lineItems || []).map((it, i) => (
                    <tr key={i}><td>{it.label}</td><td>₹{it.amountINR.toLocaleString('en-IN')}</td></tr>
                  ))}
                </tbody>
              </table>
              {quotation.status === 'sent' ? (
                <div className="flex gap-1">
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={acting} onClick={() => handleAccept(quotation._id)}>
                    {acting ? '...' : 'Accept'}
                  </button>
                  <button className="btn btn-outline" style={{ flex: 1 }} disabled={acting} onClick={() => handleDecline(quotation._id)}>
                    Decline
                  </button>
                </div>
              ) : (
                <StatusBadge status={quotation.status} />
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
