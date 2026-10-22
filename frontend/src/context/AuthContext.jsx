import { useEffect, useState } from 'react';
import api from '../api';
import { connectSocket, disconnectSocket } from '../socket';
import { AuthCtx } from './AuthCtx';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socketReady, setSocketReady] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    api.get('/auth/me')
      .then(r => { if (!cancelled) setUser(r.data); })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) { disconnectSocket(); setNotifications([]); return; }
    const s = connectSocket();
    if (!s) return;
    const onNotif = (n) => setNotifications(prev => [n, ...prev]);
    s.on('notification', onNotif);
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
    const t = setTimeout(() => setSocketReady(v => v + 1), 0);
    return () => { clearTimeout(t); s.off('notification', onNotif); };
  }, [user]);

  const login = async (identifier, password) => {
    const r = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (payload) => {
    const r = await api.post('/auth/register', payload);
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    disconnectSocket();
    setUser(null);
    setNotifications([]);
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AuthCtx.Provider
      value={{
        user, loading, login, register, logout,
        notifications, markAllRead, unreadCount, socketReady
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}