import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  const token = useAuthStore.getState().token;
  socket = io(url, { auth: { token }, transports: ['websocket', 'polling'] });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinShipmentRoom(shipmentId) {
  const s = getSocket();
  if (s) s.emit('join:shipment', shipmentId);
}

export function leaveShipmentRoom(shipmentId) {
  const s = getSocket();
  if (s) s.emit('leave:shipment', shipmentId);
}
