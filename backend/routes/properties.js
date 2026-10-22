const router = require('express').Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

function parse(p) {
  if (!p) return p;
  return {
    ...p,
    amenities: JSON.parse(p.amenities || '[]'),
    images: JSON.parse(p.images || '[]'),
    rules: JSON.parse(p.rules || '[]')
  };
}

/* Smart search — returns closest matches, not exact */
router.get('/', (req, res) => {
  const { city, min, max, guests, q } = req.query;

  const all = db.prepare(`
    SELECT p.*, u.username AS owner_name,
      (SELECT AVG(rating) FROM reviews WHERE property_id=p.id) AS avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE property_id=p.id) AS review_count
    FROM properties p
    JOIN users u ON u.id=p.owner_id
    ORDER BY p.created_at DESC
  `).all();

  const hasFilters = city || min || max || guests || q;
  if (!hasFilters) return res.json(all.map(parse));

  const scored = all.map(p => {
    let score = 0;
    const why = {};

    if (city && city.trim()) {
      const c = city.toLowerCase().trim();
      if (p.city && p.city.toLowerCase().includes(c)) { score += 50; why.city = 'exact'; }
      else if (p.country && p.country.toLowerCase().includes(c)) { score += 20; why.city = 'country'; }
    }

    if (q && q.trim()) {
      const qq = q.toLowerCase().trim();
      const haystack = [p.title, p.description, p.neighborhood, p.city]
        .filter(Boolean).join(' ').toLowerCase();
      if (haystack.includes(qq)) { score += 30; why.text = 'yes'; }
    }

    if (min || max) {
      const price = p.price_per_night;
      const nMin = min ? Number(min) : 0;
      const nMax = max ? Number(max) : Infinity;
      if (price >= nMin && price <= nMax) { score += 40; why.price = 'in-range'; }
      else {
        const distance = price < nMin ? nMin - price : price - nMax;
        score += Math.max(0, 30 - distance);
        why.price = 'near';
      }
    }

    if (guests) {
      const g = Number(guests);
      if (p.max_guests >= g) { score += 30; why.guests = 'ok'; }
      else score += Math.max(0, 10 - (g - p.max_guests) * 2);
    }

    return { ...parse(p), _score: score, _why: why };
  });

  scored.sort((a, b) => b._score - a._score);
  res.json(scored);
});

router.get('/mine', auth(), requireRole('owner'), (req, res) => {
  const rows = db.prepare('SELECT * FROM properties WHERE owner_id=? ORDER BY created_at DESC')
    .all(req.user.id).map(parse);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT p.*, u.username AS owner_name, u.email AS owner_email
    FROM properties p JOIN users u ON u.id=p.owner_id WHERE p.id=?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const booked = db.prepare(`SELECT check_in, check_out FROM bookings
    WHERE property_id=? AND status IN ('pending','confirmed')`).all(req.params.id);
  const reviews = db.prepare(`SELECT r.*, u.username FROM reviews r
    JOIN users u ON u.id=r.customer_id WHERE r.property_id=? ORDER BY r.created_at DESC`)
    .all(req.params.id);

  res.json({ ...parse(row), bookedRanges: booked, reviews });
});

router.post('/', auth(), requireRole('owner'), (req, res) => {
  const b = req.body;

  if (!b.title || !b.title.trim()) return res.status(400).json({ error: 'Title required' });
  if (!b.city || !b.city.trim()) return res.status(400).json({ error: 'City required' });
  if (!b.neighborhood || !b.neighborhood.trim()) return res.status(400).json({ error: 'Neighborhood required' });
  if (!b.price_per_night || b.price_per_night <= 0) return res.status(400).json({ error: 'Invalid price' });
  if (!b.description || b.description.trim().length < 30) {
    return res.status(400).json({ error: 'Description must be at least 30 characters' });
  }
  if (!Array.isArray(b.images) || b.images.length < 10) {
    return res.status(400).json({ error: 'At least 10 images required' });
  }
  if (!b.payment_method || !['card','paypal','bank_transfer'].includes(b.payment_method)) {
    return res.status(400).json({ error: 'Payment method required' });
  }

  // Owner service fee: 100 ETB flat per listing
  const OWNER_FEE = 100;
  const paidNow = b.payment_method === 'card' || b.payment_method === 'paypal';
  const feeStatus = paidNow ? 'paid' : 'pending';
  const txRef = 'LIST-' + Date.now().toString(36).toUpperCase();

  const info = db.prepare(`INSERT INTO properties
    (owner_id,title,description,property_type,address,city,neighborhood,country,
     lat,lng,price_per_night,bedrooms,bathrooms,max_guests,area_sqft,floor_number,
     year_built,furnished,amenities,rules,images,contact_phone,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    req.user.id, b.title, b.description || '', b.property_type || 'apartment',
    b.address || '', b.city, b.neighborhood || '', b.country || '',
    0, 0,
    Number(b.price_per_night),
    Number(b.bedrooms) || 1, Number(b.bathrooms) || 1, Number(b.max_guests) || 2,
    Number(b.area_sqft) || 500,
    b.floor_number ? Number(b.floor_number) : null,
    b.year_built ? Number(b.year_built) : null,
    b.furnished || 'unfurnished',
    JSON.stringify(b.amenities || []),
    JSON.stringify(b.rules || []),
    JSON.stringify(b.images || []),
    b.contact_phone || '',
    paidNow ? 'available' : 'pending_payment'
  );

  const propertyId = info.lastInsertRowid;

  // Record owner service fee
  db.prepare(`INSERT INTO service_fees (user_id,property_id,role,amount,method,status,transaction_ref)
    VALUES (?,?,?,?,?,?,?)`).run(
    req.user.id, propertyId, 'owner', OWNER_FEE, b.payment_method, feeStatus, txRef
  );

  // Notify admins
  const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
  admins.forEach(a => {
    db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
      a.id, 'revenue',
      `🏠 Owner listing fee: ${OWNER_FEE} ETB`,
      `${b.title} • ${b.payment_method}`,
      '/admin'
    );
    const n = db.prepare('SELECT * FROM notifications WHERE id=last_insert_rowid()').get();
    req.io.to(`user_${a.id}`).emit('notification', n);
  });

  res.json({ id: propertyId, serviceFee: OWNER_FEE, paid: paidNow });
});

router.put('/:id', auth(), requireRole('owner'), (req, res) => {
  const p = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (p.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const b = req.body;
  if (!Array.isArray(b.images) || b.images.length < 10)
    return res.status(400).json({ error: 'At least 10 images required' });

  db.prepare(`UPDATE properties SET
    title=?, description=?, property_type=?, address=?, city=?, neighborhood=?, country=?,
    lat=?, lng=?, price_per_night=?, bedrooms=?, bathrooms=?, max_guests=?, area_sqft=?,
    floor_number=?, year_built=?, furnished=?, amenities=?, rules=?, images=?, contact_phone=?
    WHERE id=?`).run(
    b.title, b.description, b.property_type, b.address, b.city, b.neighborhood, b.country,
    Number(b.lat), Number(b.lng), Number(b.price_per_night), Number(b.bedrooms),
    Number(b.bathrooms), Number(b.max_guests), Number(b.area_sqft),
    b.floor_number ? Number(b.floor_number) : null,
    b.year_built ? Number(b.year_built) : null,
    b.furnished, JSON.stringify(b.amenities || []),
    JSON.stringify(b.rules || []), JSON.stringify(b.images || []),
    b.contact_phone || '', req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', auth(), requireRole('owner'), (req, res) => {
  const p = db.prepare('SELECT * FROM properties WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (p.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM properties WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/reviews', auth(), (req, res) => {
  const { rating, comment } = req.body;
  const done = db.prepare(`SELECT 1 FROM bookings WHERE property_id=? AND customer_id=?
    AND status='completed'`).get(req.params.id, req.user.id);
  if (!done) return res.status(403).json({ error: 'You must complete a stay first' });
  db.prepare('INSERT INTO reviews (property_id,customer_id,rating,comment) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, rating, comment || '');
  res.json({ ok: true });
});

module.exports = router;