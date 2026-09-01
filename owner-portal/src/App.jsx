import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Trucks from './pages/Trucks';
import Drivers from './pages/Drivers';
import Requests from './pages/Requests';
import RequestDetail from './pages/RequestDetail';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import LiveTracking from './pages/LiveTracking';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Reports from './pages/Reports';

function Protected({ children }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/fleet/trucks" element={<Protected><Trucks /></Protected>} />
      <Route path="/fleet/drivers" element={<Protected><Drivers /></Protected>} />
      <Route path="/requests" element={<Protected><Requests /></Protected>} />
      <Route path="/requests/:id" element={<Protected><RequestDetail /></Protected>} />
      <Route path="/shipments" element={<Protected><Shipments /></Protected>} />
      <Route path="/shipments/:id" element={<Protected><ShipmentDetail /></Protected>} />
      <Route path="/tracking" element={<Protected><LiveTracking /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/payments" element={<Protected><Payments /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
