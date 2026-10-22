require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use((req, _, next) => { req.io = io; next(); });

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/properties',    require('./routes/properties'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/cleaning',      require('./routes/cleaning'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

require('./sockets')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));