import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';
import { toast } from '../store/toast.store';

export default function Payments() {
  const [payments, setPayments] = useState(null);

  const load = async () => {
    try { const r = await api.get('/payments'); setPayments(r.data.data.payments || []); }
    catch { setPayments([]); }
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (id) => {
    if (!window.confirm('Mark this payment as paid?')) return;
    try { await api.patch(`/payments/${id}/mark-paid`, { method: 'mock' }); toast('Payment marked as paid', 'success'); load(); }
    catch (err) { toast(extractError(err), 'error'); }
  };

  if (!payments) return <AppLayout nav={ownerNav} title="Payments"><Loading /></AppLayout>;

  const totalCollected = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amountINR || 0), 0);
  const outstanding = payments.filter((p) => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + (p.amountINR || 0), 0);

  return (
    <AppLayout nav={ownerNav} title="Payments" subtitle="Revenue and outstanding amounts">
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Collected</div><div className="stat-value text-success">₹{totalCollected.toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-label">Outstanding</div><div className="stat-value text-orange">₹{outstanding.toLocaleString('en-IN')}</div></div>
      </div>

      {payments.length === 0 ? (
        <EmptyState icon="💳" title="No payment records yet" />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Invoice</th><th>Shipment</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.invoiceNumber || '—'}</strong></td>
                  <td>{p.shipmentId?.trackingRef || '—'}</td>
                  <td className="money">₹{(p.amountINR || 0).toLocaleString('en-IN')}</td>
                  <td>{p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    {p.status !== 'paid' && <button className="btn btn-outline btn-sm" onClick={() => markPaid(p._id)}>Mark Paid</button>}
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
