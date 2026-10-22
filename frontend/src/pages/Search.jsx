import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import PropertyCard from '../components/PropertyCard';

export default function Search() {
  const [params] = useSearchParams();
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: params.get('city') || '',
    q: params.get('q') || '',
    min: params.get('min') || '',
    max: params.get('max') || '',
    guests: params.get('guests') || ''
  });

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v)
    ).toString();
    api.get(`/properties?${q}`)
      .then(r => setProps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const headline = filters.q || filters.city || 'all areas';

  return (
    <div className="container section">
      <h1>Properties in {headline}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {props.length} result{props.length !== 1 && 's'} — sorted by best match
      </p>

      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <input
          placeholder="City"
          value={filters.city}
          onChange={e => setFilters({ ...filters, city: e.target.value })}
        />
        <input
          placeholder="Keyword (title, neighborhood)"
          value={filters.q}
          onChange={e => setFilters({ ...filters, q: e.target.value })}
        />
        <input
          placeholder="Min $"
          type="number"
          value={filters.min}
          onChange={e => setFilters({ ...filters, min: e.target.value })}
        />
        <input
          placeholder="Max $"
          type="number"
          value={filters.max}
          onChange={e => setFilters({ ...filters, max: e.target.value })}
        />
        <input
          placeholder="Guests"
          type="number"
          value={filters.guests}
          onChange={e => setFilters({ ...filters, guests: e.target.value })}
        />
        <button className="btn-primary" onClick={load}>Search</button>
      </div>

      {loading && <p className="muted">Searching…</p>}

      {!loading && props.length === 0 && (
        <p className="muted">
          No matching properties found. Try relaxing your filters.
        </p>
      )}

      <div className="grid">
        {props.map(p => <PropertyCard key={p.id} p={p} />)}
      </div>

      <div style={{ marginTop: 32 }}>
        <Link to="/" className="btn-ghost">← Back to Home</Link>
      </div>
    </div>
  );
}