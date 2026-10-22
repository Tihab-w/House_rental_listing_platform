import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function PropertyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  
  const [p, setP] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);
  const [range, setRange] = useState({ check_in: '', check_out: '', guests: 1 });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    // Fetch property details AND booked dates
    Promise.all([
      api.get(`/properties/${id}`),
      api.get(`/bookings/availability/${id}`)
    ]).then(([propRes, datesRes]) => {
      setP(propRes.data);
      setBookedDates(datesRes.data);
    })
    .catch(() => setErr('Property not found'))
    .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container section">Loading…</div>;
  if (!p) return <div className="container section"><div className="error">{err}</div></div>;

  // Check if selected dates overlap with existing bookings
  const hasOverlap = () => {
    if (!range.check_in || !range.check_out) return false;
    return bookedDates.some(b => {
      // standard overlap check
      return (range.check_in < b.check_out && range.check_out > b.check_in);
    });
  };

  const isOverlapping = hasOverlap();

  const nights = range.check_in && range.check_out && !isOverlapping
    ? Math.max(0, Math.ceil((new Date(range.check_out) - new Date(range.check_in)) / 86400000))
    : 0;
  
  // Calculate the split (Admin 5%, Owner 95%)
  const subtotal = nights * p.price_per_night;
  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100; // Goes to Admin
  const ownerRent = subtotal - serviceFee;                    // Goes to Owner
  const total = subtotal + serviceFee;                        // Total customer pays

  const book = async () => {
    setErr('');
    if (!user) return nav('/login');
    if (user.role !== 'customer') return setErr('Only customers can book properties.');
    if (!range.check_in || !range.check_out) return setErr('Please select check-in and check-out dates.');
    if (new Date(range.check_in) >= new Date(range.check_out)) return setErr('Check-out must be after check-in.');
    if (isOverlapping) return setErr('The house is already taken for these dates. Please select other dates or find another house.');

    try {
      const r = await api.post('/bookings', { 
        property_id: p.id,
        check_in: range.check_in,
        check_out: range.check_out,
        guests: Number(range.guests)
      });
      
      nav(`/checkout/${r.data.booking.id}`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Booking failed.');
    }
  };

  const contact = async () => {
    if (!user) return nav('/login');
    const text = prompt('Message to owner:');
    if (!text) return;
    try {
      await api.post('/messages', { receiver_id: p.owner_id, content: text, property_id: p.id });
      nav(`/chat/${p.owner_id}`);
    } catch (e) {
      alert('Failed to send message');
    }
  };

  return (
    <div className="container section">
      <div className="gallery">
        <img src={p.images[imgIndex]} alt="" className="main-img" />
        <div className="thumbs">
          {p.images.map((src, i) => (
            <img key={i} src={src} alt="" className={i === imgIndex ? 'active' : ''} onClick={() => setImgIndex(i)} />
          ))}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <h1>{p.title}</h1>
          <p className="muted">📍 {p.address}, {p.neighborhood}, {p.city}</p>
          
          <div className="chips" style={{ marginTop: 16 }}>
            <span className="chip">🛏 {p.bedrooms} bedrooms</span>
            <span className="chip">🛁 {p.bathrooms} bathrooms</span>
            <span className="chip">👥 up to {p.max_guests} guests</span>
            <span className="chip">📐 {p.area_sqft} sqft</span>
          </div>

          <h3 style={{ marginTop: 24 }}>Description</h3>
          <p>{p.description}</p>

          <h3 style={{ marginTop: 24 }}>Amenities</h3>
          <div className="chips">
            {p.amenities.map(a => <span key={a} className="chip">{a}</span>)}
          </div>
        </div>

        <aside className="booking-box">
          <div className="price">${p.price_per_night} <span className="muted">/ night</span></div>
          
          {/* Show already booked dates */}
          {bookedDates.length > 0 && (
            <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
              <b>Booked Dates (Unavailable):</b>
              <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                {bookedDates.map((b, i) => (
                  <li key={i}>{b.check_in} to {b.check_out}</li>
                ))}
              </ul>
            </div>
          )}

          {err && <div className="error">{err}</div>}
          {isOverlapping && (
            <div className="error" style={{ fontWeight: 600 }}>
              ⚠️ The house is taken up to your selected dates. Please select other dates or find another house.
            </div>
          )}
          
          <label>Check-in</label>
          <input type="date" value={range.check_in} onChange={e => setRange({ ...range, check_in: e.target.value })} />
          
          <label>Check-out</label>
          <input type="date" value={range.check_out} onChange={e => setRange({ ...range, check_out: e.target.value })} />
          
          <label>Guests</label>
          <input type="number" min="1" max={p.max_guests} value={range.guests} onChange={e => setRange({ ...range, guests: e.target.value })} />

          {nights > 0 && (
            <div className="breakdown" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Rent ({nights} nights)</span>
                <span>${ownerRent.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b93a5', fontSize: 13 }}>
                <span>Service fee (5%)</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
              <div className="total" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e8ee', fontWeight: 700 }}>
                <span>Total to pay</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button className="btn-primary full" style={{ marginTop: 16 }} onClick={book} disabled={user?.role !== 'customer' || isOverlapping}>
            {user?.role === 'customer' ? 'Book now & Pay' : 'Owners cannot book'}
          </button>
          
          <button className="btn-ghost full" style={{ marginTop: 8 }} onClick={contact}>
            💬 Message owner
          </button>
        </aside>
      </div>
    </div>
  );
}