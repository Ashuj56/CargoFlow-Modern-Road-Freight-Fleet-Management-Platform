import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api } from '../services/api';
import { StatCard, Loading } from '../components/ui';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, m] = await Promise.all([api.get('/reports/summary'), api.get('/reports/monthly')]);
        setSummary(s.data.data);
        setMonthly(m.data.data);
      } catch {}
    })();
  }, []);

  if (!summary || !monthly) return <AppLayout nav={ownerNav} title="Reports"><Loading /></AppLayout>;

  const maxRevenue = Math.max(...monthly.months.map((m) => m.revenueINR), 1);
  const maxShipments = Math.max(...monthly.months.map((m) => m.shipments), 1);

  return (
    <AppLayout nav={ownerNav} title="Reports" subtitle={`Monthly report — ${monthly.year}`}>
      <div className="stat-grid">
        <StatCard label="Fleet Size" value={summary.fleet.totalTrucks} />
        <StatCard label="Total Collected" value={`₹${summary.revenue.totalCollectedINR.toLocaleString('en-IN')}`} />
        <StatCard label="Outstanding" value={`₹${summary.revenue.outstandingINR.toLocaleString('en-IN')}`} />
        <StatCard label="Delivered Shipments" value={summary.operations.deliveredShipments} />
      </div>

      <div className="two-col">
        <div className="card">
          <h4>Revenue by Month (₹)</h4>
          <div className="mt-2" style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 220 }}>
            {monthly.months.map((m) => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                  {m.revenueINR > 0 ? `₹${(m.revenueINR / 1000).toFixed(0)}k` : ''}
                </div>
                <div style={{ width: '100%', maxWidth: 30, background: 'var(--orange)', borderRadius: '4px 4px 0 0', height: `${(m.revenueINR / maxRevenue) * 100}%`, minHeight: m.revenueINR > 0 ? 4 : 0 }} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{MONTHS[m.month - 1]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4>Shipments by Month</h4>
          <div className="mt-2" style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 220 }}>
            {monthly.months.map((m) => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>{m.shipments > 0 ? m.shipments : ''}</div>
                <div style={{ width: '100%', maxWidth: 30, background: 'var(--blue)', borderRadius: '4px 4px 0 0', height: `${(m.shipments / maxShipments) * 100}%`, minHeight: m.shipments > 0 ? 4 : 0 }} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{MONTHS[m.month - 1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-2">
        <h4>Fleet Utilization</h4>
        <div className="mt-1">
          <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
            <span>Available</span><strong>{summary.fleet.available}</strong>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, margin: '4px 0 12px' }}>
            <div style={{ height: '100%', width: `${(summary.fleet.available / Math.max(1, summary.fleet.totalTrucks)) * 100}%`, background: 'var(--success)', borderRadius: 4 }} />
          </div>
          <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
            <span>Assigned</span><strong>{summary.fleet.assigned}</strong>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, margin: '4px 0 12px' }}>
            <div style={{ height: '100%', width: `${(summary.fleet.assigned / Math.max(1, summary.fleet.totalTrucks)) * 100}%`, background: 'var(--orange)', borderRadius: 4 }} />
          </div>
          <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
            <span>Maintenance</span><strong>{summary.fleet.maintenance}</strong>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, margin: '4px 0 12px' }}>
            <div style={{ height: '100%', width: `${(summary.fleet.maintenance / Math.max(1, summary.fleet.totalTrucks)) * 100}%`, background: 'var(--warning)', borderRadius: 4 }} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
