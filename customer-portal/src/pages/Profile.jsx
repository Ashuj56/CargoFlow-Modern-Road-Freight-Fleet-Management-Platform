import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { AppLayout } from '../components/AppLayout';
import { customerNav } from '../navigation';
import { api, extractError } from '../services/api';
import { Loading } from '../components/ui';
import { toast } from '../store/toast.store';

export default function Profile() {
  const { user } = useAuthStore();
  const [me, setMe] = useState(null);
  const [cp, setCp] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/me');
        setMe(res.data.data.user);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    if (cp.newPassword.length < 8) return toast('New password must be at least 8 characters', 'error');
    if (cp.newPassword !== cp.confirm) return toast('Passwords do not match', 'error');
    setSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword: cp.currentPassword, newPassword: cp.newPassword });
      toast('Password changed successfully', 'success');
      setCp({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(extractError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!me) return <AppLayout nav={customerNav} title="Profile" subtitle={user?.name}><Loading /></AppLayout>;

  return (
    <AppLayout nav={customerNav} title="Profile" subtitle={user?.name}>
      <div className="two-col">
        <div className="card">
          <h4>Account Information</h4>
          <table className="data-table">
            <tbody>
              <tr><td><strong>Name</strong></td><td>{me.name}</td></tr>
              <tr><td><strong>Email</strong></td><td>{me.email}</td></tr>
              <tr><td><strong>Role</strong></td><td>{me.role}</td></tr>
              <tr><td><strong>Member Since</strong></td><td>{me.createdAt ? new Date(me.createdAt).toLocaleDateString('en-IN') : '—'}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h4>Change Password</h4>
          <form onSubmit={changePassword}>
            <div className="form-field mb-2">
              <label>Current Password</label>
              <input type="password" required value={cp.currentPassword} onChange={(e) => setCp({ ...cp, currentPassword: e.target.value })} />
            </div>
            <div className="form-field mb-2">
              <label>New Password</label>
              <input type="password" required value={cp.newPassword} onChange={(e) => setCp({ ...cp, newPassword: e.target.value })} />
            </div>
            <div className="form-field mb-2">
              <label>Confirm New Password</label>
              <input type="password" required value={cp.confirm} onChange={(e) => setCp({ ...cp, confirm: e.target.value })} />
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Change Password'}</button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
