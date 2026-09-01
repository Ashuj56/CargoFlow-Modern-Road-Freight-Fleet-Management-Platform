import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../store/toast.store';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const { login, register, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '', phone: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    let ok = false;
    if (mode === 'login') {
      ok = await login(form.email, form.password);
      if (ok) { toast('Welcome back, Operator!', 'success'); navigate('/dashboard'); }
    } else {
      if (form.password.length < 8) return toast('Password must be at least 8 characters', 'error');
      ok = await register({ name: form.name, email: form.email, password: form.password, companyName: form.companyName, phone: form.phone });
      if (ok) { toast('Fleet account created!', 'success'); navigate('/dashboard'); }
    }
  };

  return (
    <div className="auth-wrap" style={{ background: 'linear-gradient(135deg,#060E1A 0%,#0A1628 100%)' }}>
      <div className="auth-card">
        <div className="brand" style={{ fontSize: '1.2rem' }}>CARGOFLOW <span style={{ color: 'var(--orange)' }}>OPERATIONS</span></div>

        <div className="auth-toggle">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>

        {error && <div className="card mb-2" style={{ background: '#FEF2F2', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={submit}>
            <div className="form-field mb-2"><label>Email</label><input type="email" required value={form.email} onChange={set('email')} /></div>
            <div className="form-field mb-2"><label>Password</label><input type="password" required value={form.password} onChange={set('password')} /></div>
            <button className="btn btn-dark btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
          </form>
        ) : (
          <form onSubmit={submit}>
            <div className="form-field mb-2"><label>Full Name</label><input type="text" required value={form.name} onChange={set('name')} /></div>
            <div className="form-field mb-2"><label>Company / Fleet Name</label><input type="text" required value={form.companyName} onChange={set('companyName')} /></div>
            <div className="form-field mb-2"><label>Phone</label><input type="text" value={form.phone} onChange={set('phone')} /></div>
            <div className="form-field mb-2"><label>Email</label><input type="email" required value={form.email} onChange={set('email')} /></div>
            <div className="form-field mb-2"><label>Password</label><input type="password" required value={form.password} onChange={set('password')} /></div>
            <button className="btn btn-dark btn-lg" style={{ width: '100%' }} disabled={loading}>{loading ? 'Creating...' : 'Create Fleet Account'}</button>
          </form>
        )}

        <div className="mt-2 text-muted" style={{ fontSize: '0.8rem', textAlign: 'center' }}>
          Are you a customer? <a href="http://localhost:3000">Go to Customer Portal →</a>
        </div>
      </div>
    </div>
  );
}
