const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth } = require('../middleware/auth');

const sign = (u) =>
  jwt.sign({ id: u.id, role: u.role, username: u.username },
    process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role)
    return res.status(400).json({ error: 'Missing fields' });
  if (!['customer', 'owner'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password min 6 chars' });

  const exists = db.prepare('SELECT id FROM users WHERE email=? OR username=?')
    .get(email, username);
  if (exists) return res.status(409).json({ error: 'Email or username taken' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)'
  ).run(username, email, hash, role);

  const user = db.prepare('SELECT id,username,email,role FROM users WHERE id=?')
    .get(info.lastInsertRowid);
  res.json({ token: sign(user), user });
});

router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ error: 'Missing fields' });

  const user = db.prepare(
    'SELECT * FROM users WHERE email=? OR username=?'
  ).get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const clean = { id: user.id, username: user.username, email: user.email, role: user.role };
  res.json({ token: sign(clean), user: clean });
});

router.get('/me', auth(), (req, res) => {
  const user = db.prepare('SELECT id,username,email,role FROM users WHERE id=?')
    .get(req.user.id);
  res.json(user);
});

module.exports = router;