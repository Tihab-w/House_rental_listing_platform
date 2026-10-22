import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function OwnerBookings() {
  const { socketReady } = useAuth();
  const [rows, setRows] = useState([]);

  const load = () => api.get('/bookings/owner').then(r => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, [socketReady]);

  const update = async (id, status) => {
    await api.patch(`/bookings/${id}/status`, { status });
    load();
  };

  const verify = async (paymentId) => {
    await api.patch(`/payments/${paymentId}/verify`);
    load();
  };

  return (
    <div className="container section">
      <h1>Bookings</h1>
      {rows.map(b => (
        <div key={b.id} className="booking-row">
          <img src={b.images?.[0]} alt="" />
          <div className="booking-info">
            <h3>{b.title}</h3>
            <p className="muted">Customer: {b.customer_name} ({b.customer_email})</p>
            <p className="muted">{b.check_in} → {b.check_out} • {b.guests} guests</p>
            <p>Total: <b>${b.total_price}</b> • <span className={`status ${b.status}`}>{b.status}</span></p>
            {b.payment_method && (
              <p>Payment: <span className={`status ${b.payment_status}`}>{b.payment_status}</span> ({b.payment_method})</p>
            )}
          </div>
          <div className="booking-actions">
            {b.status === 'pending' && (
              <>
                <button className="btn-primary" onClick={() => update(b.id, 'confirmed')}>Accept</button>
                <button className="btn-ghost" onClick={() => update(b.id, 'declined')}>Decline</button>
              </>
            )}
            {b.status === 'confirmed' && (
              <button className="btn-ghost" onClick={() => update(b.id, 'completed')}>Mark completed</button>
            )}
            {b.payment_status === 'pending' && b.payment_method === 'bank_transfer' && b.payment_id && (
              <button className="btn-primary" onClick={() => verify(b.payment_id)}>Verify payment</button>
            )}
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="muted">No bookings yet.</p>}
    </div>
  );
}