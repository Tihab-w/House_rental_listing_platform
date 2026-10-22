const router = require('express').Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.use(auth(), requireRole('admin'));

// Overview stats
router.get('/stats', (req, res) => {
  const totalUsers      = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const totalOwners     = db.prepare("SELECT COUNT(*) c FROM users WHERE role='owner'").get().c;
  const totalCustomers  = db.prepare("SELECT COUNT(*) c FROM users WHERE role='customer'").get().c;
  const totalProps      = db.prepare('SELECT COUNT(*) c FROM properties').get().c;
  const totalBookings   = db.prepare('SELECT COUNT(*) c FROM bookings').get().c;

  const totalRevenue     = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM service_fees WHERE status='paid'").get().s;
  const ownerFees        = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM service_fees WHERE role='owner' AND status='paid'").get().s;
  const customerFees     = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM service_fees WHERE role='customer' AND status='paid'").get().s;

  const pendingFees = db.prepare("SELECT COUNT(*) c FROM service_fees WHERE status='pending'").get().c;

  const bookingStatus = db.prepare(`
    SELECT status, COUNT(*) c FROM bookings GROUP BY status
  `).all();

  const monthlyRevenue = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS month,
           SUM(amount) AS amount
    FROM service_fees
    WHERE status='paid'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all();

  res.json({
    totalUsers, totalOwners, totalCustomers,
    totalProps, totalBookings,
    totalRevenue, ownerFees, customerFees,
    pendingFees, bookingStatus, monthlyRevenue
  });
});

// All users
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// All properties
router.get('/properties', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, u.username AS owner_name, u.email AS owner_email
    FROM properties p JOIN users u ON u.id=p.owner_id
    ORDER BY p.created_at DESC
  `).all();
  res.json(rows.map(r => ({
    ...r,
    images: JSON.parse(r.images || '[]'),
    amenities: JSON.parse(r.amenities || '[]'),
    rules: JSON.parse(r.rules || '[]')
  })));
});

// All bookings
router.get('/bookings', (req, res) => {
  const rows = db.prepare(`
    SELECT b.*,
           p.title AS property_title,
           u.username AS customer_name, u.email AS customer_email,
           o.username AS owner_name
    FROM bookings b
    JOIN properties p ON p.id=b.property_id
    JOIN users u ON u.id=b.customer_id
    JOIN users o ON o.id=p.owner_id
    ORDER BY b.created_at DESC
  `).all();
  res.json(rows);
});

// Service fees
router.get('/fees', (req, res) => {
  const rows = db.prepare(`
    SELECT sf.*, u.username, u.email, u.role AS user_role,
           p.title AS property_title
    FROM service_fees sf
    JOIN users u ON u.id=sf.user_id
    LEFT JOIN properties p ON p.id=sf.property_id
    ORDER BY sf.created_at DESC
  `).all();
  res.json(rows);
});

// Verify a pending fee (bank transfer)
router.patch('/fees/:id/verify', (req, res) => {
  const fee = db.prepare('SELECT * FROM service_fees WHERE id=?').get(req.params.id);
  if (!fee) return res.status(404).json({ error: 'Not found' });
  if (fee.status === 'paid') return res.status(400).json({ error: 'Already verified' });

  db.prepare("UPDATE service_fees SET status='paid' WHERE id=?").run(req.params.id);

  // If owner fee → mark property available
  if (fee.role === 'owner' && fee.property_id) {
    db.prepare("UPDATE properties SET status='available' WHERE id=?").run(fee.property_id);
  }
  // If customer fee → confirm booking
  if (fee.role === 'customer' && fee.booking_id) {
    db.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").run(fee.booking_id);
    db.prepare("UPDATE payments SET status='paid' WHERE booking_id=?").run(fee.booking_id);
  }

  // Notify the user
  db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
    fee.user_id, 'payment',
    '✅ Service fee verified',
    `Your ${fee.role} service fee of ${fee.amount} ETB has been verified by admin.`,
    fee.role === 'owner' ? '/owner/properties' : '/bookings'
  );
  const n = db.prepare('SELECT * FROM notifications WHERE id=last_insert_rowid()').get();
  req.io.to(`user_${fee.user_id}`).emit('notification', n);

  res.json({ ok: true });
});

module.exports = router;