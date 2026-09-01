import { create } from 'zustand';
import { api } from '../services/api';

const STORAGE_KEY = 'cf_customer_token';

function readToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = create((set, get) => ({
  token: readToken(),
  user: null,
  loading: false,
  error: null,

  setAuth: ({ token, user }) => {
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {}
    set({ token, user });
    if (user) {
      try {
        localStorage.setItem('cf_customer_user', JSON.stringify(user));
      } catch {}
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      // Debug: log raw response to identify exact shape
      console.log('[auth] login raw response:', res.data);
      const data = res.data.data ?? res.data; // handle both { data: {...} } and flat shapes
      const user = data.user ?? data;
      console.log('[auth] resolved user:', user, 'token:', data.token ?? data.accessToken);
      // Only allow customers into this portal
      if (user?.role && user.role !== 'CUSTOMER') {
        set({ loading: false, error: 'This portal is for customers only. Use the Owner Portal.' });
        return false;
      }
      // Normalise token field (some backends use accessToken)
      const token = data.token ?? data.accessToken;
      if (!token) {
        set({ loading: false, error: `Login succeeded but no token received. Response shape: ${JSON.stringify(Object.keys(res.data))}` });
        return false;
      }
      get().setAuth({ token, user });
      set({ loading: false });
      return true;
    } catch (err) {
      console.error('[auth] login error:', err);
      set({ loading: false, error: err.response?.data?.message || 'Login failed' });
      return false;
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', { ...payload, role: 'CUSTOMER' });
      const data = res.data.data;
      // Backend sends `accessToken`, map it to `token` for setAuth
      get().setAuth({ token: data.accessToken ?? data.token, user: data.user });
      set({ loading: false });
      return true;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Registration failed' });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('cf_customer_user');
    } catch {}
    set({ token: null, user: null });
  },

  restoreUser: () => {
    const cached = readToken();
    const storedUser = get().user;
    return { token: cached, user: storedUser };
  },
}));
