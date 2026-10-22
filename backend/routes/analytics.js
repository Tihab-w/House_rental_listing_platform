const router = require('express').Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/owner', auth(), requireRole('owner'), (req, res) => {
  const ownerId = req.user.id;

  const props = db.prepare('SELECT * FROM properties WHERE owner_id=?').all(ownerId);
  const propIds = props.map(p => p.id);
  if (propIds.length === 0) {
    return res.json({
      totalRevenue: 0, totalBookings: 0, confirmedBookings: 0, occupancyRate: 0,
      avgStay: 0, monthlyRevenue: [], perProperty: [], paymentBreakdown: []
    });
  }

  const inClause = `(${propIds.map(() => '?').join(',')})`;

  const allBookings = db.prepare(`SELECT b.*, p.title FROM bookings b
    JOIN properties p ON p.id=b.property_id
    WHERE b.property_id IN ${inClause} AND b.status IN ('confirmed','completed')`)
    .all(...propIds);

  const allPayments = db.prepare(`SELECT pay.* FROM payments pay
    JOIN bookings b ON b.id=pay.booking_id
    WHERE b.property_id IN ${inClause} AND pay.status='paid'`).all(...propIds);

  // Only count the 95% base rent that belongs to the owner
  const totalRevenue = allPayments.reduce((s, p) => s + (p.amount / 1.05), 0);
  const totalBookings = allBookings.length;

  // Occupancy rate over last 90 days
  const days = 90;
  const start = new Date(Date.now() - days * 86400000);
  const end = new Date();
  let bookedNights = 0;
  allBookings.forEach(b => {
    const s = new Date(Math.max(new Date(b.check_in), start));
    const e = new Date(Math.min(new Date(b.check_out), end));
    const n = Math.max(0, Math.ceil((e - s) / 86400000));
    bookedNights += n;
  });
  const totalNights = propIds.length * days;
  const occupancyRate = totalNights > 0 ? (bookedNights / totalNights) * 100 : 0;

  const avgStay = allBookings.length
    ? allBookings.reduce((s, b) => s + Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / 86400000), 0) / allBookings.length
    : 0;

  // Monthly revenue (last 6 months)
  const monthlyMap = {};
  allPayments.forEach(p => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + p.amount;
  });
  const monthlyRevenue = Object.entries(monthlyMap)
    .sort()
    .slice(-6)
    .map(([month, revenue]) => ({ month, revenue }));

  // Per-property
  const perProperty = props.map(p => {
    const bks = allBookings.filter(b => b.property_id === p.id);
    const rev = allPayments
    .filter(pay => bks.some(b => b.id === pay.booking_id))
    .reduce((s, pay) => s + (pay.amount / 1.05), 0);
    return { id: p.id, title: p.title, bookings: bks.length, revenue: rev };
  }).sort((a, b) => b.revenue - a.revenue);

  // Payment breakdown
  const payMap = {};
  allPayments.forEach(p => { payMap[p.method] = (payMap[p.method] || 0) + 1; });
  const paymentBreakdown = Object.entries(payMap).map(([method, count]) => ({ method, count }));

  res.json({
    totalRevenue,
    totalBookings,
    confirmedBookings: totalBookings,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    avgStay: Math.round(avgStay * 10) / 10,
    monthlyRevenue,
    perProperty,
    paymentBreakdown
  });
});

module.exports = router;