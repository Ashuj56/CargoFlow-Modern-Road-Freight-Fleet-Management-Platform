import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api } from '../services/api';
import { EmptyState, Loading } from '../components/ui';

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try { const r = await api.get('/customers'); setCustomers(r.data.data.customers || []); }
      catch { setCustomers([]); }
    })();
  }, []);

  const select = async (id) => {
    try {
      const r = await api.get(`/customers/${id}`);
      setSelected(r.data.data.customer);
      setHistory(r.data.data.shipments || []);
    } catch {}
  };

  if (!customers) return <AppLayout nav={ownerNav} title="Customers"><Loading /></AppLayout>;

  return (
    <AppLayout nav={ownerNav} title="Customers" subtitle="Your customers and their shipment history">
      {customers.length === 0 ? (
        <EmptyState icon="🏢" title="No customers yet" subtitle="Customers who request shipments with you will appear here." />
      ) : (
        <div className="two-col">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Company</th><th>Contact</th><th>Shipments</th><th></th></tr></thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => select(c._id)}>
                    <td><strong>{c.companyName || c.userId?.name}</strong></td>
                    <td>{c.userId?.email || '—'}</td>
                    <td>{c.shipmentCount}</td>
                    <td><button className="btn btn-outline btn-sm">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            {!selected ? (
              <div className="card text-muted">Select a customer to view details and shipment history.</div>
            ) : (
              <>
                <div className="card">
                  <h4>{selected.companyName || selected.userId?.name}</h4>
                  <table className="data-table">
                    <tbody>
                      <tr><td><strong>Email</strong></td><td>{selected.userId?.email}</td></tr>
                      <tr><td><strong>Phone</strong></td><td>{selected.phone || '—'}</td></tr>
                      <tr><td><strong>GST</strong></td><td>{selected.gstNumber || '—'}</td></tr>
                      <tr><td><strong>Total Shipments</strong></td><td>{selected.totalShipments || 0}</td></tr>
                      <tr><td><strong>Total Spend</strong></td><td className="money">₹{(selected.totalSpendINR || 0).toLocaleString('en-IN')}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="card mt-2">
                  <h4>Shipment History</h4>
                  {history.length === 0 ? (
                    <div className="text-muted">No shipments with this customer yet.</div>
                  ) : (
                    history.map((s) => (
                      <div key={s._id} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                        <div><strong>{s.trackingRef}</strong> <span className="text-muted" style={{ fontSize: '0.8rem' }}>{s.status}</span></div>
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
