const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

// Conversations list
router.get('/conversations', auth(), (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`
    SELECT u.id AS user_id, u.username, MAX(m.created_at) AS last_at,
      (SELECT content FROM messages WHERE (sender_id=u.id AND receiver_id=?) OR (sender_id=? AND receiver_id=u.id)
        ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM users u
    WHERE u.id IN (
      SELECT CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END
      FROM messages WHERE sender_id=? OR receiver_id=?
    )
    GROUP BY u.id ORDER BY last_at DESC`).all(me, me, me, me, me);
  res.json(rows);
});

router.get('/:userId', auth(), (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`SELECT * FROM messages
    WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
    ORDER BY created_at ASC`).all(me, req.params.userId, req.params.userId, me);
  // mark received as read
  db.prepare('UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?')
    .run(req.params.userId, me);
  res.json(rows);
});

router.post('/', auth(), (req, res) => {
  const { receiver_id, content, property_id } = req.body;
  if (!receiver_id || !content) return res.status(400).json({ error: 'Missing fields' });
  const info = db.prepare(`INSERT INTO messages (sender_id,receiver_id,property_id,content)
    VALUES (?,?,?,?)`).run(req.user.id, receiver_id, property_id || null, content);
  const msg = db.prepare('SELECT * FROM messages WHERE id=?').get(info.lastInsertRowid);
  req.io.to(`user_${receiver_id}`).emit('message:new', msg);

  db.prepare(`INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)`).run(
  receiver_id, 'message', '💬 New message',
  content.slice(0, 60),
  `/chat/${req.user.id}`       // ← open chat with the SENDER
);
  const n = db.prepare('SELECT * FROM notifications WHERE id=last_insert_rowid()').get();
  req.io.to(`user_${receiver_id}`).emit('notification', n);

  res.json(msg);
});

module.exports = router;