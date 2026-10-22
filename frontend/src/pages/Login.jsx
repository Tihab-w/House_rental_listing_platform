import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const u = await login(form.identifier, form.password);
      nav(u.role === 'owner' ? '/owner' : '/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="container section">
      <h2>Welcome back</h2>
      {err && <div className="error">{err}</div>}
      <form onSubmit={submit}>
        <label>Email or Username</label>
        <input value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <button className="btn-primary full">Login</button>
      </form>
      <p className="muted">No account? <Link to="/register">Sign up</Link></p>
      <div className="demo-box">
        <b>Demo logins (password: 123456)</b>
        <div>Owner: john@demo.com</div>
        <div>Customer: alice@demo.com</div>
      </div>
    </div>
  );
}