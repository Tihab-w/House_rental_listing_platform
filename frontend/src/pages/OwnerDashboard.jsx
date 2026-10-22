import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function OwnerDashboard() {
  const { socketReady } = useAuth();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [cleaning, setCleaning] = useState([]);
  const [myProps, setMyProps] = useState([]);
  const [newClean, setNewClean] = useState({ property_id: '', date: '', notes: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, b, c, p] = await Promise.all([
        api.get('/analytics/owner'),
        api.get('/bookings/owner'),
        api.get('/cleaning'),
        api.get('/properties/mine')
      ]);
      setStats(s.data);
      setBookings(b.data);
      setCleaning(c.data);
      setMyProps(p.data);
    } catch (e) {
      console.error('Dashboard load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) load();
    })();
    return () => { cancelled = true; };
  }, [socketReady, load]);

  const addClean = async () => {
    if (!newClean.property_id || !newClean.date) {
      alert('Pick a property and date');
      return;
    }
    try {
      await api.post('/cleaning', newClean);
      setNewClean({ property_id: '', date: '', notes: '' });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to schedule');
    }
  };

  const markCleanDone = async (id) => {
    await api.patch(`/cleaning/${id}`, { status: 'done' });
    load();
  };

  if (loading) return <p>Loading dashboard…</p>;
  if (!stats) return <p className="error">Could not load dashboard.</p>;

  return (
    <div>
      <div className="row-between">
        <h1>Owner Dashboard</h1>
        <Link to="/owner/properties/new" className="btn-primary">+ Add property</Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value">${stats.totalRevenue.toFixed(0)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Bookings</div>
          <div className="kpi-value">{stats.totalBookings}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Occupancy (90d)</div>
          <div className="kpi-value">{stats.occupancyRate}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Avg stay</div>
          <div className="kpi-value">{stats.avgStay} n</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <div className="row-between">
            <h3>Recent bookings</h3>
            <Link to="/owner/bookings" className="link">View all →</Link>
          </div>
          {bookings.length === 0 && <p className="muted">No bookings yet.</p>}
          {bookings.slice(0, 5).map(b => (
            <div key={b.id} className="mini-row">
              <div><b>{b.title}</b> — {b.customer_name}</div>
              <div className="muted">
                {b.check_in} → {b.check_out} • ${b.total_price}
              </div>
              <div>
                <span className={`status ${b.status}`}>{b.status}</span>{' '}
                {b.payment_status && (
                  <span className={`status ${b.payment_status}`}>{b.payment_status}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>Cleaning schedule</h3>
          <div className="clean-form">
            <select
              value={newClean.property_id}
              onChange={e => setNewClean({ ...newClean, property_id: e.target.value })}
            >
              <option value="">Select property…</option>
              {myProps.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <input
              type="date"
              value={newClean.date}
              onChange={e => setNewClean({ ...newClean, date: e.target.value })}
            />
            <input
              placeholder="Notes (optional)"
              value={newClean.notes}
              onChange={e => setNewClean({ ...newClean, notes: e.target.value })}
            />
            <button className="btn-primary" onClick={addClean}>Schedule</button>
          </div>

          {cleaning.length === 0 && <p className="muted">No cleaning tasks scheduled.</p>}

          {cleaning.slice(0, 8).map(c => (
            <div key={c.id} className="mini-row">
              <div><b>{c.title}</b></div>
              <div className="muted">{c.date} • {c.status}</div>
              {c.status === 'scheduled' && (
                <button className="btn-ghost small" onClick={() => markCleanDone(c.id)}>
                  Mark done
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Quick actions</h3>
        <div className="row">
          <Link to="/owner/bookings" className="btn-ghost">Manage bookings</Link>
          <Link to="/owner/properties" className="btn-ghost">My listings</Link>
          <Link to="/owner/analytics" className="btn-ghost">View analytics</Link>
          <Link to="/chat" className="btn-ghost">Open chat</Link>
        </div>
      </div>
    </div>
  );
}