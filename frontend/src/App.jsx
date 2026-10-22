import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/useAuth';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import PropertyDetail from './pages/PropertyDetail';
import Checkout from './pages/Checkout';
import MyBookings from './pages/MyBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerBookings from './pages/OwnerBookings';
import OwnerProperties from './pages/OwnerProperties';
import AddProperty from './pages/AddProperty';
import Analytics from './pages/Analytics';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: '#8b93a5' }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        {/* ---- Public ---- */}
        <Route
          path="/login"
          element={
            user
              ? <Navigate to={user.role === 'owner' ? '/owner' : user.role === 'admin' ? '/admin' : '/'} replace />
              : <Login />
          }
        />
        <Route
          path="/register"
          element={
            user
              ? <Navigate to={user.role === 'owner' ? '/owner' : '/'} replace />
              : <Register />
          }
        />

        {/* ---- Logged-in users ---- */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/checkout/:bookingId" element={<Checkout />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:userId" element={<Chat />} />
        </Route>

        {/* ---- Owner only ---- */}
        <Route element={<ProtectedRoute role="owner" />}>
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/bookings" element={<OwnerBookings />} />
          <Route path="/owner/properties" element={<OwnerProperties />} />
          <Route path="/owner/properties/new" element={<AddProperty />} />
          <Route path="/owner/properties/:id/edit" element={<AddProperty />} />
          <Route path="/owner/analytics" element={<Analytics />} />
        </Route>

        {/* ---- Admin only ---- */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* ---- Fallback ---- */}
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
      <Footer />
    </>
  );
}