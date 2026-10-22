import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'customer' });
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const u = await register(form);
      nav(u.role === 'owner' ? '/owner' : '/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Register failed');
    }
  };

  return (
    <div className="auth-card">
      <h2>Create account</h2>
      {err && <div className="error">{err}</div>}
      <form onSubmit={submit}>
        <label>Username</label>
        <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <label>Password (min 6)</label>
        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <label>I am a…</label>
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="customer">Customer</option>
          <option value="owner">Property Owner</option>
        </select>
        <button className="btn-primary full">Sign up</button>
      </form>
      <p className="muted">Have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}