import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api } from '../services/api';
import { EmptyState, Loading } from '../components/ui';

const DOC_ICONS = { invoice: '🧾', pod: '📦', manifest: '📋', lr: '🪪' };

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/documents');
        setDocuments(res.data.data.documents || []);
      } catch {
        setDocuments([]);
      }
    })();
  }, []);

  if (!documents) return <AppLayout nav={customerNav} title="Documents"><Loading /></AppLayout>;

  return (
    <AppLayout nav={customerNav} title="Documents" subtitle="Download invoices, PODs, manifests and LR docs">
      {documents.length === 0 ? (
        <EmptyState icon="📄" title="No documents yet" subtitle="Documents are generated once a shipment is delivered." />
      ) : (
        <div className="grid-3">
          {documents.map((d) => (
            <div key={d._id} className="card flex items-center justify-between">
              <div>
                <div style={{ fontSize: '1.4rem' }}>{DOC_ICONS[d.type] || '📄'}</div>
                <div className="mt-1"><strong>{d.type?.toUpperCase()}</strong></div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {d.shipmentId?.trackingRef || d.filename || d._id}
                </div>
              </div>
              <a
                className="btn btn-outline btn-sm"
                href={d.url || '#'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { if (!d.url) e.preventDefault(); }}
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
