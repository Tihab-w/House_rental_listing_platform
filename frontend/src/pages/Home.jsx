import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import PropertyCard from '../components/PropertyCard';

const HERO_IMG = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400';

const NEIGHBORHOODS = [
  {
    name: 'Bole',
    city: 'Addis Ababa',
    from: 55,
    img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600'
  },
  {
    name: 'Kazanchis',
    city: 'Addis Ababa',
    from: 80,
    img: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600'
  },
  {
    name: 'Lake Side',
    city: 'Hawassa',
    from: 30,
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600'
  },
  {
    name: 'Tana Ave',
    city: 'Bahir Dar',
    from: 65,
    img: 'https://images.unsplash.com/photo-1543872084-c7bd3822856f?w=600'
  }
];

export default function Home() {
  const nav = useNavigate();
  const [props, setProps] = useState([]);
  const [filters, setFilters] = useState({ city: '', min: '', max: '', guests: '' });

  const load = () => {
    const q = new URLSearchParams(filters).toString();
    api.get(`/properties?${q}`)
      .then(r => setProps(r.data))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const search = () => {
    const q = new URLSearchParams(filters).toString();
    nav(`/search?${q}`);
  };

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <div>
              <h1>
                Find Your<br />
                Perfect Apartment
                <span className="accent">Live. Comfortably.</span>
              </h1>
              <p className="lead">
                Discover modern apartments in prime locations that fit your
                lifestyle and budget — book directly with verified owners.
              </p>
              <div className="hero-cta">
                <a href="#featured" className="btn-dark">Browse Apartments →</a>
                <a href="#how" className="btn-ghost">How It Works ▷</a>
              </div>
            </div>
            <img className="hero-image" src={HERO_IMG} alt="Apartment interior" />
          </div>
        </div>
      </section>

      {/* ============ SEARCH BAR ============ */}
      <div className="container">
        <div className="search-bar">
          <div className="search-field">
            <label>Location</label>
            <input
              placeholder="City, Neighborhood..."
              value={filters.city}
              onChange={e => setFilters({ ...filters, city: e.target.value })}
            />
          </div>
          <div className="search-field">
            <label>Min Price</label>
            <input
              type="number"
              placeholder="$0"
              value={filters.min}
              onChange={e => setFilters({ ...filters, min: e.target.value })}
            />
          </div>
          <div className="search-field">
            <label>Max Price</label>
            <input
              type="number"
              placeholder="$5000+"
              value={filters.max}
              onChange={e => setFilters({ ...filters, max: e.target.value })}
            />
          </div>
          <div className="search-field">
            <label>Guests</label>
            <input
              type="number"
              placeholder="Any"
              value={filters.guests}
              onChange={e => setFilters({ ...filters, guests: e.target.value })}
            />
          </div>
          <div className="search-field" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-primary" onClick={search}>🔍 Search</button>
          </div>
        </div>
      </div>

      {/* ============ FEATURES ============ */}
      <div className="container" id="how">
        <div className="features">
          <div className="feature">
            <div className="feature-icon">✅</div>
            <h4>Verified Listings</h4>
            <p>All apartments are verified for a safe rental experience.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔒</div>
            <h4>Trusted & Secure</h4>
            <p>Secure payments and data protection on every booking.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🎧</div>
            <h4>Support 24/7</h4>
            <p>Our team is here to help you anytime.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">❤️</div>
            <h4>Loved by Residents</h4>
            <p>Thousands of happy renters and counting.</p>
          </div>
        </div>
      </div>

      {/* ============ FEATURED APARTMENTS ============ */}
      <section className="container section" id="featured">
        <div className="section-head">
          <h2>Featured Apartments</h2>
          <Link to="/search">View All Apartments →</Link>
        </div>
        <div className="grid">
          {props.slice(0, 8).map(p => <PropertyCard key={p.id} p={p} />)}
          {props.length === 0 && <p className="muted">No properties found.</p>}
        </div>
      </section>

      {/* ============ DARK CTA BANNER ============ */}
      <div className="container">
        <div className="cta-banner">
          <div>
            <h2>Find the Perfect Space<br />That Feels Like Home</h2>
            <p>
              Explore modern amenities, great locations,<br />
              and flexible lease options.
            </p>
            <Link to="/search" className="btn-primary">Explore Now →</Link>
          </div>
          <div className="cta-perks">
            <div className="cta-perk">
              <div className="icon">🏢</div>
              <small>Modern Amenities</small>
            </div>
            <div className="cta-perk">
              <div className="icon">📍</div>
              <small>Prime Locations</small>
            </div>
            <div className="cta-perk">
              <div className="icon">📋</div>
              <small>Flexible Leases</small>
            </div>
          </div>
        </div>
      </div>

      {/* ============ NEIGHBORHOODS ============ */}
      <section className="container section">
        <div className="section-head">
          <h2>Explore by Neighborhood</h2>
          <Link to="/search">View All Neighborhoods →</Link>
        </div>
        <div className="neighborhoods">
          {NEIGHBORHOODS.map(n => (
            <div
              key={n.name}
              className="neighborhood"
              onClick={() => nav(`/search?city=${encodeURIComponent(n.city)}&q=${encodeURIComponent(n.name)}`)}
              style={{ cursor: 'pointer' }}
            >
              <img src={n.img} alt={n.name} />
              <div className="neighborhood-overlay">
                <b>{n.name}</b>
                <small>{n.city}</small>
                <small>From ${n.from}/night</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ NEWSLETTER ============ */}
      <div className="container">
        <div className="newsletter">
          <div className="newsletter-icon">✉️</div>
          <div>
            <h4>Stay Updated</h4>
            <p>Subscribe to get the latest listings, exclusive deals & more.</p>
          </div>
          <form onSubmit={e => e.preventDefault()}>
            <input type="email" placeholder="Enter your email address" />
            <button className="btn-primary" type="submit">Subscribe</button>
          </form>
        </div>
      </div>
    </div>
  );
}