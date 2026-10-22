import { Link } from 'react-router-dom';

export default function PropertyCard({ p }) {
  const cover = p.images?.[0] || 'https://via.placeholder.com/400x260?text=No+Image';
  const badge = p.avg_rating >= 4.5 ? 'popular' : (Math.random() > 0.7 ? 'new' : null);

  return (
    <Link to={`/property/${p.id}`} className="card">
      <div className="card-img-wrap">
        <img src={cover} alt={p.title} />
        {badge === 'popular' && <span className="card-badge popular">Popular</span>}
        {badge === 'new' && <span className="card-badge new">New</span>}
        <button className="card-heart" onClick={(e) => { e.preventDefault(); }}>
          ♡
        </button>
      </div>

      <div className="card-body">
        <h3>{p.title}</h3>
        <div className="location">
          📍 {p.city}{p.country ? `, ${p.country}` : ''}
        </div>

        <div className="card-price">
          ${p.price_per_night} <span>/mo</span>
        </div>

        <div className="card-specs">
          <span>🛏 {p.bedrooms} Beds</span>
          <span>🛁 {p.bathrooms} Baths</span>
          <span>📐 {p.max_guests * 400} Sq Ft</span>
        </div>
      </div>
    </Link>
  );
}