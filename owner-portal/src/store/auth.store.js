import { create } from 'zustand';
import { api } from '../services/api';

const STORAGE_KEY = 'cf_owner_token';

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
      if (user) localStorage.setItem('cf_owner_user', JSON.stringify(user));
    } catch {}
    set({ token, user });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data.data;
      if (data.user.role !== 'TRUCK_OWNER') {
        set({ loading: false, error: 'This portal is for truck owners only. Use the Customer Portal.' });
        return false;
      }
      // Backend sends `accessToken`, map it to `token` for setAuth
      get().setAuth({ token: data.accessToken ?? data.token, user: data.user });
      set({ loading: false });
      return true;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Login failed' });
      return false;
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', { ...payload, role: 'TRUCK_OWNER' });
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
      localStorage.removeItem('cf_owner_user');
    } catch {}
    set({ token: null, user: null });
  },
}));
