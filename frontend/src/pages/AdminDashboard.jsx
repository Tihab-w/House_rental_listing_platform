import { useEffect, useState } from 'react';
import api from '../api';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [props, setProps] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [fees, setFees] = useState([]);

  const load = async () => {
    try {
      const [s, u, p, b, f] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/properties'),
        api.get('/admin/bookings'),
        api.get('/admin/fees')
      ]);
      setStats(s.data); setUsers(u.data); setProps(p.data);
      setBookings(b.data); setFees(f.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const verifyFee = async (id) => {
    if (!confirm('Mark this service fee as paid?')) return;
    await api.patch(`/admin/fees/${id}/verify`);
    load();
  };

  if (!stats) return <div className="container section">Loading…</div>;

  return (
    <div className="container section">
      <h1>Admin Dashboard</h1>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Total Users</div><div className="kpi-value">{stats.totalUsers}</div></div>
        <div className="kpi"><div className="kpi-label">Owners</div><div className="kpi-value">{stats.totalOwners}</div></div>
        <div className="kpi"><div className="kpi-label">Customers</div><div className="kpi-value">{stats.totalCustomers}</div></div>
        <div className="kpi"><div className="kpi-label">Properties</div><div className="kpi-value">{stats.totalProps}</div></div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Total Revenue</div><div className="kpi-value">${stats.totalRevenue.toFixed(0)}</div></div>
        <div className="kpi"><div className="kpi-label">Owner Fees</div><div className="kpi-value">${stats.ownerFees.toFixed(0)}</div></div>
        <div className="kpi"><div className="kpi-label">Customer Fees</div><div className="kpi-value">${stats.customerFees.toFixed(0)}</div></div>
        <div className="kpi"><div className="kpi-label">Pending</div><div className="kpi-value">{stats.pendingFees}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '24px 0', flexWrap: 'wrap' }}>
        <button className={`btn-${tab === 'overview' ? 'primary' : 'ghost'}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`btn-${tab === 'users' ? 'primary' : 'ghost'}`} onClick={() => setTab('users')}>Users ({users.length})</button>
        <button className={`btn-${tab === 'props' ? 'primary' : 'ghost'}`} onClick={() => setTab('props')}>Properties ({props.length})</button>
        <button className={`btn-${tab === 'bookings' ? 'primary' : 'ghost'}`} onClick={() => setTab('bookings')}>Bookings ({bookings.length})</button>
        <button className={`btn-${tab === 'fees' ? 'primary' : 'ghost'}`} onClick={() => setTab('fees')}>Service Fees ({fees.length})</button>
      </div>

      {tab === 'overview' && (
        <div className="dash-grid">
          <div className="panel">
            <h3>Booking status</h3>
            {stats.bookingStatus.map(s => (
              <div key={s.status} className="mini-row">
                <span className={`status ${s.status}`}>{s.status}</span>
                <b style={{ float: 'right' }}>{s.c}</b>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3>Monthly revenue</h3>
            {stats.monthlyRevenue.length === 0 && <p className="muted">No revenue yet.</p>}
            {stats.monthlyRevenue.map(m => (
              <div key={m.month} className="mini-row">
                <span>{m.month}</span>
                <b style={{ float: 'right' }}>${m.amount.toFixed(0)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="panel">
          <h3>All Users</h3>
          {users.map(u => (
            <div key={u.id} className="mini-row">
              <b>{u.username}</b> — {u.email} • <span className="status completed">{u.role}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'props' && (
        <div className="panel">
          <h3>All Properties</h3>
          {props.map(p => (
            <div key={p.id} className="mini-row">
              <b>{p.title}</b> — {p.city} • ${p.price_per_night}/night • by {p.owner_name} • <span className={`status ${p.status === 'available' ? 'confirmed' : 'pending'}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="panel">
          <h3>All Bookings</h3>
          {bookings.map(b => (
            <div key={b.id} className="mini-row">
              <b>#{b.id} {b.property_title}</b> — {b.customer_name} → {b.owner_name}
              <div className="muted">
                {b.check_in} → {b.check_out} • ${b.total_price} • <span className={`status ${b.status}`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'fees' && (
        <div className="panel">
          <h3>Service Fees</h3>
          {fees.map(f => (
            <div key={f.id} className="mini-row">
              <b>{f.username}</b> ({f.role}) — {f.amount} ETB • {f.method} • <span className={`status ${f.status}`}>{f.status}</span>
              <div className="muted">Ref: {f.transaction_ref} • {new Date(f.created_at).toLocaleString()}</div>
              {f.status === 'pending' && (
                <button className="btn-primary" style={{ marginTop: 6 }} onClick={() => verifyFee(f.id)}>Verify</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}