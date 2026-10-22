const router = require('express').Router();
const db = require('../db');
 
const { auth, requireRole } = require('../middleware/auth');

// Helper: persist + emit a notification
function notify(io, userId, payload) {
  db.prepare(`INSERT INTO notifications (user_id,type,title,body,link)
    VALUES (?,?,?,?,?)`).run(
    userId, payload.type, payload.title, payload.body || '', payload.link || ''
  );
  const n = db.prepare('SELECT * FROM notifications WHERE id=last_insert_rowid()').get();
  io.to(`user_${userId}`).emit('notification', n);
}

// Helper: check if dates overlap an existing active booking
function overlaps(propertyId, checkIn, checkOut, ignoreId = null) {
  const q = `SELECT 1 FROM bookings
    WHERE property_id=? AND status IN ('pending','confirmed')
    AND NOT (check_out <= ? OR check_in >= ?)
    ${ignoreId ? 'AND id != ?' : ''}`;
  const args = ignoreId
    ? [propertyId, checkIn, checkOut, ignoreId]
    : [propertyId, checkIn, checkOut];
  return !!db.prepare(q).get(...args);
}

/* =========================================================
   CREATE BOOKING  (customer)
   ========================================================= */
router.post('/', auth(), (req, res) => {
  const { property_id, check_in, check_out, guests = 1 } = req.body;

  if (!property_id || !check_in || !check_out)
    return res.status(400).json({ error: 'Missing fields' });
  if (new Date(check_in) >= new Date(check_out))
    return res.status(400).json({ error: 'check_out must be after check_in' });
  if (new Date(check_in) < new Date(new Date().toDateString()))
    return res.status(400).json({ error: 'check_in cannot be in the past' });

  const prop = db.prepare('SELECT * FROM properties WHERE id=?').get(property_id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });
  if (prop.owner_id === req.user.id)
    return res.status(400).json({ error: 'Cannot book your own property' });
  if (guests > prop.max_guests)
    return res.status(400).json({ error: `Max ${prop.max_guests} guests allowed` });
  if (overlaps(property_id, check_in, check_out))
    return res.status(409).json({ error: 'Dates unavailable' });

  // Calculate fees
  const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / 86400000);
  const subtotal = nights * prop.price_per_night;
  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + serviceFee;

  // Create booking
  const info = db.prepare(`INSERT INTO bookings
    (property_id,customer_id,check_in,check_out,guests,total_price,status)
    VALUES (?,?,?,?,?,?,'pending')`).run(
    property_id, req.user.id, check_in, check_out, guests, total
  );

  const booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(info.lastInsertRowid);

  notify(req.io, prop.owner_id, {
    type: 'booking',
    title: '📩 New booking request',
    body: `${req.user.username} requested ${prop.title} (${check_in} → ${check_out})`,
    link: '/owner/bookings'
  });

  req.io.to(`user_${prop.owner_id}`).emit('booking:new', { booking, property: prop });

  res.json({ booking, subtotal, serviceFee, total });
});
/* =========================================================
   CUSTOMER'S BOOKINGS
   ========================================================= */
router.get('/mine', auth(), (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, p.title, p.city, p.images, p.owner_id,
           u.username AS owner_name,
           pay.status AS payment_status,
           pay.method AS payment_method,
           pay.transaction_ref
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN users u ON u.id = p.owner_id
    LEFT JOIN payments pay ON pay.booking_id = b.id
    WHERE b.customer_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);

  res.json(rows.map(r => ({
    ...r,
    images: JSON.parse(r.images || '[]')
  })));
});

/* =========================================================
   OWNER'S BOOKINGS  (with payment_id fix ✅)
   ========================================================= */
router.get('/owner', auth(), requireRole('owner'), (req, res) => {
  const rows = db.prepare(`
    SELECT b.*,
           p.title, p.images,
           u.username AS customer_name,
           u.email AS customer_email,
           pay.id AS payment_id,
           pay.status AS payment_status,
           pay.method AS payment_method,
           pay.transaction_ref
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN users u ON u.id = b.customer_id
    LEFT JOIN payments pay ON pay.booking_id = b.id
    WHERE p.owner_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);

  res.json(rows.map(r => ({
    ...r,
    images: JSON.parse(r.images || '[]')
  })));
});

/* =========================================================
   OWNER ACCEPTS / DECLINES / COMPLETES
   ========================================================= */
router.patch('/:id/status', auth(), requireRole('owner'), (req, res) => {
  const { status } = req.body;

  if (!['confirmed', 'declined', 'completed'].includes(status))
    return res.status(400).json({ error: 'Bad status' });

  const b = db.prepare(`
    SELECT b.*, p.owner_id, p.title
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (b.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });

  db.prepare('UPDATE bookings SET status=? WHERE id=?')
    .run(status, req.params.id);

  const titles = {
    confirmed: '✅ Booking confirmed!',
    declined: '❌ Booking declined',
    completed: '⭐ Stay completed'
  };

  notify(req.io, b.customer_id, {
    type: 'booking',
    title: titles[status],
    body: `${b.title}: ${b.check_in} → ${b.check_out}`,
    link: '/bookings'
  });

  req.io.to(`user_${b.customer_id}`).emit('booking:update', {
    bookingId: b.id,
    status
  });

  res.json({ ok: true });
});

/* =========================================================
   CUSTOMER CANCELS
   ========================================================= */
router.patch('/:id/cancel', auth(), (req, res) => {
  const b = db.prepare(`
    SELECT b.*, p.owner_id, p.title
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (b.customer_id !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });
  if (['cancelled', 'completed'].includes(b.status))
    return res.status(400).json({ error: 'Cannot cancel this booking' });

  db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?")
    .run(req.params.id);

  notify(req.io, b.owner_id, {
    type: 'booking',
    title: '🚫 Booking cancelled',
    body: `${b.title} (${b.check_in} → ${b.check_out})`,
    link: '/owner/bookings'
  });

  req.io.to(`user_${b.owner_id}`).emit('booking:update', {
    bookingId: b.id,
    status: 'cancelled'
  });

  res.json({ ok: true });
});

/* =========================================================
   SINGLE BOOKING DETAIL
   ========================================================= */
router.get('/:id', auth(), (req, res) => {
  const b = db.prepare(`
    SELECT b.*,
           p.title, p.images, p.owner_id, p.price_per_night, p.city,
           u.username AS owner_name,
           c.username AS customer_name,
           pay.id AS payment_id,
           pay.status AS payment_status,
           pay.method AS payment_method,
           pay.transaction_ref
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN users u ON u.id = p.owner_id
    JOIN users c ON c.id = b.customer_id
    LEFT JOIN payments pay ON pay.booking_id = b.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!b) return res.status(404).json({ error: 'Booking not found' });

  // Only the customer or owner can view
  if (b.customer_id !== req.user.id && b.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });

  res.json({ ...b, images: JSON.parse(b.images || '[]') });
});

// Get already booked dates for a property
router.get('/availability/:propertyId', (req, res) => {
  const bookings = db.prepare(`
    SELECT check_in, check_out FROM bookings 
    WHERE property_id = ? AND status IN ('pending', 'confirmed')
  `).all(req.params.propertyId);
  
  res.json(bookings);
});

module.exports = router;