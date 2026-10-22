import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  return (
    <div className="bell-wrap">
      <button className="bell" onClick={() => setOpen(o => !o)}>
        🔔{unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown" onMouseLeave={() => setOpen(false)}>
          <div className="notif-head">
            <b>Notifications</b>
            <button onClick={markAllRead} className="link">Mark all read</button>
          </div>
          {notifications.length === 0 && <p className="muted">No notifications</p>}
          {notifications.slice(0, 15).map(n => (
            <div
              key={n.id}
              className={`notif-item ${n.is_read ? '' : 'unread'}`}
              onClick={() => { setOpen(false); n.link && nav(n.link); }}
            >
              <div className="notif-title">{n.title}</div>
              <div className="notif-body">{n.body}</div>
              <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}