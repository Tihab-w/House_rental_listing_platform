import { Link } from 'react-router-dom';

export default function PropertyCard({ p }) {
  const cover = p.images?.[0] || 'https://via.placeholder.com/400x260?text=No+Image';
  const badge = p.avg_rating >= 4.5 ? 'popular' : null;

  return (
    <Link to={`/property/${p.id}`} className="card">
      <div className="card-img-wrap">
        <img src={cover} alt={p.title} />
        {badge === 'popular' && <span className="card-badge popular">Popular</span>}
        <button className="card-heart" onClick={(e) => { e.preventDefault(); }}>♡</button>
      </div>
      <div className="card-body">
        <h3>{p.title}</h3>
        <div className="location">📍 {p.city}{p.country ? `, ${p.country}` : ''}</div>
        <div className="card-price">ETB {p.price_per_night?.toLocaleString()} <span>/month</span></div>
        <div className="card-specs">
          <span>🛏 {p.bedrooms} Beds</span>
          <span>🛁 {p.bathrooms} Baths</span>
          <span>📐 {p.area_sqft || (p.max_guests * 400)} Sq Ft</span>
        </div>
      </div>
    </Link>
  );
}