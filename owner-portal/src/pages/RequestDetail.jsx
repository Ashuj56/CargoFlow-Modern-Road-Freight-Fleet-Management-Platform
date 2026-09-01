import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { StatusBadge, Loading } from '../components/ui';
import { toast } from '../store/toast.store';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');

  const [lineItems, setLineItems] = useState([{ label: 'Transport Charge', amountINR: '' }]);
  const [includesGST, setIncludesGST] = useState(true);
  const [gstPercent, setGstPercent] = useState(18);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await api.get(`/requests/${id}`); setRequest(r.data.data.request); }
      catch (err) { setError(extractError(err)); }
    })();
  }, [id]);

  const subtotal = lineItems.reduce((s, it) => s + (Number(it.amountINR) || 0), 0);
  const gstAmount = includesGST ? (subtotal * gstPercent) / 100 : 0;
  const total = subtotal + gstAmount;

  const updateItem = (i, k, v) => {
    const next = [...lineItems];
    next[i][k] = v;
    setLineItems(next);
  };

  const addItem = () => setLineItems([...lineItems, { label: '', amountINR: '' }]);
  const removeItem = (i) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const markReviewed = async () => {
    try { await api.patch(`/requests/${id}/review`); toast('Request marked as reviewed', 'info'); setRequest((r) => ({ ...r, status: 'reviewed' })); }
    catch (err) { toast(extractError(err), 'error'); }
  };

  const reject = async () => {
    const reason = window.prompt('Reason for rejection:');
    try { await api.patch(`/requests/${id}/reject`, { reason }); toast('Request rejected', 'info'); setRequest((r) => ({ ...r, status: 'rejected', rejectionReason: reason })); }
    catch (err) { toast(extractError(err), 'error'); }
  };

  const sendQuotation = async () => {
    if (lineItems.length === 0 || !lineItems.some((it) => it.label && Number(it.amountINR) > 0)) {
      return toast('Add at least one line item with a positive amount', 'error');
    }
    setSending(true);
    try {
      await api.post('/quotations', {
        requestId: id,
        lineItems: lineItems.map((it) => ({ label: it.label, amountINR: Number(it.amountINR) })),
        includesGST,
        gstPercent,
        validUntil: validUntil || undefined,
        notes,
      });
      toast('Quotation sent to customer!', 'success');
      navigate('/requests');
    } catch (err) { toast(extractError(err), 'error'); }
    finally { setSending(false); }
  };

  if (error) return <AppLayout nav={ownerNav} title="Request"><div className="card text-danger">{error}</div></AppLayout>;
  if (!request) return <AppLayout nav={ownerNav} title="Request"><Loading /></AppLayout>;

  const canQuote = ['pending', 'reviewed', 'quoted', 'accepted'].includes(request.status);
  const alreadyRejected = request.status === 'rejected' || request.status === 'cancelled';

  return (
    <AppLayout nav={ownerNav} title="Request Detail" subtitle={<StatusBadge status={request.status} />}>
      <div className="two-col">
        {/* Request summary */}
        <div className="card">
          <h3 className="mb-2">Request Summary</h3>
          <table className="data-table">
            <tbody>
              <tr><td><strong>Route</strong></td><td>{request.pickup?.city} → {request.destination?.city}</td></tr>
              <tr><td><strong>Addresses</strong></td><td>{request.pickup?.address} → {request.destination?.address}</td></tr>
              <tr><td><strong>Distance</strong></td><td>{request.estimatedDistanceKm ? `~${request.estimatedDistanceKm} km` : '—'}</td></tr>
              <tr><td><strong>Cargo</strong></td><td>{request.cargoType} — {request.cargoDescription || 'N/A'}</td></tr>
              <tr><td><strong>Weight</strong></td><td>{request.weightKg} kg × {request.units} units</td></tr>
              <tr><td><strong>Vehicle</strong></td><td>{request.vehicleType}</td></tr>
              <tr><td><strong>Pickup Date</strong></td><td>{request.pickupDate ? new Date(request.pickupDate).toLocaleDateString('en-IN') : '—'}</td></tr>
              {request.additionalRequirements && <tr><td><strong>Notes</strong></td><td>{request.additionalRequirements}</td></tr>}
              <tr><td><strong>Customer</strong></td><td>{request.customerInfo ? `${request.customerInfo.companyName || ''} (${request.customerInfo.name || ''})` : '—'}</td></tr>
            </tbody>
          </table>

          {request.status === 'pending' && !alreadyRejected && (
            <div className="mt-2 flex gap-1">
              <button className="btn btn-outline" onClick={markReviewed}>Mark Reviewed</button>
              <button className="btn btn-danger" onClick={reject}>Reject</button>
            </div>
          )}
          {request.status === 'rejected' && <div className="mt-2 text-danger">Rejected: {request.rejectionReason}</div>}
        </div>

        {/* Quotation builder */}
        <div className="card">
          <h3 className="mb-2">Quotation Builder</h3>

          <div className="flex gap-1 mb-1">
            <label className="flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
              <input type="checkbox" checked={includesGST} onChange={(e) => setIncludesGST(e.target.checked)} />
              Include GST
            </label>
            {includesGST && (
              <select value={gstPercent} onChange={(e) => setGstPercent(Number(e.target.value))} style={{ padding: '0.3rem', borderRadius: 6, border: '1px solid var(--border)' }}>
                {[5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
              </select>
            )}
          </div>

          {lineItems.map((it, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input
                placeholder="Item label"
                value={it.label}
                onChange={(e) => updateItem(i, 'label', e.target.value)}
                style={{ flex: 2, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
              />
              <input
                type="number"
                placeholder="₹ amount"
                value={it.amountINR}
                onChange={(e) => updateItem(i, 'amountINR', e.target.value)}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
              />
              <button className="btn btn-outline btn-sm" onClick={() => removeItem(i)} style={{ color: 'var(--danger)' }}>✕</button>
            </div>
          ))}

          <button className="btn btn-outline btn-sm" onClick={addItem}>+ Add Line Item</button>

          <div className="mt-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div>
            {includesGST && <div className="flex justify-between"><span className="text-muted">GST ({gstPercent}%)</span><strong>₹{gstAmount.toLocaleString('en-IN')}</strong></div>}
            <div className="flex justify-between mt-1" style={{ fontSize: '1.4rem' }}>
              <span className="text-orange" style={{ fontWeight: 700 }}>TOTAL</span>
              <span className="money text-orange">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-2 form-grid">
            <div className="form-field"><label>Valid Until</label><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
            <div className="form-field"><label>Notes</label><input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>

          <div className="mt-2 flex gap-1">
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={sending || alreadyRejected || !canQuote} onClick={sendQuotation}>
              {sending ? 'Sending...' : 'Send Quotation'}
            </button>
          </div>
          {!canQuote && <div className="mt-1 text-muted" style={{ fontSize: '0.8rem' }}>This request can no longer be quoted.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
