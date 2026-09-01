import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: apiURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const { response } = err;
    if (response && response.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export function extractError(err) {
  if (err.response && err.response.data && err.response.data.message) {
    return err.response.data.message;
  }
  return err.message || 'Something went wrong';
}
