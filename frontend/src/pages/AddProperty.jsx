import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const empty = {
  title: '',
  description: '',
  property_type: 'apartment',
  address: '',
  city: '',
  neighborhood: '',
  country: 'Ethiopia',
  price_per_night: 50,
  bedrooms: 1,
  bathrooms: 1,
  max_guests: 2,
  area_sqft: 500,
  floor_number: '',
  year_built: '',
  furnished: 'unfurnished',
  contact_phone: '',
  amenities: [],
  rules: [],
  images: Array(10).fill('') // start with 10 slots
};

const AMENITIES = [
  'WiFi', 'Kitchen', 'Parking', 'Air Conditioning', 'Pool', 'Gym',
  'Garden', 'Lake View', 'TV', 'Washer', 'Heating', 'Pet Friendly',
  'Elevator', 'Balcony', 'Security', 'Backup Generator', 'Water Tank',
  'Furnished Kitchen', 'Washing Machine', 'Dryer'
];

const RULES = [
  'No smoking', 'No pets', 'No parties', 'Quiet hours after 10pm',
  'No overnight guests', 'ID required at check-in'
];

const PROPERTY_TYPES = [
  'apartment', 'house', 'villa', 'studio', 'condo', 'townhouse', 'room'
];

const LISTING_FEE = 100; // ETB

export default function AddProperty() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvc: '' });

  useEffect(() => {
    if (!id) return;
    api.get(`/properties/${id}`).then(r => {
      const p = r.data;
      setForm({
        title: p.title || '',
        description: p.description || '',
        property_type: p.property_type || 'apartment',
        address: p.address || '',
        city: p.city || '',
        neighborhood: p.neighborhood || '',
        country: p.country || 'Ethiopia',
        price_per_night: p.price_per_night || 50,
        bedrooms: p.bedrooms || 1,
        bathrooms: p.bathrooms || 1,
        max_guests: p.max_guests || 2,
        area_sqft: p.area_sqft || 500,
        floor_number: p.floor_number || '',
        year_built: p.year_built || '',
        furnished: p.furnished || 'unfurnished',
        contact_phone: p.contact_phone || '',
        amenities: p.amenities || [],
        rules: p.rules || [],
        images: p.images && p.images.length >= 10
          ? p.images
          : [...p.images, ...Array(10 - p.images.length).fill('')]
      });
    }).catch(e => setErr(e.response?.data?.error || 'Failed to load'));
  }, [id]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleArray = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(x => x !== value)
        : [...prev[key], value]
    }));
  };

  const setImage = (i, v) => {
    setForm(prev => {
      const copy = [...prev.images];
      copy[i] = v;
      return { ...prev, images: copy };
    });
  };

  const addImageSlot = () => {
    setForm(prev => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageSlot = (i) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== i)
    }));
  };

  const validateCard = () => {
    const num = card.number.replace(/\s/g, '');
    if (num.length < 12) return 'Card number too short';
    if (!/^\d+$/.test(num)) return 'Card number must be digits';
    if (!card.name.trim()) return 'Enter cardholder name';
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) return 'Expiry must be MM/YY';
    if (card.cvc.length < 3) return 'CVC must be at least 3 digits';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!form.title.trim()) return setErr('Title is required');
    if (!form.city.trim()) return setErr('City is required');
    if (!form.neighborhood.trim()) return setErr('Neighborhood is required');
    if (Number(form.price_per_night) <= 0) return setErr('Price must be > 0');
    if (form.description.trim().length < 30) {
      return setErr('Please write at least 30 characters in the description');
    }

    const cleanImages = form.images.map(s => s.trim()).filter(Boolean);
    if (cleanImages.length < 10) {
      return setErr(`At least 10 images required. You have ${cleanImages.length}.`);
    }

    // Validate payment only for new listings
    if (!id && paymentMethod === 'card') {
      const v = validateCard();
      if (v) return setErr('Payment error: ' + v);
    }

    const payload = {
      ...form,
      price_per_night: Number(form.price_per_night),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      max_guests: Number(form.max_guests),
      area_sqft: Number(form.area_sqft),
      floor_number: form.floor_number ? Number(form.floor_number) : null,
      year_built: form.year_built ? Number(form.year_built) : null,
      images: cleanImages,
      payment_method: paymentMethod // Send method to backend
    };

    setSaving(true);
    try {
      if (id) {
        await api.put(`/properties/${id}`, payload);
        nav('/owner/properties');
      } else {
        const r = await api.post('/properties', payload);
        if (r.data && r.data.paid === false) {
          alert(`✅ Listing submitted!\n\nYour bank transfer of ${LISTING_FEE} ETB is pending.\nAdmin will verify it and your listing will go live shortly.`);
        }
        nav('/owner/properties');
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filledImages = form.images.filter(s => s.trim()).length;

  return (
    <div className="auth-card wide">
      <h2>{id ? 'Edit' : 'Add'} Property</h2>
      <p className="muted" style={{ marginBottom: 20 }}>
        Fill in full details. At least 10 images are required.
      </p>

      {err && <div className="error">{err}</div>}

      {form.images.find(s => s.trim()) && (
        <img
          src={form.images.find(s => s.trim())}
          alt="preview"
          style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      <form onSubmit={submit}>
        <h3 style={{ marginTop: 10 }}>Basic Info</h3>
        <label>Title *</label>
        <input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Spacious 2BR Apartment in Bole" required />

        <label>Description * (min 30 chars)</label>
        <textarea rows="4" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Describe the space, neighborhood, nearby attractions…" />

        <div className="two">
          <div>
            <label>Property Type</label>
            <select value={form.property_type} onChange={e => setField('property_type', e.target.value)}>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label>Furnished?</label>
            <select value={form.furnished} onChange={e => setField('furnished', e.target.value)}>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="furnished">Fully furnished</option>
            </select>
          </div>
        </div>

        <h3 style={{ marginTop: 20 }}>Location</h3>
        <label>Address</label>
        <input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Street, building…" />

        <div className="three">
          <div>
            <label>City *</label>
            <input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="Addis Ababa" required />
          </div>
          <div>
            <label>Neighborhood *</label>
            <input value={form.neighborhood} onChange={e => setField('neighborhood', e.target.value)} placeholder="Bole" required />
          </div>
          <div>
            <label>Country</label>
            <input value={form.country} onChange={e => setField('country', e.target.value)} />
          </div>
        </div>

        <h3 style={{ marginTop: 20 }}>Details</h3>
        <div className="four">
          <div>
            <label>Price / night ($) *</label>
            <input type="number" min="1" value={form.price_per_night} onChange={e => setField('price_per_night', e.target.value)} required />
          </div>
          <div>
            <label>Bedrooms</label>
            <input type="number" min="1" value={form.bedrooms} onChange={e => setField('bedrooms', e.target.value)} />
          </div>
          <div>
            <label>Bathrooms</label>
            <input type="number" min="1" value={form.bathrooms} onChange={e => setField('bathrooms', e.target.value)} />
          </div>
          <div>
            <label>Max guests</label>
            <input type="number" min="1" value={form.max_guests} onChange={e => setField('max_guests', e.target.value)} />
          </div>
        </div>

        <div className="four">
          <div>
            <label>Area (sq ft)</label>
            <input type="number" min="50" value={form.area_sqft} onChange={e => setField('area_sqft', e.target.value)} />
          </div>
          <div>
            <label>Floor number</label>
            <input type="number" value={form.floor_number} onChange={e => setField('floor_number', e.target.value)} />
          </div>
          <div>
            <label>Year built</label>
            <input type="number" value={form.year_built} onChange={e => setField('year_built', e.target.value)} />
          </div>
          <div>
            <label>Contact phone</label>
            <input value={form.contact_phone} onChange={e => setField('contact_phone', e.target.value)} />
          </div>
        </div>

        <h3 style={{ marginTop: 20 }}>Amenities</h3>
        <div className="chips">
          {AMENITIES.map(a => (
            <button type="button" key={a} className={`chip clickable ${form.amenities.includes(a) ? 'chip-active' : ''}`} onClick={() => toggleArray('amenities', a)}>
              {a}
            </button>
          ))}
        </div>

        <h3 style={{ marginTop: 20 }}>House Rules</h3>
        <div className="chips">
          {RULES.map(r => (
            <button type="button" key={r} className={`chip clickable ${form.rules.includes(r) ? 'chip-active' : ''}`} onClick={() => toggleArray('rules', r)}>
              {r}
            </button>
          ))}
        </div>

        <h3 style={{ marginTop: 20 }}>
          Images — {filledImages}/10 filled
          {filledImages < 10 && <span style={{ color: '#dc2626' }}> (need {10 - filledImages} more)</span>}
        </h3>
        <p className="muted small" style={{ marginBottom: 8 }}>Paste direct image URLs. First image is the cover.</p>

        {form.images.map((url, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={url} onChange={e => setImage(i, e.target.value)} placeholder={`Image ${i + 1} URL`} />
            {form.images.length > 10 && (
              <button type="button" className="btn-ghost" onClick={() => removeImageSlot(i)}>✕</button>
            )}
          </div>
        ))}

        <button type="button" className="btn-ghost" onClick={addImageSlot} style={{ marginBottom: 16 }}>+ Add more images</button>

        {/* --- LISTING FEE PAYMENT SECTION --- */}
        {!id && (
          <>
            <h3 style={{ marginTop: 24 }}>Listing Fee</h3>
            <div className="panel" style={{ background: '#f7f8fa', border: '1px solid #e5e8ee', padding: 20 }}>
              <p style={{ marginBottom: 14 }}>
                A one-time <b>service fee of {LISTING_FEE} ETB</b> is charged when you post a property. Once paid (or verified by admin), your listing goes live.
              </p>

              <div className="pay-methods">
                {[
                  { id: 'card', label: '💳 Credit/Debit Card' },
                  { id: 'paypal', label: '🅿 PayPal' },
                  { id: 'bank_transfer', label: '🏦 Bank Transfer' }
                ].map(m => (
                  <label key={m.id} className={`pay-option ${paymentMethod === m.id ? 'active' : ''}`}>
                    <input type="radio" name="listingFeeMethod" checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} />
                    {m.label}
                  </label>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <div className="card-form">
                  <label>Card Number</label>
                  <input placeholder="4242 4242 4242 4242" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} />
                  <label>Cardholder Name</label>
                  <input value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} />
                  <div className="two">
                    <div>
                      <label>Expiry (MM/YY)</label>
                      <input placeholder="12/28" value={card.exp} onChange={e => setCard({ ...card, exp: e.target.value })} />
                    </div>
                    <div>
                      <label>CVC</label>
                      <input placeholder="123" value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'paypal' && <p className="muted">You'll be redirected to PayPal (simulated) to pay {LISTING_FEE} ETB.</p>}
              {paymentMethod === 'bank_transfer' && (
                <div>
                  <p>Transfer <b>{LISTING_FEE} ETB</b> to:</p>
                  <p><b>Bank:</b> Demo Bank</p>
                  <p><b>Account:</b> 1234567890</p>
                  <p><b>Name:</b> RentEase Ltd</p>
                  <p className="muted">After submitting, the admin will verify your transfer. Once verified, your listing goes live.</p>
                </div>
              )}
            </div>
          </>
        )}

        <button className="btn-primary full" disabled={saving} style={{ marginTop: 20 }}>
          {saving ? 'Saving…' : id ? 'Save changes' : `Create listing & pay ${LISTING_FEE} ETB`}
        </button>
      </form>

      <div className="demo-box">
        <b>💡 Sample image URLs:</b>
        <div>https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200</div>
        <div>https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200</div>
        <div>https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200</div>
        <div>https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200</div>
        <div>https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200</div>
        <div>https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200</div>
        <div>https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200</div>
        <div>https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200</div>
        <div>https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200</div>
        <div>https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200</div>
      </div>
    </div>
  );
}