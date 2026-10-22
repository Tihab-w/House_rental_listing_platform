import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <>
      {/* Top utility bar */}
      <div className="top-bar">
        <div className="container">
          <div className="info">
            <span>🏠 1200+ Apartments Listed</span>
            <span>⭐ 4.8/5 Ratings From Our Residents</span>
          </div>
          <div className="info">
            <span>📞 (800) 123-4567</span>
            {!user && <Link to="/login">Sign In / Register</Link>}
            {user && <span>👤 {user.username}</span>}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="brand">
            🏠 Rent<span>Ease</span>
          </Link>

          <div className="nav-links">
            <Link to="/">Home</Link>
            {user?.role === 'customer' && <Link to="/bookings">My Bookings</Link>}
            {user?.role === 'owner' && <Link to="/owner">Dashboard</Link>}
            {user?.role === 'owner' && <Link to="/owner/properties">My Listings</Link>}
            {user?.role === 'owner' && <Link to="/owner/bookings">Bookings</Link>}
            {user?.role === 'owner' && <Link to="/owner/analytics">Analytics</Link>}
            {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
            {user && <Link to="/chat">Chat</Link>}
          </div>

          <div className="nav-links">
            {user ? (
              <>
                <NotificationBell />
                <button className="btn-ghost" onClick={() => { logout(); nav('/'); }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Sign In</Link>
                <Link to="/register" className="btn-primary">List Your Property</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}