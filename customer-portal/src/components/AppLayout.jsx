import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { getSocket, disconnectSocket } from '../services/socket';
import { useToastStore } from '../store/toast.store';
import { StatusBadge } from './ui';

export function AppLayout({ children, nav, title, subtitle, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { toasts, push } = useToastStore();

  useEffect(() => {
    try {
      const socket = getSocket();
      socket.on('shipment:status', (data) => {
        push(`Shipment ${data.trackingRef || ''} → ${data.newStatus}`, 'info');
      });
      socket.on('quotation:received', (data) => {
        push(`New quotation received: ₹${data?.totalAmountINR?.toLocaleString('en-IN')}`, 'info');
      });
      return () => {
        socket.off('shipment:status');
        socket.off('quotation:received');
      };
    } catch {
      return undefined;
    }
  }, [push]);

  const handleLogout = async () => {
    disconnectSocket();
    await logout();
    navigate('/login');
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          CARGO<span className="accent">FLOW</span>
        </div>
        <nav className="sidebar-nav" onClick={(e) => e.stopPropagation()}>
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <a key={item.to} className={active ? 'active' : ''} onClick={() => navigate(item.to)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-footer" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          Sign out
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div style={{ flex: 1 }} />
          <div className="user-chip">
            <span className="text-muted">{user?.name}</span>
            <div className="avatar">{initials}</div>
          </div>
        </header>

        {title && (
          <div className="page-header">
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="flex gap-1">{actions}</div>}
          </div>
        )}

        <div className="fade">{children}</div>
      </div>

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export { StatusBadge };
