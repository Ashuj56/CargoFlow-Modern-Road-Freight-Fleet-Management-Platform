import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';
import Modal from '../components/Modal';
import { toast } from '../store/toast.store';

const STATUSES = ['available', 'on_duty', 'off_duty'];
const empty = { name: '', licenseNumber: '', phone: '', email: '', status: 'available', assignedTruckId: '' };

export default function Drivers() {
  const [drivers, setDrivers] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [d, t] = await Promise.all([api.get('/drivers'), api.get('/trucks')]);
      setDrivers(d.data.data.drivers || []);
      setTrucks(t.data.data.trucks || []);
    } catch { setDrivers([]); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!modal) { setForm(empty); setEditingId(null); } }, [modal]);

  const openAdd = () => { setEditingId(null); setForm(empty); setModal(true); };
  const openEdit = (d) => { setEditingId(d._id); setForm({ name: d.name, licenseNumber: d.licenseNumber, phone: d.phone, email: d.email, status: d.status, assignedTruckId: d.assignedTruckId?._id || '' }); setModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, assignedTruckId: form.assignedTruckId || null };
      if (editingId) { await api.patch(`/drivers/${editingId}`, payload); toast('Driver updated', 'success'); }
      else { await api.post('/drivers', payload); toast('Driver added', 'success'); }
      setModal(false); load();
    } catch (err) { toast(extractError(err), 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this driver?')) return;
    try { await api.delete(`/drivers/${id}`); toast('Driver removed', 'info'); load(); }
    catch (err) { toast(extractError(err), 'error'); }
  };

  if (!drivers) return <AppLayout nav={ownerNav} title="Fleet - Drivers"><Loading /></AppLayout>;

  return (
    <AppLayout nav={ownerNav} title="Fleet - Drivers" subtitle="Your driver roster" actions={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Driver</button>}>
      {drivers.length === 0 ? (
        <EmptyState icon="🧑‍✈️" title="No drivers yet" subtitle="Add drivers to assign them to shipments." action={<button className="btn btn-primary" onClick={openAdd}>+ Add Driver</button>} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>License</th><th>Phone</th><th>Truck</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d._id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.licenseNumber}</td>
                  <td>{d.phone || '—'}</td>
                  <td>{d.assignedTruckId?.regNumber || '—'}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(d._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Edit Driver' : 'Add Driver'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="form-grid">
          <div className="form-field"><label>Name*</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-field"><label>License No*</label><input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></div>
          <div className="form-field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="form-field"><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-field"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="form-field"><label>Assign Truck</label><select value={form.assignedTruckId} onChange={(e) => setForm({ ...form, assignedTruckId: e.target.value })}><option value="">—</option>{trucks.map((t) => <option key={t._id} value={t._id}>{t.regNumber} ({t.type}){t.status === 'assigned' ? ' [assigned]' : ''}</option>)}</select></div>
        </div>
      </Modal>
    </AppLayout>
  );
}
