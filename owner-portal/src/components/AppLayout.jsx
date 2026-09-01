import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { getSocket, disconnectSocket } from '../services/socket';
import { useToastStore } from '../store/toast.store';

export function AppLayout({ children, nav, title, subtitle, actions, notifications = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { toasts, push } = useToastStore();

  useEffect(() => {
    try {
      const socket = getSocket();
      socket.on('request:new', (data) => {
        push(`New request: ${data.route} (${data.cargoType})`, 'info');
      });
      socket.on('quotation:response', (data) => {
        push(`Customer ${data.status} your quotation`, data.status === 'accepted' ? 'success' : 'info');
      });
      return () => {
        socket.off('request:new');
        socket.off('quotation:response');
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

  const initials = (user?.name || 'O')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          CARGOFLOW <span className="accent">OPERATIONS</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <a key={item.to} className={active ? 'active' : ''} onClick={() => navigate(item.to)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.to === '/requests' && notifications > 0 && (
                  <span className="badge b-quoted" style={{ marginLeft: 'auto' }}>{notifications}</span>
                )}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-footer" style={{ cursor: 'pointer' }} onClick={handleLogout}>
          {user?.name} — Sign out
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="notif-bell" onClick={() => push('Notifications', 'info')} style={{ color: 'var(--text-muted)' }}>
            🔔
            {notifications > 0 && <span className="dot">{notifications}</span>}
          </div>
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
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}
