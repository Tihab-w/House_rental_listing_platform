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
  price_per_night: 15000, // defaults to 15,000 ETB per month
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
  images: [] // uploaded URLs
};

const AMENITIES = ['WiFi','Kitchen','Parking','Air Conditioning','Pool','Gym','Garden','Lake View','TV','Washer','Heating','Pet Friendly','Elevator','Balcony','Security','Backup Generator','Water Tank'];
const RULES = ['No smoking','No pets','No parties','Quiet hours after 10pm','No overnight guests','ID required at check-in'];
const PROPERTY_TYPES = ['apartment','house','villa','studio','condo','townhouse','room'];
const LISTING_FEE = 100;

export default function AddProperty() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        price_per_night: p.price_per_night || 15000,
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
        images: p.images || []
      });
    }).catch(e => setErr(e.response?.data?.error || 'Failed to load'));
  }, [id]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleArray = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(x => x !== value) : [...prev[key], value]
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (form.images.length + files.length > 10) {
      return setErr('You can upload a maximum of 10 images.');
    }
    setUploading(true);
    setErr('');
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    try {
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(prev => ({ ...prev, images: [...prev.images, ...res.data.urls] }));
    } catch (e) {
      setErr('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const removeImage = (indexToRemove) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== indexToRemove) }));
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
    if (form.description.trim().length < 30) return setErr('Please write at least 30 characters in the description');
    if (form.images.length < 5) return setErr(`At least 5 images required. You have ${form.images.length}.`);

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
      payment_method: paymentMethod
    };

    setSaving(true);
    try {
      if (id) {
        await api.put(`/properties/${id}`, payload);
        nav('/owner/properties');
      } else {
        const r = await api.post('/properties', payload);
        if (r.data && r.data.paid === false) {
          alert(`✅ Listing submitted!\n\nYour bank transfer of ${LISTING_FEE} ETB is pending. Admin will verify it shortly.`);
        }
        nav('/owner/properties');
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="auth-card wide">
      <h2>{id ? 'Edit' : 'Add'} Property</h2>
      {err && <div className="error">{err}</div>}

      <form onSubmit={submit}>
        <h3 style={{ marginTop: 10 }}>Basic Info</h3>
        <label>Title *</label>
        <input value={form.title} onChange={e => setField('title', e.target.value)} required />

        <label>Description * (min 30 chars)</label>
        <textarea rows="4" value={form.description} onChange={e => setField('description', e.target.value)} />

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
        <input value={form.address} onChange={e => setField('address', e.target.value)} />

        <div className="three">
          <div>
            <label>City *</label>
            <input value={form.city} onChange={e => setField('city', e.target.value)} required />
          </div>
          <div>
            <label>Neighborhood *</label>
            <input value={form.neighborhood} onChange={e => setField('neighborhood', e.target.value)} required />
          </div>
          <div>
            <label>Country</label>
            <input value={form.country} onChange={e => setField('country', e.target.value)} />
          </div>
        </div>

        <h3 style={{ marginTop: 20 }}>Details</h3>
        <div className="four">
          <div><label>Price / month (ETB) *</label><input type="number" min="1" value={form.price_per_night} onChange={e => setField('price_per_night', e.target.value)} required /></div>
          <div><label>Bedrooms</label><input type="number" min="1" value={form.bedrooms} onChange={e => setField('bedrooms', e.target.value)} /></div>
          <div><label>Bathrooms</label><input type="number" min="1" value={form.bathrooms} onChange={e => setField('bathrooms', e.target.value)} /></div>
          <div><label>Max guests</label><input type="number" min="1" value={form.max_guests} onChange={e => setField('max_guests', e.target.value)} /></div>
        </div>

        <div className="four">
          <div><label>Area (sq ft)</label><input type="number" min="50" value={form.area_sqft} onChange={e => setField('area_sqft', e.target.value)} /></div>
          <div><label>Floor number</label><input type="number" value={form.floor_number} onChange={e => setField('floor_number', e.target.value)} /></div>
          <div><label>Year built</label><input type="number" value={form.year_built} onChange={e => setField('year_built', e.target.value)} /></div>
          <div><label>Contact phone (optional)</label><input value={form.contact_phone} onChange={e => setField('contact_phone', e.target.value)} /></div>
        </div>

        <h3 style={{ marginTop: 20 }}>Amenities</h3>
        <div className="chips">
          {AMENITIES.map(a => <button type="button" key={a} className={`chip clickable ${form.amenities.includes(a) ? 'chip-active' : ''}`} onClick={() => toggleArray('amenities', a)}>{a}</button>)}
        </div>

        <h3 style={{ marginTop: 20 }}>House Rules</h3>
        <div className="chips">
          {RULES.map(r => <button type="button" key={r} className={`chip clickable ${form.rules.includes(r) ? 'chip-active' : ''}`} onClick={() => toggleArray('rules', r)}>{r}</button>)}
        </div>

        <h3 style={{ marginTop: 24 }}>
          Photos — {form.images.length} uploaded
          {form.images.length < 5 && <span style={{ color: '#dc2626' }}> (need {5 - form.images.length} more)</span>}
        </h3>
        <p className="muted small" style={{ marginBottom: 12 }}>Upload at least 5 photos. The first photo will be the cover image.</p>

        <div style={{ border: '2px dashed #cbd5e1', padding: 20, borderRadius: 12, textAlign: 'center', marginBottom: 20 }}>
          <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} id="file-upload" />
          <label htmlFor="file-upload" className="btn-primary" style={{ cursor: 'pointer', display: 'inline-block' }}>
            {uploading ? 'Uploading...' : '📁 Choose Photos from Device'}
          </label>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {form.images.map((url, i) => (
            <div key={i} style={{ position: 'relative', height: 100 }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(220, 38, 38, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              {i === 0 && <span style={{ position: 'absolute', bottom: 4, left: 4, background: 'var(--primary)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>Cover</span>}
            </div>
          ))}
        </div>

        {!id && (
          <>
            <h3 style={{ marginTop: 30 }}>Listing Fee</h3>
            <div className="panel" style={{ background: '#f7f8fa', border: '1px solid #e5e8ee', padding: 20 }}>
              <p style={{ marginBottom: 14 }}>A one-time fee of <b>{LISTING_FEE} ETB</b> is required to activate your listing.</p>
              <div className="pay-methods">
                {[{ id: 'card', label: '💳 Card' }, { id: 'paypal', label: '🅿 PayPal' }, { id: 'bank_transfer', label: '🏦 CBE Bank Transfer' }].map(m => (
                  <label key={m.id} className={`pay-option ${paymentMethod === m.id ? 'active' : ''}`}>
                    <input type="radio" name="feeMethod" checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} />
                    {m.label}
                  </label>
                ))}
              </div>
              {paymentMethod === 'card' && (
                <div className="card-form">
                  <input placeholder="Card Number (4242...)" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} />
                  <input placeholder="Name on Card" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} />
                  <div className="two">
                    <input placeholder="MM/YY" value={card.exp} onChange={e => setCard({ ...card, exp: e.target.value })} />
                    <input placeholder="CVC" value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <button className="btn-primary full" disabled={saving || uploading} style={{ marginTop: 20 }}>
          {saving ? 'Saving...' : id ? 'Save Changes' : `Publish Listing (${LISTING_FEE} ETB)`}
        </button>
      </form>
    </div>
  );
}