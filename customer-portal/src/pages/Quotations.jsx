import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/quotations');
        setQuotations(res.data.data.quotations || []);
      } catch {
        setQuotations([]);
      }
    })();
  }, []);

  if (!quotations) return <AppLayout nav={customerNav} title="Quotations"><Loading /></AppLayout>;

  return (
    <AppLayout nav={customerNav} title="Quotations" subtitle="All quotations received from fleet owners">
      {quotations.length === 0 ? (
        <EmptyState icon="💬" title="No quotations yet" subtitle="When an owner responds to your request, the quotation will appear here." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Route</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {quotations.map((q) => {
                const req = q.requestId || {};
                return (
                  <tr key={q._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/requests/${req._id || ''}`)}>
                    <td>{q.createdAt ? new Date(q.createdAt).toLocaleDateString('en-IN') : ''}</td>
                    <td>{req.pickup?.city} → {req.destination?.city}</td>
                    <td>{(q.lineItems || []).length} items</td>
                    <td className="money text-orange">₹{(q.totalAmountINR || 0).toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={q.status} /></td>
                    <td><button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/requests/${req._id || ''}`); }}>Review</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
