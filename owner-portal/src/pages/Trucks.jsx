import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { ownerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { StatusBadge, EmptyState, Loading } from '../components/ui';
import Modal from '../components/Modal';
import { toast } from '../store/toast.store';

const TRUCK_TYPES = ['light', 'medium', 'heavy', 'flatbed', 'tanker', 'container'];
const STATUSES = ['available', 'assigned', 'maintenance', 'inactive'];
const empty = { regNumber: '', make: '', model: '', year: '', type: 'medium', capacityTons: '', status: 'available' };

export default function Trucks() {
  const [trucks, setTrucks] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const r = await api.get('/trucks'); setTrucks(r.data.data.trucks || []); }
    catch { setTrucks([]); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!modal) { setForm(empty); setEditingId(null); } }, [modal]);

  const openAdd = () => { setEditingId(null); setForm(empty); setModal(true); };
  const openEdit = (t) => { setEditingId(t._id); setForm({ ...t }); setModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, year: form.year ? Number(form.year) : undefined, capacityTons: form.capacityTons ? Number(form.capacityTons) : undefined };
      if (editingId) { await api.patch(`/trucks/${editingId}`, payload); toast('Truck updated', 'success'); }
      else { await api.post('/trucks', payload); toast('Truck added', 'success'); }
      setModal(false); load();
    } catch (err) { toast(extractError(err), 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this truck?')) return;
    try { await api.delete(`/trucks/${id}`); toast('Truck removed', 'info'); load(); }
    catch (err) { toast(extractError(err), 'error'); }
  };

  if (!trucks) return <AppLayout nav={ownerNav} title="Fleet - Trucks"><Loading /></AppLayout>;

  return (
    <AppLayout nav={ownerNav} title="Fleet - Trucks" subtitle="Manage your truck fleet" actions={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Truck</button>}>
      {trucks.length === 0 ? (
        <EmptyState icon="🚛" title="No trucks added yet" subtitle="Start building your fleet by adding your first truck." action={<button className="btn btn-primary" onClick={openAdd}>+ Add Truck</button>} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Reg No</th><th>Make/Model</th><th>Type</th><th>Capacity</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {trucks.map((t) => (
                <tr key={t._id}>
                  <td><strong>{t.regNumber}</strong></td>
                  <td>{t.make} {t.model} {t.year ? `(${t.year})` : ''}</td>
                  <td>{t.type}</td>
                  <td>{t.capacityTons} tons</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(t._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Edit Truck' : 'Add Truck'}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>}>
        <div className="form-grid">
          <div className="form-field"><label>Reg Number*</label><input value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value })} /></div>
          <div className="form-field"><label>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TRUCK_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-field"><label>Make</label><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
          <div className="form-field"><label>Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div className="form-field"><label>Year</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
          <div className="form-field"><label>Capacity (tons)</label><input type="number" value={form.capacityTons} onChange={(e) => setForm({ ...form, capacityTons: e.target.value })} /></div>
          <div className="form-field"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
      </Modal>
    </AppLayout>
  );
}
