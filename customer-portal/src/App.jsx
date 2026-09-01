import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import RequestShipment from './pages/RequestShipment';
import Requests from './pages/Requests';
import RequestDetail from './pages/RequestDetail';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import TrackShipment from './pages/TrackShipment';
import PublicTrack from './pages/PublicTrack';
import Quotations from './pages/Quotations';
import Payments from './pages/Payments';
import DocumentsPage from './pages/DocumentsPage';
import Profile from './pages/Profile';

function Protected({ children }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/public/:ref" element={<PublicTrack />} />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/request"
        element={
          <Protected>
            <RequestShipment />
          </Protected>
        }
      />
      <Route
        path="/requests"
        element={
          <Protected>
            <Requests />
          </Protected>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <Protected>
            <RequestDetail />
          </Protected>
        }
      />
      <Route
        path="/shipments"
        element={
          <Protected>
            <Shipments />
          </Protected>
        }
      />
      <Route
        path="/shipments/:id"
        element={
          <Protected>
            <ShipmentDetail />
          </Protected>
        }
      />
      <Route
        path="/tracking/:id"
        element={
          <Protected>
            <TrackShipment />
          </Protected>
        }
      />
      <Route
        path="/quotations"
        element={
          <Protected>
            <Quotations />
          </Protected>
        }
      />
      <Route
        path="/payments"
        element={
          <Protected>
            <Payments />
          </Protected>
        }
      />
      <Route
        path="/documents"
        element={
          <Protected>
            <DocumentsPage />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
