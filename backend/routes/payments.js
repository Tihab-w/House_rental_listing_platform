const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

const SUPPORTED = ['card', 'paypal', 'bank_transfer'];

function ref(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Initiate a payment (mock)
router.post('/', auth(), (req, res) => {
  const { booking_id, method } = req.body;
  if (!SUPPORTED.includes(method))
    return res.status(400).json({ error: 'Unsupported method' });

  const b = db.prepare('SELECT * FROM bookings WHERE id=? AND customer_id=?')
    .get(booking_id, req.user.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (b.status === 'cancelled') return res.status(400).json({ error: 'Booking cancelled' });

  const existing = db.prepare("SELECT * FROM payments WHERE booking_id=? AND status='paid'").get(booking_id);
  if (existing) return res.status(400).json({ error: 'Already paid' });

  const paidNow = method === 'card' || method === 'paypal';
  const status = paidNow ? 'paid' : 'pending';
  const txRef = ref(method === 'card' ? 'CARD' : method === 'paypal' ? 'PP' : 'BANK');

  const info = db.prepare(`INSERT INTO payments (booking_id,method,amount,status,transaction_ref)
    VALUES (?,?,?,?,?)`).run(booking_id, method, b.total_price, status, txRef);

  if (paidNow) {
    db.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").run(booking_id);
  }

  // Calculate the split
  // The total_price stored in the DB is the TOTAL (rent + service fee).
  // We divide by 1.05 to find the base rent (owner's cut).
  const baseRent = Math.round((b.total_price / 1.05) * 100) / 100;
  const serviceFee = Math.round((b.total_price - baseRent) * 100) / 100;

  // Record the platform service fee (goes to Admin)
  db.prepare(`INSERT INTO service_fees (user_id,booking_id,role,amount,method,status,transaction_ref)
    VALUES (?,?,?,?,?,?,?)`).run(
    req.user.id, booking_id, 'customer', serviceFee, method, status, txRef + '-SF'
  );

  const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(info.lastInsertRowid);
  const prop = db.prepare('SELECT p.* FROM properties p JOIN bookings b ON b.property_id=p.id WHERE b.id=?')
    .get(booking_id);

  const io = req.io;
  
  // Notify owner (They receive the baseRent amount)
  db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
    prop.owner_id, 'payment',
    paidNow ? '💰 Payment received (Rent)' : '🏦 Bank transfer pending',
    `You earned ${baseRent} ETB from booking #${booking_id}.`,
    '/owner/bookings'
  );
  const n = db.prepare('SELECT * FROM notifications WHERE id=last_insert_rowid()').get();
  io.to(`user_${prop.owner_id}`).emit('notification', n);

  // Notify admin (They receive the serviceFee amount)
  const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
  admins.forEach(a => {
    db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
      a.id, 'revenue',
      `💵 Platform Service Fee: ${serviceFee} ETB`,
      `From booking #${booking_id}`,
      '/admin'
    );
    const nAdmin = db.prepare('SELECT * FROM notifications WHERE id=last_insert_rowid()').get();
    io.to(`user_${a.id}`).emit('notification', nAdmin);
  });

  res.json({ payment, confirmed: paidNow, serviceFee });
});

// Owner verifies a bank transfer

router.patch('/:id/verify', auth(), (req, res) => {
  const p = db.prepare(`SELECT pay.*, b.id AS bid, pr.owner_id, pr.title, b.customer_id
    FROM payments pay
    JOIN bookings b ON b.id=pay.booking_id
    JOIN properties pr ON pr.id=b.property_id
    WHERE pay.id=?`).get(req.params.id);
  if (!p || p.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });

  db.prepare("UPDATE payments SET status='paid' WHERE id=?").run(req.params.id);
  db.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").run(p.bid);

  db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
    p.customer_id, 'payment',
    '✅ Payment verified by owner',
    `Your booking "${p.title}" is confirmed.`,
    '/bookings'
  );
  const n = db.prepare('SELECT * FROM notifications WHERE id=last_insert_rowid()').get();
  req.io.to(`user_${p.customer_id}`).emit('notification', n);

  res.json({ ok: true });
});

router.get('/booking/:bookingId', auth(), (req, res) => {
  const rows = db.prepare('SELECT * FROM payments WHERE booking_id=? ORDER BY created_at DESC')
    .all(req.params.bookingId);
  res.json(rows);
});

module.exports = router;