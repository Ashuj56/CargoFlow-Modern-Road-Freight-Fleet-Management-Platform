import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../store/toast.store';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const { login, register, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    gstNumber: '',
    confirmError: '',
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    let ok = false;
    if (mode === 'login') {
      ok = await login(form.email, form.password);
      if (ok) {
        toast('Welcome back!', 'success');
        navigate('/dashboard');
      }
    } else {
      if (form.password.length < 8) {
        setForm({ ...form, confirmError: 'Password must be at least 8 characters' });
        return;
      }
      ok = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        gstNumber: form.gstNumber,
      });
      if (ok) {
        toast('Account created! Welcome to CargoFlow.', 'success');
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          CARGO<span style={{ color: 'var(--orange)' }}>FLOW</span>
        </div>

        <div className="auth-toggle">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>

        {error && <div className="card" style={{ background: '#FEF2F2', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleSubmit}>
            <div className="form-field mb-2">
              <label>Email</label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" />
            </div>
            <div className="form-field mb-2">
              <label>Password</label>
              <input type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
              <a href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-field mb-2">
              <label>Full Name</label>
              <input type="text" required value={form.name} onChange={set('name')} placeholder="John Doe" />
            </div>
            <div className="form-field mb-2">
              <label>Company Name</label>
              <input type="text" value={form.companyName} onChange={set('companyName')} placeholder="Acme Corp" />
            </div>
            <div className="form-field mb-2">
              <label>Email</label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" />
            </div>
            <div className="form-field mb-2">
              <label>GST Number (optional)</label>
              <input type="text" value={form.gstNumber} onChange={set('gstNumber')} placeholder="27AAAAA0000A1Z5" />
            </div>
            <div className="form-field mb-2">
              <label>Password</label>
              <input type="password" required value={form.password} onChange={set('password')} placeholder="Min 8 characters" />
            </div>
            {form.confirmError && <div className="form-error mb-2">{form.confirmError}</div>}
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Customer Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
