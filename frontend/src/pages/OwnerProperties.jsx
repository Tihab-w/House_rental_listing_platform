import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function OwnerProperties() {
  const [rows, setRows] = useState([]);
  const load = () => api.get('/properties/mine').then(r => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm('Delete listing?')) return;
    await api.delete(`/properties/${id}`);
    load();
  };

  return (
    <div className="container section">
      <div className="row-between">
        <h1>My Listings</h1>
        <Link to="/owner/properties/new" className="btn-primary">+ Add property</Link>
      </div>
      <div className="grid">
        {rows.map(p => (
          <div key={p.id} className="card">
            <img src={p.images?.[0]} alt="" />
            <div className="card-body">
              <h3>{p.title}</h3>
              <p className="muted">{p.city}</p>
              <p><b>${p.price_per_night}</b> / night</p>
              <div className="row">
                <Link to={`/owner/properties/${p.id}/edit`} className="btn-ghost">Edit</Link>
                <button className="btn-ghost" onClick={() => del(p.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}