const router = require('express').Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth(), requireRole('owner'), (req, res) => {
  const rows = db.prepare(`SELECT cs.*, p.title FROM cleaning_schedules cs
    JOIN properties p ON p.id=cs.property_id
    WHERE p.owner_id=? ORDER BY cs.date ASC`).all(req.user.id);
  res.json(rows);
});

router.post('/', auth(), requireRole('owner'), (req, res) => {
  const { property_id, date, notes } = req.body;
  const own = db.prepare('SELECT 1 FROM properties WHERE id=? AND owner_id=?')
    .get(property_id, req.user.id);
  if (!own) return res.status(403).json({ error: 'Forbidden' });
  const info = db.prepare('INSERT INTO cleaning_schedules (property_id,date,notes) VALUES (?,?,?)')
    .run(property_id, date, notes || '');
  res.json({ id: info.lastInsertRowid });
});

router.patch('/:id', auth(), requireRole('owner'), (req, res) => {
  const { status } = req.body;
  const row = db.prepare(`SELECT cs.* FROM cleaning_schedules cs
    JOIN properties p ON p.id=cs.property_id WHERE cs.id=? AND p.owner_id=?`)
    .get(req.params.id, req.user.id);
  if (!row) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE cleaning_schedules SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
