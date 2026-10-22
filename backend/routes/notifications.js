const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/', auth(), (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);
  res.json(rows);
});

router.patch('/:id/read', auth(), (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?')
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.patch('/read-all', auth(), (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;