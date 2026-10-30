require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');
require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use((req, _, next) => { req.io = io; next(); });

// ============================================================
// 1. FILE UPLOAD SETUP
// ============================================================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.array('images', 5), (req, res) => {
  const urls = req.files.map(file => `http://localhost:5000/uploads/${file.filename}`);
  res.json({ urls });
});

// ============================================================
// 2. API ROUTES
// ============================================================
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/properties',    require('./routes/properties'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/cleaning',      require('./routes/cleaning'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/admin',         require('./routes/admin'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ============================================================
// 3. SOCKET.IO
// ============================================================
require('./sockets')(io);

// ============================================================
// 4. START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));