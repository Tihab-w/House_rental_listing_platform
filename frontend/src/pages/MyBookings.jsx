import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function MyBookings() {
  const { socketReady } = useAuth();
  const [rows, setRows] = useState([]);

  const load = () => api.get('/bookings/mine').then(r => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, [socketReady]);

  const cancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    await api.patch(`/bookings/${id}/cancel`);
    load();
  };

  return (
    <div className="container section">
      <h1>My Bookings</h1>
      {rows.length === 0 && <p className="muted">No bookings yet.</p>}
      {rows.map(b => (
        <div key={b.id} className="booking-row">
          <img src={b.images?.[0]} alt="" />
          <div className="booking-info">
            <h3>{b.title}</h3>
            <p className="muted">{b.check_in} → {b.check_out} • Guests {b.guests}</p>
            <p>Total: <b>${b.total_price}</b> • Owner: {b.owner_name}</p>
            <p>Status: <span className={`status ${b.status}`}>{b.status}</span>
              {b.payment_status && <> • Payment: <span className={`status ${b.payment_status}`}>{b.payment_status}</span></>}
            </p>
          </div>
          <div className="booking-actions">
            {(!b.payment_status || b.payment_status === 'failed') && b.status !== 'cancelled' && (
              <Link className="btn-primary" to={`/checkout/${b.id}`}>Pay now</Link>
            )}
            {!['cancelled', 'completed'].includes(b.status) && (
              <button className="btn-ghost" onClick={() => cancel(b.id)}>Cancel</button>
            )}
            <Link className="btn-ghost" to={`/chat/${b.owner_id}`}>Chat</Link>
          </div>
        </div>
      ))}
    </div>
  );
}