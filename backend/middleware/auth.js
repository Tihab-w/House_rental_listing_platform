const jwt = require('jsonwebtoken');

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      if (!required) return next();
      return res.status(401).json({ error: 'No token' });
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { id, role, username }
      next();
    } catch {
      if (!required) return next();
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role)
      return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { auth, requireRole };