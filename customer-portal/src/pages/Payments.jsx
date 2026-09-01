import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';

export default function Payments() {
  const [payments, setPayments] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/payments');
        setPayments(res.data.data.payments || []);
      } catch {
        setPayments([]);
      }
    })();
  }, []);

  if (!payments) return <AppLayout nav={customerNav} title="Payments"><Loading /></AppLayout>;

  const totalOutstanding = payments.filter((p) => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + (p.amountINR || 0), 0);
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amountINR || 0), 0);

  return (
    <AppLayout nav={customerNav} title="Payments" subtitle="Invoices and payment status">
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Total Paid</div><div className="stat-value text-success">₹{totalPaid.toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-label">Outstanding</div><div className="stat-value text-orange">₹{totalOutstanding.toLocaleString('en-IN')}</div></div>
      </div>

      {payments.length === 0 ? (
        <EmptyState icon="💳" title="No payment records yet" subtitle="Payments appear once your shipments are quoted." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Invoice</th><th>Shipment</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.invoiceNumber || '—'}</strong></td>
                  <td>{p.shipmentId?.trackingRef || '—'}</td>
                  <td className="money">₹{(p.amountINR || 0).toLocaleString('en-IN')}</td>
                  <td>{p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
